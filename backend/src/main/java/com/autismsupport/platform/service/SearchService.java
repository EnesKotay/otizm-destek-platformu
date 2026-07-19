package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AiSearchResponseDto;
import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.dto.SearchResultDto;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final EntityManager em;
    private final KnowledgeArticleRepository knowledgeArticleRepository;
    private final KnowledgeArticleService knowledgeArticleService;
    private final GeminiService geminiService;

    // 'simple' lowercases without stemming — works for all languages.
    // Switch to 'turkish' if the PostgreSQL Turkish dictionary is confirmed available.
    private static final String LANG = "simple";
    private static final int LIMIT = 8;

    @Transactional(readOnly = true)
    public List<SearchResultDto> search(String rawQuery, String type, String dateFrom, String dateTo, String category, List<String> tags, String sort) {
        String q = rawQuery == null ? "" : rawQuery.trim();
        if (q.length() < 2) return List.of();

        List<SearchResultDto> results = new ArrayList<>();

        if (type == null || type.equalsIgnoreCase("POST"))    results.addAll(searchPosts(q, dateFrom, dateTo, category, tags));
        if (type == null || type.equalsIgnoreCase("ARTICLE")) results.addAll(searchArticles(q, dateFrom, dateTo, category, tags));
        if (type == null || type.equalsIgnoreCase("GROUP"))   results.addAll(searchGroups(q));
        if (type == null || type.equalsIgnoreCase("EXPERT"))  results.addAll(searchExperts(q));

        // Sort strategy
        if ("date".equalsIgnoreCase(sort)) {
            results.sort(
                Comparator.comparing(SearchResultDto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
            );
        } else { // relevance (rank desc) is default
            results.sort(
                Comparator.comparingDouble(SearchResultDto::getRank).reversed()
                    .thenComparing(r -> r.getCreatedAt() == null ? LocalDateTime.MIN : r.getCreatedAt(),
                                    Comparator.reverseOrder())
            );
        }

        return results;
    }

    @Transactional(readOnly = true)
    public AiSearchResponseDto searchAi(String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) {
            return AiSearchResponseDto.builder()
                    .answer("Lütfen daha uzun bir arama sorgusu girin.")
                    .references(List.of())
                    .build();
        }

        // Fetch top 3 knowledge articles
        List<SearchResultDto> articleResults = searchArticles(query, null, null, null, null);
        if (articleResults.isEmpty()) {
            return AiSearchResponseDto.builder()
                    .answer("Arama sorgunuzla eşleşen bilgi bankası makalesi bulunamadı. Bu nedenle yapay zekâ yanıtı üretilemedi.")
                    .references(List.of())
                    .build();
        }

        List<UUID> articleIds = articleResults.stream()
                .limit(3)
                .map(SearchResultDto::getId)
                .collect(Collectors.toList());

        List<KnowledgeArticle> articles = knowledgeArticleRepository.findAllById(articleIds);

        // Map them to DTOs
        List<KnowledgeArticleDto> referencedDtos = articles.stream()
                .map(knowledgeArticleService::toDto)
                .collect(Collectors.toList());

        // Construct RAG context
        StringBuilder context = new StringBuilder();
        context.append("Aşağıdaki bilgi bankası makalelerinden yararlanarak kullanıcının sorusuna Türkçe, detaylı ve açıklayıcı bir yanıt ver.\n");
        context.append("Sadece makalelerde verilen doğrulanmış bilgilere sadık kal. Makalelerde bulunmayan bilgileri ekleme.\n\n");
        for (int i = 0; i < articles.size(); i++) {
            KnowledgeArticle art = articles.get(i);
            context.append(String.format("Makale %d: %s\n", i + 1, art.getTitle()));
            context.append(String.format("İçerik: %s\n\n", art.getContent()));
        }

        // Call Gemini Service
        String answer = geminiService.sendMessage(query, null, context.toString());

        return AiSearchResponseDto.builder()
                .answer(answer)
                .references(referencedDtos)
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<SearchResultDto> searchPosts(String q, String dateFrom, String dateTo, String category, List<String> tags) {
        StringBuilder where = new StringBuilder(" WHERE (to_tsvector(CAST(:lang AS regconfig), coalesce(p.title,'') || ' ' || coalesce(p.content,'')) @@ plainto_tsquery(CAST(:lang AS regconfig), :q) OR p.title ILIKE '%' || :q || '%') ");
        if (dateFrom != null) where.append(" AND p.created_at >= :dateFrom::timestamp ");
        if (dateTo != null) where.append(" AND p.created_at <= :dateTo::timestamp ");
        if (category != null) where.append(" AND p.category = :category ");
        if (tags != null && !tags.isEmpty()) {
            where.append(" AND EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id = p.id AND t.name IN (:tags)) ");
        }
        
        String sql = "SELECT p.id::text, p.title, LEFT(p.content, 200) AS excerpt, p.created_at, " +
                     "ts_rank(to_tsvector(CAST(:lang AS regconfig), coalesce(p.title,'') || ' ' || coalesce(p.content,'')), plainto_tsquery(CAST(:lang AS regconfig), :q)) AS rank " +
                     "FROM forum_posts p " + where + " ORDER BY rank DESC, p.created_at DESC LIMIT " + LIMIT;

        var query = em.createNativeQuery(sql)
                .setParameter("lang", LANG)
                .setParameter("q", q);
        if (dateFrom != null) query.setParameter("dateFrom", dateFrom);
        if (dateTo != null) query.setParameter("dateTo", dateTo);
        if (category != null) query.setParameter("category", category);
        if (tags != null && !tags.isEmpty()) query.setParameter("tags", tags);

        return toResults(query.getResultList(), "POST");
    }

    @SuppressWarnings("unchecked")
    private List<SearchResultDto> searchArticles(String q, String dateFrom, String dateTo, String category, List<String> tags) {
        StringBuilder where = new StringBuilder(" WHERE a.is_published = true AND (to_tsvector(CAST(:lang AS regconfig), coalesce(a.title,'') || ' ' || coalesce(a.content,'')) @@ plainto_tsquery(CAST(:lang AS regconfig), :q) OR a.title ILIKE '%' || :q || '%') ");
        if (dateFrom != null) where.append(" AND a.created_at >= :dateFrom::timestamp ");
        if (dateTo != null) where.append(" AND a.created_at <= :dateTo::timestamp ");
        if (category != null) where.append(" AND a.category = :category ");
        if (tags != null && !tags.isEmpty()) {
            where.append(" AND EXISTS (SELECT 1 FROM article_tags at JOIN tags t ON at.tag_id = t.id WHERE at.article_id = a.id AND t.name IN (:tags)) ");
        }

        String sql = "SELECT a.id::text, a.title, LEFT(a.content, 200) AS excerpt, a.created_at, " +
                     "ts_rank(to_tsvector(CAST(:lang AS regconfig), coalesce(a.title,'') || ' ' || coalesce(a.content,'')), plainto_tsquery(CAST(:lang AS regconfig), :q)) AS rank " +
                     "FROM knowledge_articles a " + where + " ORDER BY rank DESC, a.created_at DESC LIMIT " + LIMIT;

        var query = em.createNativeQuery(sql)
                .setParameter("lang", LANG)
                .setParameter("q", q);
        if (dateFrom != null) query.setParameter("dateFrom", dateFrom);
        if (dateTo != null) query.setParameter("dateTo", dateTo);
        if (category != null) query.setParameter("category", category);
        if (tags != null && !tags.isEmpty()) query.setParameter("tags", tags);

        return toResults(query.getResultList(), "ARTICLE");
    }

    @SuppressWarnings("unchecked")
    private List<SearchResultDto> searchGroups(String q) {
        String sql = """
            SELECT
                g.id::text,
                g.name,
                LEFT(coalesce(g.description,''), 200) AS excerpt,
                g.created_at,
                ts_rank(
                    to_tsvector(CAST('%s' AS regconfig), coalesce(g.name,'') || ' ' || coalesce(g.description,'')),
                    plainto_tsquery('%s', :q)
                ) AS rank
            FROM groups g
            WHERE
                to_tsvector(CAST('%s' AS regconfig), coalesce(g.name,'') || ' ' || coalesce(g.description,''))
                    @@ plainto_tsquery('%s', :q)
                OR g.name ILIKE '%%' || :q || '%%'
            ORDER BY rank DESC, g.created_at DESC
            LIMIT %d
            """.formatted(LANG, LANG, LANG, LANG, LIMIT);

        return toResults(em.createNativeQuery(sql).setParameter("q", q).getResultList(), "GROUP");
    }

    @SuppressWarnings("unchecked")
    private List<SearchResultDto> searchExperts(String q) {
        String sql = """
            SELECT
                u.id::text,
                u.full_name,
                coalesce(u.expert_title,'') AS excerpt,
                u.created_at,
                ts_rank(
                    to_tsvector(CAST('%s' AS regconfig), coalesce(u.full_name,'') || ' ' || coalesce(u.expert_title,'')),
                    plainto_tsquery('%s', :q)
                ) AS rank
            FROM users u
            WHERE
                u.role = 'EXPERT'
                AND (
                    to_tsvector(CAST('%s' AS regconfig), coalesce(u.full_name,'') || ' ' || coalesce(u.expert_title,''))
                        @@ plainto_tsquery('%s', :q)
                    OR u.full_name ILIKE '%%' || :q || '%%'
                    OR u.expert_title ILIKE '%%' || :q || '%%'
                )
            ORDER BY rank DESC
            LIMIT %d
            """.formatted(LANG, LANG, LANG, LANG, LIMIT);

        return toResults(em.createNativeQuery(sql).setParameter("q", q).getResultList(), "EXPERT");
    }

    private List<SearchResultDto> toResults(List<?> rows, String type) {
        return rows.stream().map(raw -> {
            Object[] r = (Object[]) raw;
            return SearchResultDto.builder()
                    .id(UUID.fromString((String) r[0]))
                    .type(type)
                    .title((String) r[1])
                    .excerpt(r[2] != null ? (String) r[2] : "")
                    .createdAt(r[3] instanceof Timestamp ts ? ts.toLocalDateTime() : null)
                    .rank(r[4] instanceof Number n ? n.doubleValue() : 0.0)
                    .build();
        }).collect(Collectors.toList());
    }
}
