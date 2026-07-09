package com.autismsupport.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiUrl;

    private final ObjectMapper objectMapper;

    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .executor(Executors.newVirtualThreadPerTaskExecutor())
            .build();

    /* ── Sistem Prompt'u ─────────────────────────────────────────────────────── */

    public static final String SYSTEM_PROMPT = """
    Sen AutiBot'sun — Turkiye'deki otizm spektrum bozuklugu (OSB) olan cocuklarin aileleri \
    ve uzmanlari icin tasarlanmis, Turkce konusan bir yapay zeka asistanisin. \
    "Otizm Destek Platformu" uzerinde calisiyorsun.

    ## KIMLIGIN VE GOREV KAPSAMIN

    Sen yalnizca su konularda yardim edersin:
    - Otizm spektrum bozuklugu hakkinda bilgi (belirtiler, alt tipler, tani sureci)
    - Terapi ve mudahale yontemleri (ABA, PECS, Erken Yogun Davranissal Mudahale, OT, ST)
    - Turkiye'ye ozgu kurumlar ve haklar (RAM, MEB Ozel Egitim, SGK, BEP sureci, 573 sayili KHK)
    - Gunluk yasam becerileri, rutin yonetimi, duyusal duzenleme
    - Ebeveyn stresi ve tukenmislik yonetimi
    - Platform ozelliklerini ve nasil kullanilacagini aciklama

    Kapsam disi konulari (spor, politika, genel haberler vb.) kibarca reddeder, \
    odagi yeniden otizme ve platforma cekersin.

    ## YANIT KURALLARI

    1. **Dil**: Her zaman Turkce yaz. Teknik terimleri parantez icinde acikla \
       (Orn: "ABA (Uygulamali Davranis Analizi)").

    2. **Format**: Yanitlari okunabilir tut:
       - Listeler icin "- " veya "1." kullan
       - Onemli basliklar icin "**Baslik**" formatini kullan
       - Cok uzun yanitlardan kacin — ozlu ve odakli ol

    3. **Empati**: Ebeveyn sorulari genellikle duygusal baglam icerir. \
       Once duyguyu kabul et, sonra bilgi ver. "Anliyorum", "Bu gercekten zor olabilir" \
       gibi ifadeler kullan ama asiri yapay olmaktan kacin.

    4. **Tibbi sinir**: Tani koymaz, ilac onerisi yapmaz. \
       Tibbi sorularda her zaman "bir cocuk psikiyatristi veya norolog ile gorusun" de.

    5. **Platform yonlendirme**: Kullanici bir ozellik hakkinda yardim isterse \
       ilgili sayfaya yonlendir. Ornek: "Randevu almak icin /randevular sayfasini ziyaret edebilirsiniz."

    6. **Kriz durumu**: Eger kullanici intihar, kendine zarar verme, siddet gibi \
       acil durum belirtileri gosterirse:
       - Hemen ve dogrudan "ALO 182 Sosyal Destek Hatti'ni arayin" de
       - /kriz-rehberi sayfasina yonlendir
       - Yargilamadan destekleyici ol

    ## PLATFORM BILGISI

    Platform su sayfalari icerir. Kullanici sorarsa dogru sayfaya yonlendir:
    - `/cocuklarim` — Cocuk profilleri, tani bilgisi, fotograf
    - `/tedavi` — Tedavi hedefleri, gelisim kayitlari
    - `/takvim` — Seans ve etkinlik takvimi
    - `/randevular` — Uzman randevulari, musaitlik saatleri
    - `/mesajlar` — Uzman ve ailelerle yazisma
    - `/gelisim-paneli` — Ilerleme grafikleri, istatistikler
    - `/gunluk-takip` — Ilac, uyku, gunluk rutin takibi
    - `/davranis-gunlugu` — ABC (Antecedent-Behavior-Consequence) kayitlari
    - `/duyusal-profil` — Duyusal hassasiyet haritasi
    - `/sosyal-hikayeler` — Gorsel sosyal oyku kartlari
    - `/kriz-rehberi` — Meltdown ve kriz ani rehberi
    - `/rutinler` — Gorsel rutin programi
    - `/beslenme` — Beslenme tercihleri ve ogun takibi
    - `/hedef-token` — Hedef belirleme ve token ekonomisi
    - `/acil-kart` — Acil durumda paylasilacak cocuk bilgi karti
    - `/forum` — Aile ve uzman tartismalari
    - `/gruplar` — Benzer ailelerle topluluklar
    - `/bilgi-bankasi` — Uzman yazilari ve rehber makaleler
    - `/uzmanlar` — Uzman arama ve profil inceleme
    - `/uzman-harita` — Yakindaki kurumlar
    - `/bep-raporu` — BEP raporu yazma araci
    - `/haklar-rehberi` — Yasal haklar ve kurumlar
    - `/ebeveyn-refahi` — Ebeveyn iyi olus takibi
    - `/ayarlar` — Bildirim ve erisilebilirlik ayarlari

    ## TURK KURUMLAR BILGISI

    - **RAM** (Rehberlik ve Arastirma Merkezi): Tani sonrasi basvurulacak ilk MEB kurumu. BEP ve okul yerlestirmesi yapar.
    - **MEB Ozel Egitim**: Kaynastirma, ozel egitim sinifi, OSB sinifi secenekleri
    - **SGK**: Rehabilitasyon merkezi giderlerini RAM yonlendirmesiyle karsilar
    - **ALO 182**: Aile ve Sosyal Politikalar Bakanligi sosyal destek hatti
    - **ALO 183**: Aile, Calisma ve Sosyal Hizmetler Bakanligi
    - **E-devlet**: Engelli kimlik karti ve bakim ucreti basvurulari icin

    Sohbete baslarken kullaniciyi sicak karsila. Her zaman yardimci, saygili ve bilgili ol.
    """;

    /* ── Non-streaming mesaj gonder ──────────────────────────────────────────── */

    public String sendMessage(String userMessage, List<Map<String, String>> history, String contextNote) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallbackResponse(userMessage);
        }
        try {
            String body = buildRequestBody(userMessage, history, contextNote, false);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return parseGeminiResponse(response.body());
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
            return "Uzgunum, su anda yanit alinamiyor. Lutfen biraz sonra tekrar deneyin.";
        }
    }

    /* ── SSE Streaming ───────────────────────────────────────────────────────── */

    public void streamMessage(String userMessage, List<Map<String, String>> history,
                              String contextNote, SseEmitter emitter) {
        if (apiKey == null || apiKey.isBlank()) {
            sendFallbackStream(userMessage, emitter);
            return;
        }

        String streamUrl = apiUrl.replace(":generateContent", ":streamGenerateContent") + "?key=" + apiKey + "&alt=sse";

        CompletableFuture.runAsync(() -> {
            try {
                String body = buildRequestBody(userMessage, history, contextNote, true);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(streamUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .timeout(Duration.ofSeconds(60))
                        .build();

                httpClient.send(request, HttpResponse.BodyHandlers.ofLines()).body().forEach(line -> {
                    if (line.startsWith("data: ")) {
                        String json = line.substring(6).trim();
                        if (json.equals("[DONE]")) return;
                        try {
                            String chunk = extractChunkText(json);
                            if (chunk != null && !chunk.isEmpty()) {
                                emitter.send(SseEmitter.event().name("chunk").data(chunk));
                            }
                        } catch (Exception ignored) {}
                    }
                });

                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();
            } catch (Exception e) {
                log.error("Gemini stream error: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data("Yanit alinamadi, lutfen tekrar deneyin."));
                    emitter.complete();
                } catch (IOException ignored) {}
            }
        });
    }

    /* ── Request Body Builder ────────────────────────────────────────────────── */

    private String buildRequestBody(String userMessage, List<Map<String, String>> history,
                                    String contextNote, boolean streaming) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"system_instruction\":{\"parts\":[{\"text\":");
        sb.append(jsonString(SYSTEM_PROMPT));
        sb.append("}]},");
        sb.append("\"contents\":[");

        // Konusma gecmisi
        if (history != null) {
            for (Map<String, String> turn : history) {
                String role = "user".equals(turn.get("role")) ? "user" : "model";
                sb.append("{\"role\":\"").append(role).append("\",");
                sb.append("\"parts\":[{\"text\":").append(jsonString(turn.get("text"))).append("}]},");
            }
        }

        // Simdiki mesaj — context notu basa eklenir
        String fullMessage = (contextNote != null && !contextNote.isBlank())
                ? contextNote + "\n\n" + userMessage
                : userMessage;

        sb.append("{\"role\":\"user\",\"parts\":[{\"text\":").append(jsonString(fullMessage)).append("}]}");
        sb.append("],");

        // Guvenlik ayarlari — asiri kisitlamalari kaldir (saglik konulari engellenir)
        sb.append("\"safetySettings\":[");
        sb.append("{\"category\":\"HARM_CATEGORY_HARASSMENT\",\"threshold\":\"BLOCK_ONLY_HIGH\"},");
        sb.append("{\"category\":\"HARM_CATEGORY_HATE_SPEECH\",\"threshold\":\"BLOCK_ONLY_HIGH\"},");
        sb.append("{\"category\":\"HARM_CATEGORY_DANGEROUS_CONTENT\",\"threshold\":\"BLOCK_MEDIUM_AND_ABOVE\"},");
        sb.append("{\"category\":\"HARM_CATEGORY_SEXUALLY_EXPLICIT\",\"threshold\":\"BLOCK_MEDIUM_AND_ABOVE\"}");
        sb.append("],");

        // Generation config
        sb.append("\"generationConfig\":{");
        sb.append("\"temperature\":0.7,");
        sb.append("\"topK\":40,");
        sb.append("\"topP\":0.95,");
        sb.append("\"maxOutputTokens\":1024,");
        sb.append("\"candidateCount\":1");
        sb.append("}}");

        return sb.toString();
    }

    /* ── Response Parser ─────────────────────────────────────────────────────── */

    @SuppressWarnings("unchecked")
    private String parseGeminiResponse(String body) {
        try {
            Map<String, Object> root = objectMapper.readValue(body, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            if (candidates == null || candidates.isEmpty()) return fallbackMsg();
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null) return fallbackMsg();
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return fallbackMsg();
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.warn("Gemini response parse error: {}", e.getMessage());
            return fallbackMsg();
        }
    }

    @SuppressWarnings("unchecked")
    private String extractChunkText(String json) {
        try {
            Map<String, Object> root = objectMapper.readValue(json, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null) return null;
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return null;
        }
    }

    /* ── Fallback (API key yoksa basit kural tabanli yanit) ──────────────────── */

    private String buildFallbackResponse(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("aba")) return "**ABA (Uygulamali Davranis Analizi)**, otizmde en guclu kanit tabanina sahip terapi yontemidir. Hedef davranislari kucuk adimlara boler, olumlu pekistirme kullanir. Turkiye'de bircok ozel rehabilitasyon merkezinde uygulanmaktadir.";
        if (lower.contains("bep")) return "**BEP (Bireysellestirilmis Egitim Programi)**, otizm tanili her cocuk icin yasal olarak hazirlanmasi gereken bireysel egitim belgesidir. RAM uzerinden basvuru yapilir. /bep-raporu sayfamizda BEP hazirlamaniza yardimci olan araclar bulabilirsiniz.";
        if (lower.contains("ram")) return "**RAM (Rehberlik ve Arastirma Merkezi)**, otizm tanisi sonrasi basvurulacak ilk devlet kurumudur. Egitsel degerlendirme ve okul yerlestirmesi yapar. Tani belgenizle bolgenizdeki RAM'a basvurabilirsiniz.";
        if (lower.contains("kriz") || lower.contains("meltdown")) return "Kriz aninda sakin kalmak onemlidir. /kriz-rehberi sayfamizda adim adim rehber bulabilirsiniz. Acil destek icin **ALO 182**'yi arayabilirsiniz.";
        if (lower.contains("platform") || lower.contains("nasil kullan")) return "Platform ana ozelliklerine sol menuden ulasabilirsiniz. Cocuk profili icin /cocuklarim, randevu icin /randevular, gelisim takibi icin /gelisim-paneli sayfalarini ziyaret edin. Sorulariniz icin buradayim!";
        return "Merhaba! Ben AutiBot, otizm destek platformunuzun AI asistaniyim. Otizm, terapi yontemleri, platform kullanimi veya Turkiye'deki haklar hakkinda sorularinizi yanitlayabilirim. Nasil yardimci olabilirim?";
    }

    private void sendFallbackStream(String message, SseEmitter emitter) {
        String response = buildFallbackResponse(message);
        try {
            for (String word : response.split("(?<=\\s)")) {
                emitter.send(SseEmitter.event().name("chunk").data(word));
                Thread.sleep(30);
            }
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            try { emitter.completeWithError(e); } catch (Exception ignored) {}
        }
    }

    private String fallbackMsg() { return "Uzgunum, su an yanit uretemiyorum. Lutfen tekrar deneyin."; }

    private String jsonString(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    /* ── Yapay Zeka Makale Taslağı Oluşturma ──────────────────────────────────── */

    public com.autismsupport.platform.dto.AiDraftResponse generateArticleDraft(String prompt) {
        String systemInstruction = """
            Sen otizm destek platformunda görevli uzman bir editörsün.
            Kullanıcının verdiği konu başlığı veya açıklamaya göre Türkçe, bilgilendirici, bilimsel ve ebeveyn dostu bir eğitim makalesi taslağı hazırlamalısın.
            
            Yanıtını MUTLAKA şu yapıda geçerli bir JSON olarak döndür (başka hiçbir metin veya markdown işareti ```json içerme):
            {
              "title": "Makale Başlığı",
              "category": "Sağlık" | "Eğitim" | "Davranış" | "Aile" | "Genel",
              "content": "HTML etiketleri ile biçimlendirilmiş makale içeriği. Başlıklar için <h3>, paragraflar için <p>, listeler için <ul>/<li> kullan. Markdown işaretleri (örn. **kalın**, # başlık) kesinlikle kullanma, sadece HTML kullan."
            }
            """;

        String responseJson = null;
        if (apiKey != null && !apiKey.isBlank()) {
            responseJson = sendCustomMessage(systemInstruction, prompt);
        }

        if (responseJson == null || responseJson.isBlank()) {
            // Fallback mock response in Turkish if API is unavailable
            return com.autismsupport.platform.dto.AiDraftResponse.builder()
                    .title(prompt + " Hakkında Rehber (Taslak)")
                    .category("Genel")
                    .content("<h3>" + prompt + " Giriş</h3><p>Bu makale taslağı <b>" + prompt + "</b> konusu hakkında bilgilendirme amacıyla yapay zeka tarafından taslak olarak hazırlanmıştır. Yapay zeka servis anahtarı yapılandırılmadığı için bu varsayılan şablon gösterilmektedir.</p><h3>Öneriler ve Detaylar</h3><ul><li>Çocuğunuzun bireysel gelişim planına sadık kalın.</li><li>Uzman tavsiyelerini ve seans takvimini düzenli takip edin.</li><li>Benzer durumdaki diğer ailelerle forum üzerinden bilgi alışverişinde bulunun.</li></ul>")
                    .aiGenerated(false)
                    .build();
        }

        try {
            return objectMapper.readValue(responseJson, com.autismsupport.platform.dto.AiDraftResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini draft response JSON: {}, error: {}", responseJson, e.getMessage());
            // Not a fallback template — this is real AI output that just failed to parse as the expected JSON shape.
            return com.autismsupport.platform.dto.AiDraftResponse.builder()
                    .title(prompt)
                    .category("Genel")
                    .content("<p>" + responseJson.replace("\n", "<br/>") + "</p>")
                    .build();
        }
    }

    /* ── Dış Kaynaklı Özet Çevirisi (PubMed vb.) ──────────────────────────────── */

    /** Verilen bilimsel özete sadık kalarak Türkçe'ye çevirir. API anahtarı yoksa veya ayrıştırma başarısızsa null döner (fallback üretmez). */
    public com.autismsupport.platform.dto.AiDraftResponse summarizeExternalAbstract(String sourceTitle, String abstractText) {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        String systemInstruction = """
            Sen otizm destek platformunda görevli, tıbbi doğruluğa önem veren bir editörsün.
            Sana bilimsel bir makalenin başlığı ve özeti (abstract) verilecek. Görevin bu özeti Türkçe'ye çevirip ebeveyn dostu, anlaşılır bir dille özetlemektir.
            SADECE verilen özette yer alan bilgileri kullan; uydurma bilgi, tavsiye veya istatistik ekleme.

            Yanıtını MUTLAKA şu yapıda geçerli bir JSON olarak döndür (başka hiçbir metin veya markdown işareti ```json içerme):
            {
              "title": "Türkçe başlık",
              "category": "Sağlık" | "Eğitim" | "Davranış" | "Aile" | "Genel",
              "content": "HTML etiketleri ile biçimlendirilmiş özet. Başlıklar için <h3>, paragraflar için <p> kullan. Markdown işaretleri kesinlikle kullanma, sadece HTML kullan."
            }
            """;
        String userMessage = "Başlık: " + sourceTitle + "\n\nÖzet:\n" + abstractText;

        String responseJson = sendCustomMessage(systemInstruction, userMessage);
        if (responseJson == null || responseJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(responseJson, com.autismsupport.platform.dto.AiDraftResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini external summary JSON: {}, error: {}", responseJson, e.getMessage());
            return null;
        }
    }

    public String sendCustomMessage(String systemInstruction, String userMessage) {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"system_instruction\":{\"parts\":[{\"text\":");
            sb.append(jsonString(systemInstruction));
            sb.append("}]},");
            sb.append("\"contents\":[");
            sb.append("{\"role\":\"user\",\"parts\":[{\"text\":").append(jsonString(userMessage)).append("}]}");
            sb.append("],");
            sb.append("\"generationConfig\":{");
            sb.append("\"responseMimeType\":\"application/json\",");
            sb.append("\"temperature\":0.7,");
            sb.append("\"topK\":40,");
            sb.append("\"topP\":0.95,");
            sb.append("\"maxOutputTokens\":2048,");
            sb.append("\"candidateCount\":1");
            sb.append("}}");

            String body = sb.toString();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Gemini API custom call failed (HTTP {}): {}", response.statusCode(), response.body());
                return null;
            }
            return parseGeminiResponse(response.body());
        } catch (Exception e) {
            log.error("Gemini API custom error: {}", e.getMessage());
            return null;
        }
    }
}
