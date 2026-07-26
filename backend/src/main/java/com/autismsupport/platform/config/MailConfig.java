package com.autismsupport.platform.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Slf4j
@Configuration
public class MailConfig {

    @Value("${spring.mail.host:localhost}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Bean
    public JavaMailSender javaMailSender() {
        if (!mailEnabled) {
            log.warn("E-posta devre dışı (MAIL_ENABLED=false). E-postalar gönderilmeyecek.");
            return createNoOpMailSender();
        }
        if (username == null || username.isBlank()) {
            throw new IllegalStateException(
                    "MAIL_ENABLED=true ancak MAIL_USERNAME boş. SMTP kullanıcı adını yapılandırın " +
                    "veya e-posta gönderimini MAIL_ENABLED=false ile açıkça kapatın."
            );
        }
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "MAIL_ENABLED=true ancak MAIL_PASSWORD boş. SMTP parolasını yapılandırın " +
                    "veya e-posta gönderimini MAIL_ENABLED=false ile açıkça kapatın."
            );
        }

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.ssl.trust", host);
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");
        props.put("mail.debug", "false");

        log.info("JavaMailSender yapılandırıldı: host={}, port={}", host, port);
        return mailSender;
    }

    /**
     * SMTP yapılandırılmadığında kullanılan NoOp sender.
     * Tüm send() çağrıları sessizce göz ardı edilir.
     */
    private JavaMailSender createNoOpMailSender() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(org.springframework.mail.SimpleMailMessage simpleMessage) {
                log.info("[NO-OP MAIL] Kime={}, Konu={}", simpleMessage.getTo(), simpleMessage.getSubject());
            }
            @Override
            public void send(org.springframework.mail.SimpleMailMessage... simpleMessages) {
                for (var m : simpleMessages) send(m);
            }
            @Override
            public void send(jakarta.mail.internet.MimeMessage mimeMessage) {
                log.info("[NO-OP MAIL] MimeMessage gönderimi atlandı (mail devre dışı)");
            }
            @Override
            public void send(jakarta.mail.internet.MimeMessage... mimeMessages) {
                for (var m : mimeMessages) send(m);
            }
        };
    }
}
