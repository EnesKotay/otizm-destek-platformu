package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;

/**
 * E-posta gönderim servisi.
 * Thymeleaf HTML şablonları ile MimeMessage kullanır.
 * MAIL_ENABLED=false veya SMTP yapılandırılmamışsa MailConfig'teki NoOp sender devreye girer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username:noreply@otizmdestek.com}")
    private String fromEmail;

    @Value("${app.mail.from-name:Otizm Destek Platformu}")
    private String fromName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // ─────────────────────────────────────────────
    //  Core — HTML e-posta gönderimi
    // ─────────────────────────────────────────────

    /**
     * Thymeleaf şablonunu render edip HTML e-posta olarak gönderir.
     * Tüm public metodlar bu private metodu çağırır.
     *
     * @param to           Alıcı e-posta
     * @param subject      E-posta konusu
     * @param templateName templates/email/ altındaki şablon dosya adı (.html olmadan)
     * @param variables    Şablona geçirilecek değişkenler
     */
    private void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            // Şablona her zaman frontendUrl ekle.
            // Not: Çağıranlar Map.of(...) (immutable) gönderebildiği için değiştirilebilir bir kopya kullanıyoruz.
            Map<String, Object> vars = new java.util.HashMap<>(variables);
            vars.put("frontendUrl", frontendUrl);

            Context ctx = new Context();
            ctx.setVariables(vars);

            String htmlContent = templateEngine.process("email/" + templateName, ctx);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(mimeMessage);
            log.info("E-posta gönderildi: konu='{}', şablon='{}'", subject, templateName);

        } catch (Exception e) {
            log.error("E-posta gönderilemedi: konu='{}', şablon='{}'", subject, templateName, e);
        }
    }

    // ─────────────────────────────────────────────
    //  Şifre Sıfırlama
    // ─────────────────────────────────────────────

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetUrl = frontendUrl + "/sifre-sifirla?token=" + token;
        sendHtmlEmail(
                toEmail,
                "🔑 Şifre Sıfırlama Talebi — Otizm Destek Platformu",
                "password-reset",
                Map.of(
                        "resetUrl", resetUrl,
                        "name", extractNameFromEmail(toEmail)
                )
        );
    }

    // ─────────────────────────────────────────────
    //  E-posta Doğrulama
    // ─────────────────────────────────────────────

    @Async
    public void sendEmailVerification(String toEmail, String token) {
        String verificationUrl = frontendUrl + "/eposta-dogrula?token=" + token;
        sendHtmlEmail(
                toEmail,
                "✉️ E-posta Adresinizi Doğrulayın — Otizm Destek Platformu",
                "email-verification",
                Map.of(
                        "verificationUrl", verificationUrl,
                        "name", extractNameFromEmail(toEmail)
                )
        );
    }

    // ─────────────────────────────────────────────
    //  Uzman Onay / Red
    // ─────────────────────────────────────────────

    @Async
    public void sendExpertApprovalEmail(String toEmail, String name) {
        sendHtmlEmail(
                toEmail,
                "🎉 Uzman Başvurunuz Onaylandı — Otizm Destek Platformu",
                "expert-approval",
                Map.of("name", name)
        );
    }

    @Async
    public void sendExpertRejectionEmail(String toEmail, String name) {
        sendHtmlEmail(
                toEmail,
                "📋 Uzman Başvurunuz Hakkında — Otizm Destek Platformu",
                "expert-rejection",
                Map.of("name", name)
        );
    }

    // ─────────────────────────────────────────────
    //  Randevu Hatırlatması
    // ─────────────────────────────────────────────

    @Async
    public void sendAppointmentReminderEmail(String toEmail, String title, String body) {
        sendHtmlEmail(
                toEmail,
                "📅 Randevu Hatırlatması: " + title + " — Otizm Destek Platformu",
                "appointment-reminder",
                Map.of(
                        "appointmentTitle", title,
                        "appointmentBody", body != null ? body : "",
                        "name", extractNameFromEmail(toEmail)
                )
        );
    }

    /**
     * Randevu hatırlatması — tarih/saat/uzman detayları ile.
     */
    @Async
    public void sendAppointmentReminderEmail(String toEmail, String name, String title, String body,
                                              String date, String time, String location, String expertName) {
        java.util.Map<String, Object> vars = new java.util.HashMap<>();
        vars.put("name", name != null ? name : extractNameFromEmail(toEmail));
        vars.put("appointmentTitle", title);
        vars.put("appointmentBody", body != null ? body : "");
        if (date != null) vars.put("appointmentDate", date);
        if (time != null) vars.put("appointmentTime", time);
        if (location != null) vars.put("appointmentLocation", location);
        if (expertName != null) vars.put("appointmentExpert", expertName);

        sendHtmlEmail(
                toEmail,
                "📅 Randevu Hatırlatması: " + title + " — Otizm Destek Platformu",
                "appointment-reminder",
                vars
        );
    }

    // ─────────────────────────────────────────────
    //  Platform Bildirimi (Notification e-postası)
    // ─────────────────────────────────────────────

    @Async
    public void sendNotificationEmail(String toEmail, String recipientName,
                                       String notificationType, String title,
                                       String body, String link) {
        java.util.Map<String, Object> vars = new java.util.HashMap<>();
        vars.put("name", recipientName != null ? recipientName : extractNameFromEmail(toEmail));
        vars.put("notificationType", formatNotificationType(notificationType));
        vars.put("notificationTitle", title);
        vars.put("notificationBody", body != null ? body : "");
        if (link != null) vars.put("notificationLink", link);

        sendHtmlEmail(
                toEmail,
                "🔔 " + title + " — Otizm Destek Platformu",
                "notification",
                vars
        );
    }

    // ─────────────────────────────────────────────
    //  Yardımcı metodlar
    // ─────────────────────────────────────────────

    /** E-posta adresinden kısa isim üret (@ öncesi, ilk karakter büyük). */
    private String extractNameFromEmail(String email) {
        if (email == null) return "Değerli Kullanıcı";
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        return local.length() > 0
                ? Character.toUpperCase(local.charAt(0)) + local.substring(1).replace(".", " ")
                : "Değerli Kullanıcı";
    }

    /** Bildirim tipini okunabilir Türkçe'ye çevirir. */
    private String formatNotificationType(String type) {
        if (type == null) return "BİLDİRİM";
        return switch (type.toUpperCase()) {
            case "APPOINTMENT", "APPOINTMENT_REMINDER" -> "📅 RANDEVU";
            case "MESSAGE" -> "💬 MESAJ";
            case "FORUM" -> "🗣️ FORUM";
            case "EXPERT_APPROVAL" -> "✅ UZMAN ONAYI";
            case "BUDDY_REQUEST" -> "🤝 ARKADAŞLIK İSTEĞİ";
            case "SYSTEM" -> "⚙️ SİSTEM";
            default -> type.replace("_", " ").toUpperCase();
        };
    }
}
