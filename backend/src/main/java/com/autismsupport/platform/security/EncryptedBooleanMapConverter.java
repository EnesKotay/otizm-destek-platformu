package com.autismsupport.platform.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import jakarta.persistence.PersistenceException;

import java.util.Map;

@Converter
public class EncryptedBooleanMapConverter implements AttributeConverter<Map<String, Boolean>, String> {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final EncryptedStringConverter crypto = new EncryptedStringConverter();

    public String convertToDatabaseColumn(Map<String, Boolean> value) {
        if (value == null) return null;
        try { return crypto.convertToDatabaseColumn(JSON.writeValueAsString(value)); }
        catch (Exception e) { throw new PersistenceException("Tarama yanıtları şifrelenemedi", e); }
    }

    public Map<String, Boolean> convertToEntityAttribute(String value) {
        if (value == null) return null;
        try {
            String decrypted = crypto.convertToEntityAttribute(value);
            if (decrypted == null || decrypted.startsWith("enc:v1:")) return null;
            return JSON.readValue(decrypted, new TypeReference<>() {});
        } catch (Exception e) { return null; }
    }
}
