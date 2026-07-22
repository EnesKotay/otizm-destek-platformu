package com.autismsupport.platform.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EncryptedStringConverterTest {
    private final EncryptedStringConverter converter = new EncryptedStringConverter();

    @BeforeEach
    void initializeKey() {
        new EncryptionKeyProvider("unit-test-current-key-with-more-than-32-characters", "").initialize();
    }

    @Test
    void encryptsWithRandomIvAndDecrypts() {
        String first = converter.convertToDatabaseColumn("çok hassas sağlık verisi");
        String second = converter.convertToDatabaseColumn("çok hassas sağlık verisi");

        assertThat(first).startsWith("enc:v1:").isNotEqualTo(second);
        assertThat(converter.convertToEntityAttribute(first)).isEqualTo("çok hassas sağlık verisi");
    }

    @Test
    void readsLegacyPlaintextDuringMigration() {
        assertThat(converter.convertToEntityAttribute("eski düz metin")).isEqualTo("eski düz metin");
    }

    @Test
    void previousKeyCanDecryptAfterRotation() {
        String encrypted = converter.convertToDatabaseColumn("rotasyon testi");
        new EncryptionKeyProvider("new-current-key-with-more-than-32-characters",
                "unit-test-current-key-with-more-than-32-characters").initialize();
        assertThat(converter.convertToEntityAttribute(encrypted)).isEqualTo("rotasyon testi");
    }

    @Test
    void returnsNullWhenDecryptionFailsDueToKeyMismatch() {
        String encrypted = converter.convertToDatabaseColumn("gizli veri");
        new EncryptionKeyProvider("completely-different-key-32-characters-long", "").initialize();
        assertThat(converter.convertToEntityAttribute(encrypted)).isNull();
    }
}
