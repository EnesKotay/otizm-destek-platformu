package com.autismsupport.platform.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.method.HandlerMethod;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RateLimitInterceptor unit testleri")
class RateLimitInterceptorTest {

    @Mock HttpServletRequest request;
    @Mock HttpServletResponse response;
    @Mock HandlerMethod handlerMethod;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOperations;

    @InjectMocks RateLimitInterceptor rateLimitInterceptor;

    private RateLimit rateLimit;

    @BeforeEach
    void setUp() {
        rateLimit = mock(RateLimit.class);
        when(rateLimit.limit()).thenReturn(2);
        when(rateLimit.duration()).thenReturn(10);
    }

    @Test
    @DisplayName("preHandle: Redis ile istek limiti asilmadiginda gecise izin verir")
    void preHandle_redisWithinLimit_allowsRequest() throws Exception {
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisTemplate", redisTemplate);
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisEnabled", true);

        when(handlerMethod.getMethodAnnotation(RateLimit.class)).thenReturn(rateLimit);
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/test");

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // First request: count = 1
        when(valueOperations.increment(eq("rate_limit:127.0.0.1:/api/test"), eq(1L))).thenReturn(1L);

        boolean result = rateLimitInterceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
        verify(redisTemplate).expire(eq("rate_limit:127.0.0.1:/api/test"), any(Duration.class));
    }

    @Test
    @DisplayName("preHandle: Redis ile istek limiti asildiginda 429 doner")
    void preHandle_redisExceedLimit_blocksRequest() throws Exception {
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisTemplate", redisTemplate);
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisEnabled", true);

        when(handlerMethod.getMethodAnnotation(RateLimit.class)).thenReturn(rateLimit);
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/test");

        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        when(response.getWriter()).thenReturn(pw);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // Request limit was 2. Return 3 (limit exceeded)
        when(valueOperations.increment(eq("rate_limit:127.0.0.1:/api/test"), eq(1L))).thenReturn(3L);

        boolean result = rateLimitInterceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        verify(response).setStatus(429);
        assertThat(sw.toString()).contains("Çok fazla istek gönderdiniz");
    }

    @Test
    @DisplayName("preHandle: Redis calismadiginda in-memory fallback ile limit kontrol eder")
    void preHandle_redisMissingFallback_allowsThenBlocks() throws Exception {
        // Leave redisTemplate as null to trigger local fallback
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisTemplate", null);
        ReflectionTestUtils.setField(rateLimitInterceptor, "redisEnabled", false);

        when(handlerMethod.getMethodAnnotation(RateLimit.class)).thenReturn(rateLimit);
        when(request.getHeader("X-Forwarded-For")).thenReturn("192.168.1.100, 10.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/test");

        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        // Note: response.getWriter() only called when blocked
        lenient().when(response.getWriter()).thenReturn(pw);

        // 1st request -> allowed
        boolean r1 = rateLimitInterceptor.preHandle(request, response, handlerMethod);
        assertThat(r1).isTrue();

        // 2nd request -> allowed
        boolean r2 = rateLimitInterceptor.preHandle(request, response, handlerMethod);
        assertThat(r2).isTrue();

        // 3rd request -> blocked (since limit is 2)
        boolean r3 = rateLimitInterceptor.preHandle(request, response, handlerMethod);
        assertThat(r3).isFalse();
        verify(response).setStatus(429);
    }
}
