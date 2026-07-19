package com.autismsupport.platform.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Render/Neon gibi sağlayıcıların postgresql:// biçimindeki DATABASE_URL değerini JDBC ayarlarına dönüştürür. */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (environment.getProperty("DB_URL") != null) return;
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) return;
        URI uri = URI.create(databaseUrl);
        if (!"postgres".equalsIgnoreCase(uri.getScheme()) && !"postgresql".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalStateException("DATABASE_URL postgresql:// biçiminde olmalıdır");
        }

        String jdbcUrl = "jdbc:postgresql://" + uri.getHost()
                + (uri.getPort() > 0 ? ":" + uri.getPort() : "")
                + uri.getRawPath()
                + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
        Map<String, Object> properties = new HashMap<>();
        properties.put("spring.datasource.url", jdbcUrl);
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            String[] credentials = userInfo.split(":", 2);
            properties.put("spring.datasource.username", decode(credentials[0]));
            if (credentials.length == 2) properties.put("spring.datasource.password", decode(credentials[1]));
        }
        environment.getPropertySources().addFirst(new MapPropertySource("databaseUrl", properties));
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
