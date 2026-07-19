package com.autismsupport.platform.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

@Component
public class EncryptionKeyProvider {
    private final String configuredKey;
    private final String previousKeys;
    private static volatile byte[] key;
    private static volatile List<byte[]> decryptionKeys = List.of();

    public EncryptionKeyProvider(@Value("${app.encryption.secret-key}") String configuredKey,
                                 @Value("${app.encryption.previous-keys:}") String previousKeys) {
        this.configuredKey = configuredKey;
        this.previousKeys = previousKeys;
    }

    @PostConstruct
    void initialize() {
        try {
            key = MessageDigest.getInstance("SHA-256")
                    .digest(configuredKey.getBytes(StandardCharsets.UTF_8));
            List<byte[]> allKeys = new ArrayList<>();
            allKeys.add(key);
            for (String previous : previousKeys.split(",")) {
                if (!previous.isBlank()) allKeys.add(MessageDigest.getInstance("SHA-256")
                        .digest(previous.trim().getBytes(StandardCharsets.UTF_8)));
            }
            decryptionKeys = List.copyOf(allKeys);
        } catch (Exception e) {
            throw new IllegalStateException("Şifreleme anahtarı hazırlanamadı", e);
        }
    }

    public static byte[] key() {
        if (key == null) throw new IllegalStateException("Şifreleme anahtarı henüz hazır değil");
        return key.clone();
    }

    public static List<byte[]> decryptionKeys() {
        if (decryptionKeys.isEmpty()) throw new IllegalStateException("Şifreleme anahtarları henüz hazır değil");
        return decryptionKeys.stream().map(byte[]::clone).toList();
    }
}
