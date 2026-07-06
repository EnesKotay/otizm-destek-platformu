package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AiDraftResponse;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * PubMed E-utilities (eutils.ncbi.nlm.nih.gov) ve Europe PMC (ebi.ac.uk/europepmc) uzerinden
 * otizmle ilgili bilimsel ozetleri cekip GeminiService ile Turkce'ye ozetleterek "pendingReview"
 * taslagi olarak bilgi bankasina ekler.
 * Hicbir icerik burada dogrudan yayina alinmaz; admin onayi sarttir (KnowledgeArticleService).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalArticleImportService {

    private final KnowledgeArticleRepository articleRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Value("${external.import.keywords:autism spectrum disorder,ABA therapy,autism parent support}")
    private String keywordsRaw;

    private static final String ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
    private static final String EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
    private static final String EUROPEPMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
    private static final int RESULTS_PER_KEYWORD = 3;

    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .executor(Executors.newVirtualThreadPerTaskExecutor())
            .build();

    @Transactional
    public int importFromPubMed() {
        int imported = 0;
        for (String keyword : keywordsRaw.split(",")) {
            String kw = keyword.trim();
            if (kw.isEmpty()) continue;
            try {
                for (String pmid : searchPmids(kw, RESULTS_PER_KEYWORD)) {
                    String sourceUrl = "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/";
                    if (articleRepository.existsBySourceUrl(sourceUrl)) continue;
                    String[] titleAndAbstract = fetchAbstract(pmid);
                    if (importOne(titleAndAbstract[0], titleAndAbstract[1], sourceUrl, "PubMed")) imported++;
                }
            } catch (Exception e) {
                log.error("PubMed import failed for keyword '{}': {}", kw, e.getMessage());
            }
        }
        return imported;
    }

    /**
     * Europe PMC, PubMed'de indekslenmeyen on-baskilar (preprint) ve tam metinleri de kapsar;
     * bu yuzden PubMed'e ek, tamamlayici bir kaynak olarak kullanilir. Kaynak baglantisi olarak
     * once DOI (doi.org), yoksa PubMed PMID baglantisi kullanilir; ikisi de yoksa taslak atlanir.
     */
    @Transactional
    public int importFromEuropePmc() {
        int imported = 0;
        for (String keyword : keywordsRaw.split(",")) {
            String kw = keyword.trim();
            if (kw.isEmpty()) continue;
            try {
                for (JsonNode result : searchEuropePmc(kw, RESULTS_PER_KEYWORD)) {
                    String doi = textOrNull(result, "doi");
                    String pmid = textOrNull(result, "pmid");
                    String sourceUrl = doi != null ? "https://doi.org/" + doi
                            : pmid != null ? "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/" : null;
                    if (sourceUrl == null || articleRepository.existsBySourceUrl(sourceUrl)) continue;

                    String title = textOrNull(result, "title");
                    String abstractText = textOrNull(result, "abstractText");
                    if (importOne(title, abstractText, sourceUrl, "Europe PMC")) imported++;
                }
            } catch (Exception e) {
                log.error("Europe PMC import failed for keyword '{}': {}", kw, e.getMessage());
            }
        }
        return imported;
    }

    private boolean importOne(String title, String abstractText, String sourceUrl, String sourceName) {
        if (abstractText == null || abstractText.isBlank()) return false;
        try {
            AiDraftResponse draft = geminiService.summarizeExternalAbstract(title, abstractText);
            if (draft == null || draft.getTitle() == null || draft.getContent() == null) return false;

            KnowledgeArticle article = KnowledgeArticle.builder()
                    .title(draft.getTitle())
                    .content(draft.getContent())
                    .category(draft.getCategory() != null ? draft.getCategory() : "Genel")
                    .format("TEXT")
                    .sourceName(sourceName)
                    .sourceUrl(sourceUrl)
                    .pendingReview(true)
                    .published(false)
                    .build();
            articleRepository.save(article);
            return true;
        } catch (Exception e) {
            log.error("Failed to import external article {}: {}", sourceUrl, e.getMessage());
            return false;
        }
    }

    private List<JsonNode> searchEuropePmc(String keyword, int max) throws Exception {
        String url = EUROPEPMC_SEARCH_URL + "?format=json&resultType=core&pageSize=" + max
                + "&query=" + URLEncoder.encode(keyword, StandardCharsets.UTF_8);
        JsonNode root = objectMapper.readTree(get(url));
        JsonNode results = root.path("resultList").path("result");
        List<JsonNode> list = new ArrayList<>();
        if (results.isArray()) results.forEach(list::add);
        return list;
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText(null);
    }

    private List<String> searchPmids(String keyword, int max) throws Exception {
        String url = ESEARCH_URL + "?db=pubmed&retmode=json&sort=relevance&retmax=" + max
                + "&term=" + URLEncoder.encode(keyword, StandardCharsets.UTF_8);
        JsonNode root = objectMapper.readTree(get(url));
        JsonNode idList = root.path("esearchresult").path("idlist");
        List<String> ids = new ArrayList<>();
        if (idList.isArray()) {
            idList.forEach(n -> ids.add(n.asText()));
        }
        return ids;
    }

    private String[] fetchAbstract(String pmid) throws Exception {
        String url = EFETCH_URL + "?db=pubmed&id=" + pmid + "&rettype=abstract&retmode=xml";
        String body = get(url);

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));

        String title = textOf(doc, "ArticleTitle");
        NodeList abstractTexts = doc.getElementsByTagName("AbstractText");
        StringBuilder abstractBuilder = new StringBuilder();
        for (int i = 0; i < abstractTexts.getLength(); i++) {
            if (abstractBuilder.length() > 0) abstractBuilder.append("\n");
            abstractBuilder.append(abstractTexts.item(i).getTextContent());
        }
        return new String[]{title, abstractBuilder.toString()};
    }

    private String textOf(Document doc, String tag) {
        NodeList nodes = doc.getElementsByTagName(tag);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent() : "";
    }

    private String get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .header("User-Agent", "OtizmPlatformu/1.0")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }
}
