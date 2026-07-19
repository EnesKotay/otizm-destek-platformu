package com.autismsupport.platform.security;

import com.autismsupport.platform.service.PlatformSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class MaintenanceModeFilter extends OncePerRequestFilter {
    private final PlatformSettingsService settingsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!settingsService.isMaintenanceMode() || isAllowedDuringMaintenance(request)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"success\":false,\"message\":\"Sistem bakım modunda. Lütfen daha sonra tekrar deneyin.\"}");
    }

    private boolean isAllowedDuringMaintenance(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/actuator/health") || path.startsWith("/api/auth/") || path.startsWith("/api/admin/")) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
