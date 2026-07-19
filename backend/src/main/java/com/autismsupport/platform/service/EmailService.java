package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@autismsupport.com}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // NOT @Async — called only from @Async public methods below to avoid self-invocation proxy bypass
    private void sendEmail(String to, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
            log.info("Transactional email sent");
        } catch (Exception e) {
            log.error("Transactional email could not be sent; type={}", e.getClass().getSimpleName());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetUrl = frontendUrl + "/sifre-sifirla?token=" + token;
        String subject = "Sifre Sifirlama Talebi";
        String content = "Merhaba,\n\n"
                + "Hesabiniz icin sifre sifirlama talebinde bulundunuz. Sifrenizi sifirlamak icin lutfen asagidaki baglantiya tiklayin:\n\n"
                + resetUrl + "\n\n"
                + "Bu baglanti 1 saat boyunca gecerlidir. Talebi siz yapmadiysaniz lutfen bu e-postayi dikkate almayin.\n\n"
                + "Saygilarimizla,\n"
                + "Otizm Destek Platformu Ekibi";
        sendEmail(toEmail, subject, content);
    }

    @Async
    public void sendEmailVerification(String toEmail, String token) {
        String verificationUrl = frontendUrl + "/eposta-dogrula?token=" + token;
        sendEmail(toEmail, "E-posta Adresinizi Doğrulayın",
                "Merhaba,\n\nHesabınızı etkinleştirmek için aşağıdaki bağlantıyı 24 saat içinde açın:\n\n"
                        + verificationUrl + "\n\nBu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\n"
                        + "Otizm Destek Platformu Ekibi");
    }

    @Async
    public void sendExpertApprovalEmail(String toEmail, String name) {
        String subject = "Uzman Basvurunuz Onaylandi!";
        String content = "Merhaba " + name + ",\n\n"
                + "Otizm Destek Platformu'na yapmis oldugunuz uzmanlik basvurusu incelenmis ve onaylanmistir.\n\n"
                + "Artik platformda dogrulanmis uzman olarak gorunebilir, danisanlarinizla seanslar duzenleyebilir ve makaleler yayinlayabilirsiniz.\n\n"
                + "Saygilarimizla,\n"
                + "Otizm Destek Platformu Ekibi";
        sendEmail(toEmail, subject, content);
    }

    @Async
    public void sendExpertRejectionEmail(String toEmail, String name) {
        String subject = "Uzmanlik Basvurusu Hakkinda";
        String content = "Merhaba " + name + ",\n\n"
                + "Otizm Destek Platformu'na yapmis oldugunuz uzmanlik basvurusu maalesef su an icin onaylanamamistir.\n\n"
                + "Profil bilgilerinizi veya belgelerinizi guncelleyerek tekrar basvuruda bulunabilirsiniz.\n\n"
                + "Saygilarimizla,\n"
                + "Otizm Destek Platformu Ekibi";
        sendEmail(toEmail, subject, content);
    }

    @Async
    public void sendAppointmentReminderEmail(String toEmail, String title, String body) {
        String subject = "Randevu Hatirlatmasi - " + title;
        String content = "Merhaba,\n\n"
                + body + "\n\n"
                + "Randevu detaylarinizi goruntulemek veya guncellemek icin uygulamayi ziyaret edebilirsiniz.\n\n"
                + "Saygilarimizla,\n"
                + "Otizm Destek Platformu Ekibi";
        sendEmail(toEmail, subject, content);
    }
}
