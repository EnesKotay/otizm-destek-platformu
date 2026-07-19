package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Service
public class TurnstileService {
    private final ObjectMapper objectMapper;
    private final boolean required;
    private final String secret;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public TurnstileService(ObjectMapper objectMapper,
            @Value("${app.turnstile.required:false}") boolean required,
            @Value("${app.turnstile.secret-key:}") String secret) {
        this.objectMapper = objectMapper;
        this.required = required;
        this.secret = secret;
    }

    public void verify(String token, String remoteIp) {
        if (!required) return;
        if (secret.isBlank()) throw new IllegalStateException("TURNSTILE_SECRET_KEY üretimde tanımlanmalıdır");
        if (token == null || token.isBlank()) throw new ValidationException("Bot doğrulaması tamamlanmalıdır");
        try {
            String form = "secret=" + encode(secret) + "&response=" + encode(token)
                    + (remoteIp == null ? "" : "&remoteip=" + encode(remoteIp));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify"))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
            if (response.statusCode() != 200 || !Boolean.TRUE.equals(body.get("success"))) {
                throw new ValidationException("Bot doğrulaması başarısız oldu; lütfen yeniden deneyin");
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ValidationException("Bot doğrulama servisine ulaşılamadı; lütfen yeniden deneyin");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
