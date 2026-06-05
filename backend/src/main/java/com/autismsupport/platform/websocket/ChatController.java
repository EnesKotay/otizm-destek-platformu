package com.autismsupport.platform.websocket;

import com.autismsupport.platform.dto.MessageDto;
import com.autismsupport.platform.security.JwtTokenProvider;
import com.autismsupport.platform.service.MessagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessagingService messagingService;
    private final JwtTokenProvider tokenProvider;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        UUID senderId = resolveSenderId(headerAccessor);

        if ("TYPING".equals(chatMessage.getType())) {
            messagingTemplate.convertAndSend(
                    "/topic/conversation/" + chatMessage.getConversationId() + "/typing",
                    senderId.toString()
            );
            return;
        }

        if ("READ".equals(chatMessage.getType())) {
            messagingService.markAsRead(chatMessage.getConversationId(), senderId);
            messagingTemplate.convertAndSend(
                    "/topic/conversation/" + chatMessage.getConversationId() + "/read",
                    senderId.toString()
            );
            return;
        }

        MessageDto savedMessage = messagingService.sendMessage(
                chatMessage.getConversationId(), senderId, chatMessage.getContent());
    }

    @MessageMapping("/chat/{conversationId}")
    public void sendConversationMessage(@DestinationVariable UUID conversationId,
                                        @Payload ChatMessage chatMessage,
                                        SimpMessageHeaderAccessor headerAccessor) {
        UUID senderId = resolveSenderId(headerAccessor);
        MessageDto savedMessage = messagingService.sendMessage(
                conversationId, senderId, chatMessage.getContent());
    }

    @MessageMapping("/chat/{conversationId}/typing")
    public void sendTyping(@DestinationVariable UUID conversationId,
                           SimpMessageHeaderAccessor headerAccessor) {
        UUID senderId = resolveSenderId(headerAccessor);
        messagingService.assertParticipant(conversationId, senderId);
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/typing",
                java.util.Map.of("senderId", senderId.toString())
        );
    }

    private UUID resolveSenderId(SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getSessionAttributes() != null) {
            Object userId = headerAccessor.getSessionAttributes().get("userId");
            if (userId instanceof String value && !value.isBlank()) {
                return UUID.fromString(value);
            }
            Object token = headerAccessor.getSessionAttributes().get("token");
            if (token instanceof String value && !value.isBlank()) {
                return tokenProvider.getUserIdFromToken(value);
            }
        }
        if (headerAccessor.getUser() != null && headerAccessor.getUser().getName() != null) {
            return UUID.fromString(headerAccessor.getUser().getName());
        }
        throw new RuntimeException("WebSocket kullanıcısı doğrulanamadı");
    }
}
