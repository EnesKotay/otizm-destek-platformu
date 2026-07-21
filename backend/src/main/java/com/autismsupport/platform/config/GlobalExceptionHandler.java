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
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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
                "Oturum süreniz doldu. Lütfen yeniden giriş yapın."
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
                .body(ApiResponse.error("Aradığınız sayfa veya adres bulunamadı."));
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
                "İşlem tamamlanamadı. Lütfen formu kontrol edip tekrar deneyin."
        )));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(RuntimeException ex) {
        log.warn("Geçersiz istek parametresi; message={}", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(messageOrDefault(
                ex,
                "Geçersiz parametre veya işlem isteği gönderildi."
        )));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error("Gönderilen veri formatı geçersiz. Lütfen girdiğiniz bilgileri kontrol edin."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error("İstek parametresi geçersiz biçimde."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error("Yüklenen dosya boyutu izin verilen sınırı aşıyor (Maksimum 10MB)."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        recordError(ex);
        log.warn("Veri bütünlüğü ihlali; requestId={}", MDC.get(CorrelationIdFilter.MDC_KEY));
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("Bu kayıt zaten mevcut veya veriler çakışıyor. Lütfen sayfayı yenileyip tekrar deneyin."));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("E-posta adresi veya şifre hatalı. Lütfen tekrar deneyin."));
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
                .message("Lütfen formdaki eksik veya hatalı alanları düzeltin.")
                .data(errors)
                .build());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        recordError(ex);
        log.error("Çalışma zamanı hatası; requestId={}, type={}",
                MDC.get(CorrelationIdFilter.MDC_KEY), ex.getClass().getSimpleName(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("İşleminiz şu anda gerçekleştirilemedi. Lütfen kısa bir süre sonra tekrar deneyin."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        recordError(ex);
        log.error("Genel sunucu hatası; requestId={}, type={}",
                MDC.get(CorrelationIdFilter.MDC_KEY), ex.getClass().getSimpleName(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Sistemde geçici bir aksaklık oluştu. Lütfen sayfayı yenileyip tekrar deneyin."));
    }

    private String messageOrDefault(Exception ex, String fallback) {
        return ex.getMessage() == null || ex.getMessage().isBlank() ? fallback : ex.getMessage();
    }

    private void recordError(Exception ex) {
        meterRegistry.counter("application.errors", "type", ex.getClass().getSimpleName()).increment();
    }
}
