package com.autismsupport.platform.dto;

import com.autismsupport.platform.model.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeviceTokenRequest {
    @NotBlank(message = "FCM token zorunludur")
    private String token;

    @NotNull(message = "Platform zorunludur")
    private DevicePlatform platform;
}
