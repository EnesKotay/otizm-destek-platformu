package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuditLogDto {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private String userEmail;
    private String action;
    private String resourceType;
    private UUID resourceId;
    private String ipAddress;
    private Map<String, Object> details;
    private LocalDateTime createdAt;
}
