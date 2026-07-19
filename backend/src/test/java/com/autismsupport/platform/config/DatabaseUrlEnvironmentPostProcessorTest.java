package com.autismsupport.platform.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlEnvironmentPostProcessorTest {
    @Test
    void convertsProviderUrlToJdbcProperties() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://user:p%40ss@db.example.com:5432/app?sslmode=require");
        new DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(environment, new SpringApplication());
        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:5432/app?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("user");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("p@ss");
    }
}
