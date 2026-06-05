package com.autismsupport.platform.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChildControllerIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @BeforeEach
    void useNonStreamingClient() {
        rest.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());
    }

    @Test
    void parentCanCreateListUpdateAndDeleteOwnChild() {
        String token = registerAndGetToken();

        ResponseEntity<Map<String, Object>> createResponse = exchange(
                "/api/children",
                HttpMethod.POST,
                authenticated(token, Map.of(
                        "name", "Test Child",
                        "birthDate", "2020-05-10",
                        "gender", "ERKEK",
                        "diagnosisInfo", "OSB destek ihtiyaci"
                ))
        );

        assertThat(createResponse.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> created = data(createResponse.getBody());
        assertThat(created.get("name")).isEqualTo("Test Child");
        String childId = (String) created.get("id");
        assertThat(childId).isNotBlank();

        ResponseEntity<Map<String, Object>> listResponse = exchange(
                "/api/children",
                HttpMethod.GET,
                authenticated(token, null)
        );
        assertThat(listResponse.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat((List<?>) listResponse.getBody().get("data")).isNotEmpty();

        ResponseEntity<Map<String, Object>> updateResponse = exchange(
                "/api/children/" + childId,
                HttpMethod.PUT,
                authenticated(token, Map.of(
                        "name", "Updated Child",
                        "birthDate", "2020-05-10",
                        "gender", "ERKEK",
                        "diagnosisInfo", "Guncel not"
                ))
        );
        assertThat(updateResponse.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(data(updateResponse.getBody()).get("name")).isEqualTo("Updated Child");

        ResponseEntity<Map<String, Object>> deleteResponse = exchange(
                "/api/children/" + childId,
                HttpMethod.DELETE,
                authenticated(token, null)
        );
        assertThat(deleteResponse.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void unauthenticatedCreateIsRejected() {
        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/children",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "No Auth Child"))
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
