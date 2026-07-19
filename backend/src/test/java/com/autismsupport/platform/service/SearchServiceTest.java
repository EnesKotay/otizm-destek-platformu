package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AiSearchResponseDto;
import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.dto.SearchResultDto;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SearchService unit testleri")
class SearchServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private KnowledgeArticleRepository knowledgeArticleRepository;

    @Mock
    private KnowledgeArticleService knowledgeArticleService;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private SearchService searchService;

    private UUID articleId;
    private KnowledgeArticle article;
    private KnowledgeArticleDto articleDto;

    @BeforeEach
    void setUp() {
        articleId = UUID.randomUUID();
        article = KnowledgeArticle.builder()
                .id(articleId)
                .title("Duyusal Hassasiyetler")
                .content("Duyusal hassasiyetler otizm spektrumunda sıklıkla görülür.")
                .published(true)
                .build();

        articleDto = KnowledgeArticleDto.builder()
                .id(articleId)
                .title("Duyusal Hassasiyetler")
                .content("Duyusal hassasiyetler otizm spektrumunda sıklıkla görülür.")
                .published(true)
                .build();
    }

    @Test
    @DisplayName("search: sorgu kelimesi çok kısaysa boş liste döner")
    void search_withShortQuery_returnsEmptyList() {
        List<SearchResultDto> results = searchService.search("a", null, null, null, null, null, null);
        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("searchAi: sorgu kelimesi çok kısaysa açıklayıcı mesaj döner")
    void searchAi_withShortQuery_returnsMessage() {
        AiSearchResponseDto response = searchService.searchAi("a");
        assertThat(response.getAnswer()).contains("daha uzun");
        assertThat(response.getReferences()).isEmpty();
    }

    @Test
    @DisplayName("searchAi: makale bulunamazsa yapay zeka cevabı üretilemediğini bildiren mesaj döner")
    void searchAi_noArticlesFound_returnsNoAnswerMessage() {
        Query mockQuery = mock(Query.class);
        when(em.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(Collections.emptyList());

        AiSearchResponseDto response = searchService.searchAi("Otizm nedir?");
        assertThat(response.getAnswer()).contains("makalesi bulunamadı");
        assertThat(response.getReferences()).isEmpty();
    }

    @Test
    @DisplayName("searchAi: makaleler bulunduğunda RAG akışını doğru tamamlar")
    void searchAi_articlesFound_returnsRagAnswer() {
        Query mockQuery = mock(Query.class);
        when(em.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        
        Object[] row = new Object[]{articleId.toString(), "Duyusal Hassasiyetler", "Excerpt", Timestamp.valueOf(LocalDateTime.now()), 0.9};
        when(mockQuery.getResultList()).thenReturn(List.of((Object) row));

        when(knowledgeArticleRepository.findAllById(any())).thenReturn(List.of(article));
        when(knowledgeArticleService.toDto(any())).thenReturn(articleDto);
        when(geminiService.sendMessage(anyString(), any(), anyString())).thenReturn("Duyusal hassasiyetlerle ilgili yapay zekâ yanıtı.");

        AiSearchResponseDto response = searchService.searchAi("Duyusal hassasiyet");
        assertThat(response.getAnswer()).isEqualTo("Duyusal hassasiyetlerle ilgili yapay zekâ yanıtı.");
        assertThat(response.getReferences()).hasSize(1);
        assertThat(response.getReferences().get(0).getTitle()).isEqualTo("Duyusal Hassasiyetler");

        verify(geminiService).sendMessage(eq("Duyusal hassasiyet"), isNull(), contains("Duyusal Hassasiyetler"));
    }
}
