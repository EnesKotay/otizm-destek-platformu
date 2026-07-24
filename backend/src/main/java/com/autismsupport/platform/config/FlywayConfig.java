package com.autismsupport.platform.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Flyway'in "repair" adimini acilista calistirir.
 *
 * <p>application.yml icindeki {@code spring.flyway.repair-on-migrate} anahtari Spring Boot'un
 * bilmedigi bir ayardir; tanimlansa bile sessizce yok sayilir. Bu sinif ayni anahtari okuyup
 * gercekten uygular.
 *
 * <p>Neden gerekli: V33/V39/V41/V44 migration'lari, veritabanina uygulandiktan sonra eksik
 * {@code CREATE TABLE IF NOT EXISTS} tanimlarini eklemek icin guncellendi. Eklenen ifadeler
 * idempotent oldugu icin mevcut veritabanlarinda etkisizdir, ancak dosya icerigi degistigi icin
 * Flyway'in kaydettigi checksum'lar tutmaz ve uygulama acilmaz. {@code repair()} bu checksum
 * kayitlarini gunceller; migration'lari yeniden calistirmaz.
 *
 * <p>Gecmiste yapilan bu tur bir duzeltme tamamlandiktan sonra
 * {@code SPRING_FLYWAY_REPAIR_ON_MIGRATE=false} ortam degiskeni ile kapatilabilir; boylece
 * uygulanmis bir migration'in yanlislikla degistirilmesi tekrar hata verir.
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Value("${spring.flyway.repair-on-migrate:true}")
    private boolean repairOnMigrate;

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            if (repairOnMigrate) {
                log.info("Flyway repair() calistiriliyor: uygulanmis migration checksum kayitlari guncelleniyor.");
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
