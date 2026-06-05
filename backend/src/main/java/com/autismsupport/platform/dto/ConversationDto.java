package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationDto {
    private UUID id;
    private String type;
    private String title;
    private List<UserDto> participants;
    private MessageDto lastMessage;
    private long unreadCount;
    private LocalDateTime lastMessageAt;
    private boolean muted;
    private boolean archived;
    private LocalDateTime createdAt;
}
