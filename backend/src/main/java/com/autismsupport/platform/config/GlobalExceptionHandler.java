package com.autismsupport.platform.config;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.exception.ConflictException;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.MDC;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final MeterRegistry meterRegistry;

    public GlobalExceptionHandler(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @ExceptionHandler(AuthenticationRequiredException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationRequired(AuthenticationRequiredException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(messageOrDefault(
                ex,
                "Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın."
        )));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(messageOrDefault(
                ex,
                "Aradığınız kayıt bulunamadı."
        )));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Aradığınız adres bulunamadı."));
    }

    @ExceptionHandler({UnauthorizedException.class, AccessDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleForbidden(Exception ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(messageOrDefault(
                ex,
                "Bu işlem için yetkiniz bulunmuyor."
        )));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(messageOrDefault(
                ex,
                "Bu işlem mevcut kayıtlarla çakışıyor."
        )));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(ValidationException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(messageOrDefault(
                ex,
                "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin."
        )));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error("Dosya boyutu izin verilen sınırı aşıyor."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        recordError(ex);
        log.warn("Veri bütünlüğü ihlali yakalandı; requestId={}", MDC.get(CorrelationIdFilter.MDC_KEY));
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("Bu işlem zaten gerçekleştirilmiş olabilir. Lütfen sayfayı yenileyin."));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        recordError(ex);
        log.error("Beklenmeyen çalışma zamanı hatası; requestId={}, type={}",
                MDC.get(CorrelationIdFilter.MDC_KEY), ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Beklenmeyen bir hata oluştu. Destek kodu: " + MDC.get(CorrelationIdFilter.MDC_KEY)));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("E-posta veya şifre hatalı"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.badRequest().body(ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Doğrulama hatası")
                .data(errors)
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        recordError(ex);
        log.error("Beklenmeyen sunucu hatası; requestId={}, type={}",
                MDC.get(CorrelationIdFilter.MDC_KEY), ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Beklenmeyen bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."));
    }

    private String messageOrDefault(Exception ex, String fallback) {
        return ex.getMessage() == null || ex.getMessage().isBlank() ? fallback : ex.getMessage();
    }

    private void recordError(Exception ex) {
        meterRegistry.counter("application.errors", "type", ex.getClass().getSimpleName()).increment();
    }
}
