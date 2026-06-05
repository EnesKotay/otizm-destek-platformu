package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ChatbotRequest;
import com.autismsupport.platform.dto.ChatbotResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ChatbotService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiUrl;

    private final RestClient restClient = RestClient.create();

    // Sinirli thread havuzu — sinirsiz CachedThreadPool bellek sizintisi yaratir
    private final ExecutorService executor = new ThreadPoolExecutor(
            2, 10, 60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(50),
            new ThreadPoolExecutor.CallerRunsPolicy()
    );

    private boolean isApiKeyConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /* ─── Rate Limit ───────────────────────────────────────── */
    private static final int  RATE_LIMIT_MAX       = 20;
    private static final long RATE_LIMIT_WINDOW_MS = 60_000L;
    private final Map<String, List<Instant>> rateLimitMap = new ConcurrentHashMap<>();

    private boolean isRateLimited(String userId) {
        Instant now    = Instant.now();
        long    cutoff = now.toEpochMilli() - RATE_LIMIT_WINDOW_MS;
        boolean[] limited = {false};
        rateLimitMap.compute(userId, (k, ts) -> {
            if (ts == null) ts = new ArrayList<>();
            ts.removeIf(t -> t.toEpochMilli() < cutoff);
            if (ts.size() >= RATE_LIMIT_MAX) { limited[0] = true; }
            else ts.add(now);
            return ts.isEmpty() ? null : ts; // remove empty lists to prevent memory leak
        });
        return limited[0];
    }

    /** Periyodik olarak bos/eski rate limit kayitlarini temizle. */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 300_000) // her 5 dakikada
    public void cleanRateLimitMap() {
        long cutoff = Instant.now().toEpochMilli() - RATE_LIMIT_WINDOW_MS;
        rateLimitMap.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(t -> t.toEpochMilli() < cutoff);
            return entry.getValue().isEmpty();
        });
    }

    /* ─── System Prompt ─────────────────────────────────────── */
    private static final String BASE_SYSTEM_PROMPT = """
            Sen **AutiBot** adinda, Turkiye'deki otizm spektrum bozuklugu (OSB) olan cocuklarin \
            aileleri ve uzmanlari icin tasarlanmis, uzman duzeyinde bilgiye sahip empatik bir yapay zeka asistanisin. \
            "Otizm Destek Platformu" uzerinde calisiyorsun.

            ## KIMLIGIN VE GOREV KAPSAMIN

            Yalnizca su konularda yardim edersin:
            - Otizm spektrum bozuklugu (OSB/ASD) hakkinda kanita dayali bilgi
            - Terapi ve mudahale yontemleri (ABA, PECS, TEACCH, Duyusal Entegrasyon, DIR/Floortime, Sosyal Oykuler, AAC)
            - Turkiye'ye ozgu kurumlar, haklar ve burokratik surecler
            - Gunluk yasam, rutin yonetimi, duyusal duzenleme stratejileri
            - Ebeveyn tukenmisligi ve stres yonetimi
            - Platform ozelliklerini aciklama ve ilgili sayfalara yonlendirme

            Kapsam disi konulari (siyaset, genel haberler, spor vb.) kibarca reddeder, \
            otizm ve platforma odaklanirsin.

            ## YANIT KURALLARI

            **Dil:** Her zaman Turkce yaz. Teknik terimleri ilk kullanimda parantez icinde acikla.

            **Format:** Markdown kullan:
            - **Basliklar** icin `**Baslik**`, alt basliklar icin `## Baslik`
            - Listeler icin `- ` veya `1.`
            - Onemli vurgu icin `**kalin**`
            - Platform linklerini `[Sayfa Adi](/yol)` formatinda ver
            - Uzun yanitlardan kacin — ozlu ve odakli ol (genelde 150-300 kelime)

            **Empati:** Ebeveyn sorularinin arkasinda cogunlukla derin bir duygusal yuk vardir.
            Once duyguyu kisaca kabul et ("Bu gercekten zor bir surec olabilir."), sonra bilgi ver.
            Yapay veya abartili olmaktan kacin.

            **Tibbi sinir:** Tani koymaz, ilac adi onermez. Tibbi sorularda her zaman
            "bir cocuk psikiyatristi veya noroloji uzmaniyla gorusun" ekle.

            **Platform yonlendirme:** Kullanici bir ozellik hakkinda soru sorarsa dogru sayfaya yonlendir.
            Ornek: "Randevu almak icin [Randevular](/randevular) sayfasini kullanabilirsiniz."

            **Kriz:** Kullanici intihar, kendine zarar verme, cocuga zarar verme veya acil tehlike ifade ederse:
            1. Hemen "**ALO 182 Sosyal Destek Hatti'ni** arayin" de (7/24 ucretsiz)
            2. [Kriz Rehberi](/kriz-rehberi) sayfasina yonlendir
            3. Yargilamadan, sakin ve destekleyici ol

            **Cocuk baglamini kullan:** Sana kullanicinin cocuklari hakkinda bilgi saglanacak.
            Bu bilgileri yanitlarini kisisellestirmek icin kullan ama kullaniciya "Profilinizde gordum ki…" \
            diye mecazi bir dille yansit; teknik bilgi sizdirma.

            ## PLATFORM SAYFALARI

            - [Ana Sayfa](/) — gunluk ozet ve hizli erisim
            - [Cocuklarim](/cocuklarim) — profil, tani, fotograf
            - [Tedavi & Gelisim](/tedavi) — hedefler ve kayitlar
            - [Takvim](/takvim) — seans ve etkinlikler
            - [Randevular](/randevular) — uzman randevulari
            - [Mesajlar](/mesajlar) — uzman yazismalari
            - [Gelisim Paneli](/gelisim-paneli) — ilerleme grafikleri
            - [Gunluk Takip](/gunluk-takip) — ilac, uyku, rutin
            - [ABC Davranis Gunlugu](/davranis-gunlugu) — davranis kayitlari
            - [Duyusal Profil](/duyusal-profil) — hassasiyet haritasi
            - [Sosyal Hikayeler](/sosyal-hikayeler) — gorsel oyku kartlari
            - [Kriz Rehberi](/kriz-rehberi) — acil durum adimlari
            - [Rutin Yonetimi](/rutinler) — gorsel program
            - [Beslenme Takibi](/beslenme) — ogun ve tercihler
            - [Hedef & Token](/hedef-token) — odul sistemi
            - [Acil Durum Karti](/acil-kart) — paylasilabilir bilgi karti
            - [BEP Raporu](/bep-raporu) — BEP hazirlama araci
            - [Tarama & Aktiviteler](/tarama) — degerlendirme araclari
            - [Haklar Rehberi](/haklar-rehberi) — yasal haklar
            - [Uzmanlar](/uzmanlar) — uzman arama
            - [Uzman Harita](/uzman-harita) — yakindaki kurumlar
            - [Forum](/forum) — topluluk tartismalari
            - [Gruplar](/gruplar) — aile topluluklari
            - [Bilgi Bankasi](/bilgi-bankasi) — rehber makaleler
            - [Ebeveyn Refahi](/ebeveyn-refahi) — tukenmislik takibi
            - [Benzer Aileler](/benzer-aileler) — benzer durumda aileler

            ## TURKIYE'DE KURUMLAR VE HAKLAR

            - **RAM** (Rehberlik ve Arastirma Merkezi): Tani sonrasi basvurulacak ilk MEB kurumu. BEP ve okul yerlestirmesi yapar. Ucretsiz.
            - **MEB Ozel Egitim**: Kaynastirma, OSB sinifi, ozel egitim okulu secenekleri. "Ozel Egitim Hizmetleri Yonetmeligi" temel mevzuat.
            - **SGK Rehabilitasyon Destegi**: RAM yonlendirmesiyle anlasmali ozel egitim ve rehabilitasyon merkezleri icin yillik seanslar SGK tarafindan karsilanir.
            - **Engelli Kimlik Karti**: Devlet hastanesindeki Engelli Saglik Kurulu raporuyla alinir. Ucretsiz toplu tasima, telefon ve elektrik indirimleri saglar.
            - **Bakim Ucreti**: Aile Bakanligi uzerinden basvurulur. Agir engelli cocuklarin bakimini ustlenen ailelere odenir.
            - **BEP Hakki**: 573 sayili KHK ile her ozel egitim ogrencisi icin yasal zorunluluktur.
            - **ALO 182**: 7/24 Sosyal Destek Hatti (Aile Bakanligi)
            - **ALO 147**: MEB Iletisim Hatti (egitim haklari sikayetleri)

            ## TERAPI HAKKINDA TEMEL BILGI

            - **ABA (Uygulamali Davranis Analizi)**: En guclu kanit tabani. Hedef davranislari kucuk adimlara boler, olumlu pekistirme kullanir.
            - **Erken Yogun Davranissal Mudahale (EIBI)**: 2-5 yas arasinda haftada 25-40 saat yogun ABA. Erken baslama kritik.
            - **PECS**: Iletisim baslatmak icin gorsel simge sistemi. Konusma oncesi donemde etkili.
            - **AAC**: Alternatif/artirici iletisim araclari (tablet uygulamalari, iletisim cihazlari).
            - **Duyusal Entegrasyon Terapisi (OT)**: Duyusal isleme guclukleri icin ergoterapist tarafindan uygulanir.
            - **Konusma ve Dil Terapisi (KDT/ST)**: Iletisim ve dil gelisimi icin.
            - **DIR/Floortime**: Duygusal ve sosyal gelisimi destekler, cocuk onculugunde.
            - **TEACCH**: Yapilandirilmis ogretim, gorsel destekler ve bagimsiz calisma becerileri.

            Yanitlarinda her zaman guncel, kanita dayali ve Turkiye kosullarina uygun bilgi ver. \
            Ebeveyn ve uzman bakis acilarini dengele.
            """;

    /* ─── Normal (non-streaming) chat ──────────────────────── */
    public ChatbotResponse chat(String userMessage,
                                 List<ChatbotRequest.ConversationTurn> history,
                                 String userId, String childContext) {
        if (!isApiKeyConfigured()) {
            log.warn("Gemini API anahtari yapilandirilmamis — GEMINI_API_KEY ortam degiskeni eksik.");
            return ChatbotResponse.error("AI servisi su anda yapilandirilmamis. Lutfen sistem yoneticisiyle iletisime gecin.");
        }
        if (isRateLimited(userId)) {
            return ChatbotResponse.error("Dakika basina en fazla 20 mesaj gonderebilirsiniz. Lutfen biraz bekleyin.");
        }
        try {
            String url = apiUrl + "?key=" + apiKey;
            Map<String, Object> body = buildRequestBody(userMessage, history, childContext);

            @SuppressWarnings("unchecked")
            Map<?, ?> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            return ChatbotResponse.success(extractReply(response));
        } catch (Exception e) {
            log.error("Chatbot API hatasi: {}", e.getMessage(), e);
            return ChatbotResponse.error("Uzgunum, su anda yanit veremiyorum. Lutfen daha sonra tekrar deneyin.");
        }
    }

    /* ─── Streaming chat (SSE) ──────────────────────────────── */
    public SseEmitter streamChat(String userMessage,
                                  List<ChatbotRequest.ConversationTurn> history,
                                  String userId, String childContext) {
        SseEmitter emitter = new SseEmitter(60_000L); // 60 sn timeout

        if (!isApiKeyConfigured()) {
            log.warn("Gemini API anahtari yapilandirilmamis — GEMINI_API_KEY ortam degiskeni eksik.");
            try {
                emitter.send(SseEmitter.event().name("error").data("AI servisi yapilandirilmamis."));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        if (isRateLimited(userId)) {
            try {
                emitter.send(SseEmitter.event().name("error").data("Rate limit asildi."));
                emitter.complete();
            } catch (Exception e) { emitter.completeWithError(e); }
            return emitter;
        }

        // Streaming URL: streamGenerateContent
        String streamUrl = apiUrl.replace(":generateContent", ":streamGenerateContent") + "?key=" + apiKey + "&alt=sse";
        Map<String, Object> body = buildRequestBody(userMessage, history, childContext);

        executor.submit(() -> {
            try {
                restClient.post()
                        .uri(streamUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .exchange((req, resp) -> {
                            if (!resp.getStatusCode().is2xxSuccessful()) {
                                try (InputStream is = resp.getBody();
                                     BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                                    StringBuilder errorBody = new StringBuilder();
                                    String line;
                                    while ((line = reader.readLine()) != null) {
                                        errorBody.append(line).append("\n");
                                    }
                                    log.error("Gemini API Hatasi (HTTP {}): {}", resp.getStatusCode(), errorBody);
                                    emitter.send(SseEmitter.event().name("error").data("Gemini API hatasi: " + resp.getStatusCode() + " - " + resp.getStatusText()));
                                } catch (Exception ignored) {}
                                emitter.complete();
                                return null;
                            }

                            try (InputStream is = resp.getBody();
                                 BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {

                                Pattern textPattern = Pattern.compile("\"text\":\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
                                String line;
                                while ((line = reader.readLine()) != null) {
                                    if (line.startsWith("data: ")) {
                                        String json = line.substring(6).trim();
                                        if ("[DONE]".equals(json)) break;
                                        Matcher m = textPattern.matcher(json);
                                        if (m.find()) {
                                            String chunk = m.group(1)
                                                    .replace("\\n", "\n")
                                                    .replace("\\\"", "\"")
                                                    .replace("\\\\", "\\");
                                            emitter.send(SseEmitter.event().name("chunk").data(chunk));
                                        }
                                    }
                                }
                                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                                emitter.complete();
                            } catch (Exception e) {
                                log.error("Stream okuma hatasi: {}", e.getMessage());
                                try { emitter.send(SseEmitter.event().name("error").data("Stream hatasi.")); } catch (Exception ignored) {}
                                emitter.completeWithError(e);
                            }
                            return null;
                        });
            } catch (Exception e) {
                log.error("Stream istegi hatasi: {}", e.getMessage(), e);
                try {
                    emitter.send(SseEmitter.event().name("error").data("Baglanti hatasi."));
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    /* ─── Request body builder ──────────────────────────────── */
    private Map<String, Object> buildRequestBody(String userMessage,
                                                  List<ChatbotRequest.ConversationTurn> history,
                                                  String childContext) {
        String systemPrompt = BASE_SYSTEM_PROMPT;
        if (childContext != null && !childContext.isBlank()) {
            systemPrompt += "\n\nKULLANICININ COCUKLARI (bu bilgileri yanitlarinda kullanabilirsin):\n" + childContext;
        }

        Map<String, Object> systemInstruction = new LinkedHashMap<>();
        systemInstruction.put("parts", List.of(Map.of("text", systemPrompt)));

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (ChatbotRequest.ConversationTurn turn : history) {
                Map<String, Object> content = new LinkedHashMap<>();
                content.put("role",  turn.getRole());
                content.put("parts", List.of(Map.of("text", turn.getText())));
                contents.add(content);
            }
        }
        Map<String, Object> userContent = new LinkedHashMap<>();
        userContent.put("role",  "user");
        userContent.put("parts", List.of(Map.of("text", userMessage)));
        contents.add(userContent);

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature",     0.75);
        generationConfig.put("maxOutputTokens", 800);
        generationConfig.put("topP",            0.9);

        List<Map<String, Object>> safetySettings = List.of(
            Map.of("category", "HARM_CATEGORY_HARASSMENT",        "threshold", "BLOCK_ONLY_HIGH"),
            Map.of("category", "HARM_CATEGORY_HATE_SPEECH",       "threshold", "BLOCK_ONLY_HIGH"),
            Map.of("category", "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold", "BLOCK_ONLY_HIGH")
        );

        Map<String, Object> reqBody = new LinkedHashMap<>();
        reqBody.put("systemInstruction", systemInstruction);
        reqBody.put("contents",          contents);
        reqBody.put("generationConfig",  generationConfig);
        reqBody.put("safetySettings",    safetySettings);
        return reqBody;
    }

    /* ─── Reply extractor ───────────────────────────────────── */
    @SuppressWarnings("unchecked")
    private String extractReply(Map<?, ?> responseBody) {
        try {
            List<?>    candidates     = (List<?>)    responseBody.get("candidates");
            Map<?, ?>  firstCandidate = (Map<?, ?>)  candidates.get(0);
            Map<?, ?>  content        = (Map<?, ?>)  firstCandidate.get("content");
            List<?>    parts          = (List<?>)    content.get("parts");
            Map<?, ?>  firstPart      = (Map<?, ?>)  parts.get(0);
            return (String) firstPart.get("text");
        } catch (Exception e) {
            log.error("Yanit parse hatasi: {}", e.getMessage());
            return "Yanit islenemedi. Lutfen tekrar deneyin.";
        }
    }
}
