package com.autismsupport.platform.integration;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

public class ContextLoadTest extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
        // This test will fail if the Spring Context fails to load,
        // or if Testcontainers fails to start the PostgreSQL database.
        assertThat(postgres.isRunning()).isTrue();
    }
}
