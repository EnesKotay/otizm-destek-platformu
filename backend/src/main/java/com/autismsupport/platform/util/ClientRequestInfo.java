package com.autismsupport.platform.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Rıza ve denetim kayıtlarına yazılacak istemci bilgisini üretir.
 * KVKK'da rızanın ispatı için "ne zaman, nereden" bilgisi anlamlıdır.
 */
@Component
public class ClientRequestInfo {

    private static final int MAX_USER_AGENT = 512;

    @Value("${app.rate-limit.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    public String clientIp() {
        HttpServletRequest request = currentRequest();
        if (request == null) return null;
        if (trustProxyHeaders) {
            String header = firstNonBlank(
                    request.getHeader("CF-Connecting-IP"),
                    request.getHeader("X-Real-IP"),
                    firstToken(request.getHeader("X-Forwarded-For")));
            if (header != null) return header;
        }
        return request.getRemoteAddr();
    }

    public String userAgent() {
        HttpServletRequest request = currentRequest();
        if (request == null) return null;
        String agent = request.getHeader("User-Agent");
        if (agent == null || agent.isBlank()) return null;
        return agent.length() > MAX_USER_AGENT ? agent.substring(0, MAX_USER_AGENT) : agent;
    }

    private HttpServletRequest currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes.getRequest()
                : null;
    }

    private String firstToken(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) return null;
        String first = headerValue.split(",")[0].trim();
        return first.isBlank() ? null : first;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }
}
