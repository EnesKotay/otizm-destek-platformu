package com.autismsupport.platform.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import jakarta.persistence.PersistenceException;

import java.util.List;
import java.util.Map;

@Converter
public class EncryptedGoalsConverter implements AttributeConverter<List<Map<String, Object>>, String> {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final EncryptedStringConverter crypto = new EncryptedStringConverter();

    public String convertToDatabaseColumn(List<Map<String, Object>> value) {
        if (value == null) return null;
        try { return crypto.convertToDatabaseColumn(JSON.writeValueAsString(value)); }
        catch (Exception e) { throw new PersistenceException("BEP hedefleri şifrelenemedi", e); }
    }

    public List<Map<String, Object>> convertToEntityAttribute(String value) {
        if (value == null) return null;
        try { return JSON.readValue(crypto.convertToEntityAttribute(value), new TypeReference<>() {}); }
        catch (Exception e) { throw new PersistenceException("BEP hedefleri çözülemedi", e); }
    }
}
