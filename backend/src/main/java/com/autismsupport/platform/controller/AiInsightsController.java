package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.AiInsightsService;
import com.autismsupport.platform.service.GeminiService;
import com.autismsupport.platform.service.PdfReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai-insights")
@RequiredArgsConstructor
public class AiInsightsController {

    private final AiInsightsService aiInsightsService;
    private final GeminiService geminiService;
    private final PdfReportService pdfReportService;

    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<String>> getInsights(
            @PathVariable UUID childId,
            @RequestParam(defaultValue = "GENERAL") String type,
            @CurrentUser UserPrincipal principal) {
        AiInsightsService.AnalysisType analysisType;
        try {
            analysisType = AiInsightsService.AnalysisType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            analysisType = AiInsightsService.AnalysisType.GENERAL;
        }
        UserPrincipal currentUser = requireUser(principal);
        String insights = aiInsightsService.generateInsights(
                childId,
                analysisType,
                currentUser.getId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(insights));
    }

    @GetMapping(value = "/{childId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamInsights(
            @PathVariable UUID childId,
            @RequestParam(defaultValue = "GENERAL") String type,
            @CurrentUser UserPrincipal principal) {
        AiInsightsService.AnalysisType analysisType;
        try {
            analysisType = AiInsightsService.AnalysisType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            analysisType = AiInsightsService.AnalysisType.GENERAL;
        }

        SseEmitter emitter = new SseEmitter(120_000L);
        UserPrincipal currentUser = requireUser(principal);
        String prompt = aiInsightsService.buildPromptForStreaming(
                childId,
                analysisType,
                currentUser.getId(),
                currentUser.getRole()
        );
        geminiService.streamMessage(prompt, null, null, emitter);
        return emitter;
    }

    @GetMapping(value = "/{childId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadInsightsPdf(
            @PathVariable UUID childId,
            @RequestParam(defaultValue = "GENERAL") String type,
            @CurrentUser UserPrincipal principal) {

        AiInsightsService.AnalysisType analysisType;
        try {
            analysisType = AiInsightsService.AnalysisType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            analysisType = AiInsightsService.AnalysisType.GENERAL;
        }

        UserPrincipal currentUser = requireUser(principal);
        String aiText = aiInsightsService.generateInsights(
                childId, analysisType, currentUser.getId(), currentUser.getRole());

        byte[] pdf = pdfReportService.generateAiInsightsPdf(
                childId, currentUser.getId(), analysisType, aiText);

        String filename = "ai-analiz-" + type.toLowerCase() + "-" + LocalDate.now() + ".pdf";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename).build());

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private UserPrincipal requireUser(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal;
    }
}
