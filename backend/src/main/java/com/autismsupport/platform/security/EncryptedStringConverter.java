package com.autismsupport.platform.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import jakarta.persistence.PersistenceException;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    private static final String PREFIX = "enc:v1:";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public String convertToDatabaseColumn(String value) {
        if (value == null) return null;
        if (value.startsWith(PREFIX)) {
            String decrypted = convertToEntityAttribute(value);
            if (decrypted != null && !decrypted.startsWith(PREFIX)) {
                return value;
            }
        }
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(EncryptionKeyProvider.key(), "AES"),
                    new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (Exception e) {
            throw new PersistenceException("Hassas veri şifrelenemedi", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String value) {
        if (value == null || !value.startsWith(PREFIX)) return value; // eski düz metin kayıtlarla geçiş uyumu
        try {
            byte[] payload = Base64.getUrlDecoder().decode(value.substring(PREFIX.length()));
            if (payload.length < 29) throw new IllegalArgumentException("Şifreli veri biçimi geçersiz");
            byte[] iv = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            Exception lastFailure = null;
            for (byte[] candidateKey : EncryptionKeyProvider.decryptionKeys()) {
                try {
                    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(candidateKey, "AES"),
                            new GCMParameterSpec(128, iv));
                    return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
                } catch (Exception e) {
                    lastFailure = e;
                }
            }
            throw lastFailure == null ? new IllegalStateException("Şifre çözme anahtarı yok") : lastFailure;
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(EncryptedStringConverter.class)
                    .warn("Hassas veri çözülemedi: {}", e.getMessage());
            return null;
        }
    }
}
