package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BulkUserStatusRequest {
    
    @NotEmpty(message = "Kullanici listesi bos olamaz")
    private List<UUID> userIds;
}
