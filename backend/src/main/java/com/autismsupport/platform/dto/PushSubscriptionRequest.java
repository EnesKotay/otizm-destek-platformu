package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class PushSubscriptionRequest {
    @NotBlank
    private String endpoint;

    private Map<String, String> keys;

    public String getP256dh() {
        return keys == null ? null : keys.get("p256dh");
    }

    public String getAuth() {
        return keys == null ? null : keys.get("auth");
    }
}
