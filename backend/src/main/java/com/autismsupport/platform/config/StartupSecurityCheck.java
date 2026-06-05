package com.autismsupport.platform.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class StartupSecurityCheck {

    private static final String DEFAULT_JWT_SECRET =
            "YXV0aXNtc3VwcG9ydHBsYXRmb3Jtc2VjcmV0a2V5Zm9ybG9jYWxkZXZlbG9wbWVudDEyMzQ1Njc4";
    private static final String DEFAULT_DB_PASSWORD   = "changeme";
    private static final String DEFAULT_ADMIN_PASSWORD = "Admin123!";
    private static final String DEFAULT_ENCRYPTION_KEY = "autism-support-local-dev-encryption-key-32b";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${app.encryption.secret-key:}")
    private String encryptionKey;

    @PostConstruct
    void check() {
        boolean hasWarning = false;

        if (DEFAULT_JWT_SECRET.equals(jwtSecret)) {
            log.warn("GÜVENLIK UYARISI: JWT_SECRET ortam degiskeni ayarlanmamis — " +
                     "varsayilan anahtar kullaniliyor. Uretim ortaminda mutlaka degistirin!");
            hasWarning = true;
        }
        if (DEFAULT_DB_PASSWORD.equals(dbPassword)) {
            log.warn("GÜVENLIK UYARISI: DB_PASSWORD 'changeme' olarak ayarli. " +
                     "Uretim ortaminda guclu bir sifre kullanihn!");
            hasWarning = true;
        }
        if (DEFAULT_ADMIN_PASSWORD.equals(adminPassword)) {
            log.warn("GÜVENLIK UYARISI: APP_BOOTSTRAP_ADMIN_PASSWORD varsayilan deger. " +
                     "Uretim ortaminda degistirin!");
            hasWarning = true;
        }
        if (DEFAULT_ENCRYPTION_KEY.equals(encryptionKey)) {
            log.warn("GÜVENLIK UYARISI: ENCRYPTION_KEY varsayilan deger. " +
                     "Uretim ortaminda 32+ karakterlik rastgele bir deger kullanihn!");
            hasWarning = true;
        }

        if (hasWarning) {
            log.warn("Yukaridaki guvensiz varsayilan degerler .env dosyaniza veya ortam degiskenleri araciligiyla degistirilmeli.");
        }
    }
}
