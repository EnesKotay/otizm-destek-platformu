package com.autismsupport.platform.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.StringTemplateResolver;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {
    @Mock JavaMailSender mailSender;
    private EmailService service;

    @BeforeEach
    void setUp() {
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(new StringTemplateResolver());
        service = new EmailService(mailSender, templateEngine);
        ReflectionTestUtils.setField(service, "mailEnabled", true);
        ReflectionTestUtils.setField(service, "fromEmail", "noreply@example.com");
        ReflectionTestUtils.setField(service, "fromName", "Test");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com");
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((Session) null));
    }

    @Test
    void transientSmtpFailureIsRetried() {
        doThrow(new RuntimeException("temporary"))
                .doThrow(new RuntimeException("temporary"))
                .doNothing()
                .when(mailSender).send(any(MimeMessage.class));

        service.sendPasswordResetEmail("parent@example.com", "token");

        verify(mailSender, times(3)).send(any(MimeMessage.class));
    }
}
