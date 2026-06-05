package com.autismsupport.platform.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatMessage {
    private UUID conversationId;
    private String content;
    private String type; // TEXT, IMAGE, TYPING, READ
}
