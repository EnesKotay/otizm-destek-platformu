package com.autismsupport.platform.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @BeforeEach
    void useNonStreamingClient() {
        rest.getRestTemplate().setRequestFactory(new HttpComponentsClientHttpRequestFactory());
    }

    @Test
    void registerAndLoginReturnsTokensAndCurrentUser() {
        String email = "parent-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> registerPayload = Map.of(
                "email", email,
                "password", "StrongPass123!",
                "fullName", "Integration Parent",
                "kvkkConsent", true,
                "role", "PARENT"
        );

        ResponseEntity<Map<String, Object>> registerResponse = exchange(
                "/api/auth/register",
                HttpMethod.POST,
                new HttpEntity<>(registerPayload)
        );

        assertThat(registerResponse.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> registerBody = registerResponse.getBody();
        assertThat(registerBody).isNotNull();
        assertThat(registerBody.get("success")).isEqualTo(true);
        Map<String, Object> registerData = data(registerBody);
        assertThat(registerData.get("accessToken")).isInstanceOf(String.class);
        assertThat(registerData.get("refreshToken")).isInstanceOf(String.class);

        ResponseEntity<Map<String, Object>> loginResponse = exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "StrongPass123!"))
        );

        assertThat(loginResponse.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> loginData = data(loginResponse.getBody());
        assertThat(loginData.get("accessToken")).isInstanceOf(String.class);
        assertThat(loginData.get("refreshToken")).isInstanceOf(String.class);
        assertThat(data(loginData, "user").get("email")).isEqualTo(email);
    }

    @Test
    void loginRejectsInvalidPassword() {
        String email = "parent-" + UUID.randomUUID() + "@example.com";
        exchange("/api/auth/register", HttpMethod.POST, new HttpEntity<>(Map.of(
                "email", email,
                "password", "StrongPass123!",
                "fullName", "Integration Parent",
                "kvkkConsent", true,
                "role", "PARENT"
        )));

        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "wrong-password"))
        );

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
    }

    @Test
    void protectedEndpointRejectsRefreshToken() {
        String email = "parent-" + UUID.randomUUID() + "@example.com";
        ResponseEntity<Map<String, Object>> registerResponse = exchange(
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

        Map<String, Object> tokens = data(registerResponse.getBody());
        String accessToken = (String) tokens.get("accessToken");
        String refreshToken = (String) tokens.get("refreshToken");

        ResponseEntity<Map<String, Object>> accessResponse = exchange(
                "/api/auth/me",
                HttpMethod.GET,
                authenticated(accessToken)
        );
        assertThat(accessResponse.getStatusCode().is2xxSuccessful()).isTrue();

        ResponseEntity<Map<String, Object>> refreshResponse = exchange(
                "/api/auth/me",
                HttpMethod.GET,
                authenticated(refreshToken)
        );
        assertThat(refreshResponse.getStatusCode().value()).isEqualTo(401);
    }

    private ResponseEntity<Map<String, Object>> exchange(String path, HttpMethod method, HttpEntity<?> entity) {
        return rest.exchange(path, method, entity, new ParameterizedTypeReference<>() {});
    }

    private HttpEntity<Void> authenticated(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> data(Map<String, Object> body) {
        assertThat(body).isNotNull();
        return (Map<String, Object>) body.get("data");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> data(Map<String, Object> body, String key) {
        return (Map<String, Object>) body.get(key);
    }
}
