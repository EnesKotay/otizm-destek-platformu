package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportDto {
    private UUID id;
    @NotBlank private String targetType;
    @NotNull private UUID targetId;
    @NotBlank private String reason;
    private String status;
    private String adminNote;
    private LocalDateTime createdAt;
    private UserDto reporter;
}
