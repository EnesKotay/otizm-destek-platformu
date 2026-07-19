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
import java.net.HttpCookie;

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
    void registerAndLoginReturnAccessTokenAndHttpOnlyRefreshCookie() {
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
        assertThat(registerData).doesNotContainKey("refreshToken");
        assertRefreshCookie(registerResponse);

        ResponseEntity<Map<String, Object>> loginResponse = exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "StrongPass123!"))
        );

        assertThat(loginResponse.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> loginData = data(loginResponse.getBody());
        assertThat(loginData.get("accessToken")).isInstanceOf(String.class);
        assertThat(loginData).doesNotContainKey("refreshToken");
        assertRefreshCookie(loginResponse);
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
        String refreshToken = refreshTokenFrom(registerResponse);

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

    @Test
    void refreshUsesCookieAndRotatesIt() {
        String email = "refresh-" + UUID.randomUUID() + "@example.com";
        ResponseEntity<Map<String, Object>> registerResponse = exchange(
                "/api/auth/register",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "email", email,
                        "password", "StrongPass123!",
                        "fullName", "Refresh Parent",
                        "kvkkConsent", true,
                        "role", "PARENT"
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, "refresh_token=" + refreshTokenFrom(registerResponse));
        ResponseEntity<Map<String, Object>> refreshResponse = exchange(
                "/api/auth/refresh",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), headers)
        );

        assertThat(refreshResponse.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(data(refreshResponse.getBody()).get("accessToken")).isInstanceOf(String.class);
        assertRefreshCookie(refreshResponse);
        assertThat(refreshTokenFrom(refreshResponse)).isNotEqualTo(refreshTokenFrom(registerResponse));
    }

    @Test
    void checkEmailAvailability() {
        String email = "avail-" + UUID.randomUUID() + "@example.com";

        // Initial check: email should be available
        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/auth/check-email?email=" + email,
                HttpMethod.GET,
                null
        );
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(data(body).get("available")).isEqualTo(true);

        // Register the email
        exchange("/api/auth/register", HttpMethod.POST, new HttpEntity<>(Map.of(
                "email", email,
                "password", "StrongPass123!",
                "fullName", "Integration Parent",
                "kvkkConsent", true,
                "role", "PARENT"
        )));

        // Check again: email should not be available
        ResponseEntity<Map<String, Object>> responseAfterRegister = exchange(
                "/api/auth/check-email?email=" + email,
                HttpMethod.GET,
                null
        );
        assertThat(responseAfterRegister.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> bodyAfterRegister = responseAfterRegister.getBody();
        assertThat(bodyAfterRegister).isNotNull();
        assertThat(data(bodyAfterRegister).get("available")).isEqualTo(false);
    }

    @Test
    void publicRegistrationRejectsAdminRole() {
        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/auth/register",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "email", "admin-attempt-" + UUID.randomUUID() + "@example.com",
                        "password", "StrongPass123!",
                        "fullName", "Admin Attempt",
                        "kvkkConsent", true,
                        "role", "ADMIN"
                ))
        );

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).isNull();
    }

    @Test
    void expertRegistrationIsPendingAndDoesNotIssueTokens() {
        ResponseEntity<Map<String, Object>> response = exchange(
                "/api/auth/register",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "email", "expert-pending-" + UUID.randomUUID() + "@example.com",
                        "password", "StrongPass123!",
                        "fullName", "Pending Expert",
                        "kvkkConsent", true,
                        "role", "EXPERT",
                        "expertTitle", "Dil Terapisti",
                        "licenseNumber", "LIC-123"
                ))
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> responseData = data(response.getBody());
        assertThat(responseData.get("pendingApproval")).isEqualTo(true);
        assertThat(responseData).doesNotContainKey("accessToken");
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).isNull();
    }

    private ResponseEntity<Map<String, Object>> exchange(String path, HttpMethod method, HttpEntity<?> entity) {
        return rest.exchange(path, method, entity, new ParameterizedTypeReference<>() {});
    }

    private HttpEntity<Void> authenticated(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private void assertRefreshCookie(ResponseEntity<?> response) {
        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie)
                .isNotBlank()
                .contains("refresh_token=")
                .contains("HttpOnly")
                .contains("SameSite=Strict")
                .contains("Path=/api/auth");
    }

    private String refreshTokenFrom(ResponseEntity<?> response) {
        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).isNotBlank();
        return HttpCookie.parse(setCookie).getFirst().getValue();
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
