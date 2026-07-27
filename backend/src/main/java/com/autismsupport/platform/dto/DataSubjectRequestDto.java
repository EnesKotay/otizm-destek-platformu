package com.autismsupport.platform.dto;

import com.autismsupport.platform.model.DataSubjectRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataSubjectRequestDto {
    private UUID id;
    private String requestType;
    private String status;
    private String contactEmail;
    private String description;
    private String response;
    private LocalDateTime dueAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private boolean overdue;

    public static DataSubjectRequestDto from(DataSubjectRequest request) {
        return DataSubjectRequestDto.builder()
                .id(request.getId())
                .requestType(request.getRequestType().name())
                .status(request.getStatus().name())
                .contactEmail(request.getContactEmail())
                .description(request.getDescription())
                .response(request.getResponse())
                .dueAt(request.getDueAt())
                .resolvedAt(request.getResolvedAt())
                .createdAt(request.getCreatedAt())
                .overdue(request.isOverdue())
                .build();
    }
}
