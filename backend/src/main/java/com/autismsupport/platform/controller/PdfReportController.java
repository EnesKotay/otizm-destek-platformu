package com.autismsupport.platform.controller;

import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.PdfReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfReportController {
    private final PdfReportService pdfReportService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<byte[]> generateReport(
            @PathVariable UUID childId,
            @CurrentUser UserPrincipal principal) {
        byte[] pdf = pdfReportService.generateChildReport(childId, principal.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"gelisim-raporu.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
