package com.autismsupport.platform.websocket;

import com.autismsupport.platform.dto.NotificationDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;

/**
 * WebSocket controller for real-time notification delivery.
 * Clients subscribe to /user/queue/notifications to receive their personal notifications.
 * Clients send to /app/notifications/ping to request a refresh.
 */
@Controller
@RequiredArgsConstructor
public class NotificationWsController {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    /**
     * Called when the client sends a ping to request fresh notifications.
     * Responds on the user's personal queue.
     */
    @MessageMapping("/notifications/ping")
    public void handlePing(Principal principal) {
        if (principal == null) return;
        try {
            List<NotificationDto> recent = notificationService.getLatest(
                    java.util.UUID.fromString(principal.getName()));
            messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/notifications",
                    recent
            );
        } catch (Exception ignored) {
            // Principal name might not be UUID on anonymous WS connect
        }
    }
}
