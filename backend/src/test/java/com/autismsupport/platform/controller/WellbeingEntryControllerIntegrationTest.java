package com.autismsupport.platform.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WellbeingEntryControllerIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void parentCanUpsertListAndDeleteWellbeingEntry() {
        String token = registerAndGetToken();

        ResponseEntity<Map<String, Object>> createResponse = exchange(
                "/api/wellbeing",
                HttpMethod.POST,
                authenticated(token, Map.of(
                        "entryDate", "2026-06-04",
                        "answers", List.of(7, 8, 6, 9, 7),
                        "score", 74,
                        "notes", "Haftalik refah kontrolu"
                ))
        );

        assertThat(createResponse.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> created = data(createResponse.getBody());
        assertThat(created.get("score")).isEqualTo(74);
        assertThat(created.get("id")).isInstanceOf(String.class);

        ResponseEntity<Map<String, Object>> listResponse = exchange(
                "/api/wellbeing",
                HttpMethod.GET,
                authenticated(token, null)
        );
        assertThat(listResponse.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat((List<?>) listResponse.getBody().get("data")).isNotEmpty();

        ResponseEntity<Map<String, Object>> updateResponse = exchange(
                "/api/wellbeing",
                HttpMethod.POST,
                authenticated(token, Map.of(
                        "entryDate", "2026-06-04",
                        "answers", List.of(9, 9, 8, 9, 8),
                        "score", 86,
                        "notes", "Ayni gun guncellendi"
                ))
        );
        assertThat(updateResponse.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(data(updateResponse.getBody()).get("score")).isEqualTo(86);

        String entryId = (String) data(updateResponse.getBody()).get("id");
        ResponseEntity<Map<String, Object>> deleteResponse = exchange(
                "/api/wellbeing/" + entryId,
                HttpMethod.DELETE,
                authenticated(token, null)
        );
        assertThat(deleteResponse.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void upsertRejectsInvalidAnswerCount() {
        String token = registerAndGetToken();

        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/wellbeing",
                HttpMethod.POST,
                authenticated(token, Map.of(
                        "entryDate", "2026-06-04",
                        "answers", List.of(7, 8),
                        "score", 50
                ))
        );

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
    }

    private String registerAndGetToken() {
        String email = "parent-" + UUID.randomUUID() + "@example.com";
        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/auth/register",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "email", email,
                        "password", "StrongPass123!",
                        "fullName", "Integration Parent",
                        "kvkkConsent", true,
                        "role", "PARENT"
                ))
        );
        return (String) data(response.getBody()).get("accessToken");
    }

    private HttpEntity<?> authenticated(String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }

    private ResponseEntity<Map<String, Object>> exchange(String path, HttpMethod method, HttpEntity<?> entity) {
        return rest.exchange(path, method, entity, new ParameterizedTypeReference<>() {});
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> data(Map<String, Object> body) {
        assertThat(body).isNotNull();
        return (Map<String, Object>) body.get("data");
    }
}
