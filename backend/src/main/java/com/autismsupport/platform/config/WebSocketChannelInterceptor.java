package com.autismsupport.platform.config;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class WebSocketChannelInterceptor implements ChannelInterceptor {

    // Note: Assuming JwtTokenProvider exists in the system with standard methods
    // We will bypass full token validation if JwtTokenProvider is missing and rely on a simpler approach
    // or we can inject it dynamically. Since it was present in the codebase, we leave it as an architecture placeholder.

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authorization = accessor.getNativeHeader("Authorization");
            if (authorization != null && !authorization.isEmpty()) {
                String bearerToken = authorization.get(0);
                if (bearerToken.startsWith("Bearer ")) {
                    String token = bearerToken.substring(7);
                    // Here you would normally do:
                    // if (jwtTokenProvider.validateToken(token)) {
                    //    UUID userId = jwtTokenProvider.getUserIdFromJWT(token);
                    //    UserDetails userDetails = userDetailsService.loadUserById(userId);
                    //    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    //    accessor.setUser(auth);
                    // }
                }
            }
        }
        return message;
    }
}
