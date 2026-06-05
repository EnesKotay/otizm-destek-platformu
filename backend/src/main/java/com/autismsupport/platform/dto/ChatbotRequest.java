package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ChatbotRequest {

    @NotBlank(message = "Mesaj bos olamaz")
    @Size(max = 2000, message = "Mesaj 2000 karakterden uzun olamaz")
    private String message;

    private List<ConversationTurn> history;

    /** Kullanicinin su an bulundugu sayfa yolu (or. "/takvim", "/kriz-rehberi") */
    private String pagePath;

    @Data
    public static class ConversationTurn {
        private String role; // "user" | "model"
        private String text;
    }
}
