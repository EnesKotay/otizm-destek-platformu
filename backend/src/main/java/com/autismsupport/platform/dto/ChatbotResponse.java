package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatbotResponse {
    private String reply;
    private boolean success;
    private String error;

    public static ChatbotResponse success(String reply) {
        return new ChatbotResponse(reply, true, null);
    }

    public static ChatbotResponse error(String error) {
        return new ChatbotResponse(null, false, error);
    }
}
