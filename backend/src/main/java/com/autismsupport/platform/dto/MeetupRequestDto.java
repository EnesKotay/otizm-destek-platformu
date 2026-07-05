package com.autismsupport.platform.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MeetupRequestDto {
    private UUID id;
    private UUID requesterId;
    private String requesterName;
    @NotNull private UUID recipientId;
    private String recipientName;
    @NotBlank private String type;
    @NotNull private LocalDate proposedDate;
    @NotBlank private String proposedTime;
    private String location;
    private String message;
    private String status;
}
