package com.autismsupport.platform.service;

import com.autismsupport.platform.model.AuditLog;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(User user, String action, String resourceType, UUID resourceId, Map<String, Object> details) {
        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .build());
    }
}
