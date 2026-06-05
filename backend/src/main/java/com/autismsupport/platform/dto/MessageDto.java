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
public class MessageDto {
    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderProfileImage;
    private String content;
    private String messageType;
    private boolean read;
    private LocalDateTime sentAt;

    // Dosya ekleri
    private String fileUrl;
    private String fileName;
    private String fileType;

    // Reply (yanit) alanlari
    private UUID replyToId;
    private String replyToContent;
    private String replyToSenderName;
    private String replyToFileUrl;

    // Emoji reaksiyonlari
    private Map<String, ReactionSummaryDto> reactions;

    // Okundu bilgisi
    private java.util.List<UserDto> readBy;
}
