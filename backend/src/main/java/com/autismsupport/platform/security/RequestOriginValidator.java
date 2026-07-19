package com.autismsupport.platform.security;

import com.autismsupport.platform.exception.ValidationException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RequestOriginValidator {

    private final Set<String> allowedOrigins;

    public RequestOriginValidator(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .map(RequestOriginValidator::withoutTrailingSlash)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Browser cookie kullanan yazma isteklerinde cross-site çağrıları engeller.
     * Origin bulunmaması CLI/native istemciler için kabul edilir; tarayıcıların
     * cross-origin POST istekleri Origin başlığını gönderir.
     */
    public void validateCookieWrite(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !allowedOrigins.contains(withoutTrailingSlash(origin))) {
            throw new ValidationException("İstek kaynağına izin verilmiyor");
        }
    }

    private static String withoutTrailingSlash(String value) {
        return value.replaceAll("/+$", "");
    }
}
