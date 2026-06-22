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

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String PROPERTY_SOURCE_NAME = "renderDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (hasText(environment.getProperty("SPRING_DATASOURCE_URL"))
                || hasText(System.getProperty("spring.datasource.url"))) {
            return;
        }

        String rawUrl = firstNonBlank(
                environment.getProperty("DATABASE_URL"),
                environment.getProperty("DB_URL")
        );
        if (!hasText(rawUrl)) {
            return;
        }

        DatabaseProperties properties = toDatabaseProperties(rawUrl);
        if (properties == null) {
            return;
        }

        Map<String, Object> mapped = new HashMap<>();
        mapped.put("spring.datasource.url", properties.jdbcUrl());

        if (!hasText(environment.getProperty("SPRING_DATASOURCE_USERNAME"))
                && !hasText(environment.getProperty("DB_USERNAME"))
                && hasText(properties.username())) {
            mapped.put("spring.datasource.username", properties.username());
        }

        if (!hasText(environment.getProperty("SPRING_DATASOURCE_PASSWORD"))
                && !hasText(environment.getProperty("DB_PASSWORD"))
                && hasText(properties.password())) {
            mapped.put("spring.datasource.password", properties.password());
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, mapped));
    }

    private DatabaseProperties toDatabaseProperties(String rawUrl) {
        if (rawUrl.startsWith("jdbc:postgresql://")) {
            return new DatabaseProperties(rawUrl, null, null);
        }

        URI uri = URI.create(rawUrl);
        String scheme = uri.getScheme();
        if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
            return null;
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                .append(uri.getHost());
        if (uri.getPort() > -1) {
            jdbcUrl.append(':').append(uri.getPort());
        }
        jdbcUrl.append(hasText(uri.getRawPath()) ? uri.getRawPath() : "/");
        if (hasText(uri.getRawQuery())) {
            jdbcUrl.append('?').append(uri.getRawQuery());
        }

        String username = null;
        String password = null;
        if (hasText(uri.getRawUserInfo())) {
            String[] userInfo = uri.getRawUserInfo().split(":", 2);
            username = decode(userInfo[0]);
            if (userInfo.length > 1) {
                password = decode(userInfo[1]);
            }
        }

        return new DatabaseProperties(jdbcUrl.toString(), username, password);
    }

    private static String firstNonBlank(String first, String second) {
        return hasText(first) ? first : second;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private record DatabaseProperties(String jdbcUrl, String username, String password) {
    }
}
