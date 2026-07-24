package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SessionNotesRequest {
    @NotBlank(message = "Seans notu zorunludur")
    private String sessionNotes;
    private String sessionSummary;
    private String followUpRecommendations;
    private String followUpTask;
}
