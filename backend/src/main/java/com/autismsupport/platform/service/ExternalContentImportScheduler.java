package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExternalContentImportScheduler {

    private final ExternalArticleImportService externalArticleImportService;

    @Value("${external.import.enabled:false}")
    private boolean importEnabled;

    /** Her Pazartesi 06:00'da calisir — PubMed'den yeni ozet taslaklari ceker (admin onayi bekler). */
    @Scheduled(cron = "0 0 6 * * MON")
    public void importExternalArticles() {
        if (!importEnabled) {
            return;
        }
        try {
            int fromPubMed = externalArticleImportService.importFromPubMed();
            int fromEuropePmc = externalArticleImportService.importFromEuropePmc();
            log.info("Disaridan {} yeni makale taslagi olusturuldu (PubMed: {}, Europe PMC: {}); admin onayi bekliyor.",
                    fromPubMed + fromEuropePmc, fromPubMed, fromEuropePmc);
        } catch (Exception e) {
            log.error("Disaridan icerik cekme islemi basarisiz oldu: {}", e.getMessage());
        }
    }
}
