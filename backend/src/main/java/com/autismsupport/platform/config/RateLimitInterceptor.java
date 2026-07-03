package com.autismsupport.platform.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.redis-enabled:true}")
    private boolean redisEnabled;

    // Local fallback in-memory rate limiter if Redis is unavailable
    private final Map<String, List<Instant>> localFallbackMap = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RateLimit rateLimit = handlerMethod.getMethodAnnotation(RateLimit.class);
        if (rateLimit == null) {
            rateLimit = handlerMethod.getBeanType().getAnnotation(RateLimit.class);
        }
        if (rateLimit == null) {
            return true;
        }

        int limit = rateLimit.limit();
        int duration = rateLimit.duration();

        String key = buildRateLimitKey(request);

        boolean allowed = true;
        try {
            if (redisEnabled && redisTemplate != null) {
                allowed = checkRedisRateLimit(key, limit, duration);
            } else {
                allowed = checkLocalRateLimit(key, limit, duration);
            }
        } catch (Exception e) {
            log.warn("Redis rate limiter failed, falling back to local memory: {}", e.getMessage());
            allowed = checkLocalRateLimit(key, limit, duration);
        }

        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.\"}");
            return false;
        }

        return true;
    }

    private boolean checkRedisRateLimit(String key, int limit, int duration) {
        String redisKey = "rate_limit:" + key;
        Long count = redisTemplate.opsForValue().increment(redisKey, 1);
        if (count != null && count == 1) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(duration));
        }
        return count != null && count <= limit;
    }

    private boolean checkLocalRateLimit(String key, int limit, int duration) {
        Instant now = Instant.now();
        Instant limitBefore = now.minusSeconds(duration);

        List<Instant> requests = localFallbackMap.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>());

        // Clean expired timestamps
        requests.removeIf(time -> time.isBefore(limitBefore));

        if (requests.size() >= limit) {
            return false;
        }

        requests.add(now);
        return true;
    }

    private String buildRateLimitKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getName() != null
                && !"anonymousUser".equals(authentication.getName())) {
            return "user:" + authentication.getName() + ":" + request.getRequestURI();
        }
        return "ip:" + getClientIp(request) + ":" + request.getRequestURI();
    }

    private String getClientIp(HttpServletRequest request) {
        String cfConnectingIp = firstHeaderValue(request.getHeader("CF-Connecting-IP"));
        if (cfConnectingIp != null) {
            return cfConnectingIp;
        }

        String realIp = firstHeaderValue(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return realIp;
        }

        String forwardedFor = firstHeaderValue(request.getHeader("X-Forwarded-For"));
        if (forwardedFor != null) {
            return forwardedFor;
        }

        return request.getRemoteAddr();
    }

    private String firstHeaderValue(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return null;
        }
        for (String part : headerValue.split(",")) {
            String value = part.trim();
            if (!value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                return value;
            }
        }
        return null;
    }

    // Her 5 dakikada bir eski in-memory kayıtları temizle (bellek sızıntısı önlemi)
    @Scheduled(fixedDelay = 300_000)
    public void cleanupLocalFallbackMap() {
        Instant cutoff = Instant.now().minusSeconds(3600); // 1 saatten eski tüm anahtarları sil
        localFallbackMap.entrySet().removeIf(entry -> {
            List<Instant> times = entry.getValue();
            times.removeIf(t -> t.isBefore(cutoff));
            return times.isEmpty();
        });
        log.debug("Rate limiter local cache temizlendi. Kalan anahtar: {}", localFallbackMap.size());
    }
}
