package com.autismsupport.platform.service;

import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ExpertTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientAccessService {

    private static final List<String> EXPERT_ACCESS_STATUSES = List.of("CONFIRMED", "COMPLETED");

    private final ChildRepository childRepository;
    private final AppointmentRepository appointmentRepository;
    private final ExpertTaskRepository expertTaskRepository;

    public boolean canReadChild(UUID userId, String role, UUID childId) {
        if ("PARENT".equals(role)) {
            return childRepository.existsByIdAndParentId(childId, userId);
        }

        if ("EXPERT".equals(role)) {
            return appointmentRepository.existsByExpertIdAndChildIdAndStatusIn(userId, childId, EXPERT_ACCESS_STATUSES)
                    || expertTaskRepository.existsByExpertIdAndChildId(userId, childId);
        }

        return "ADMIN".equals(role);
    }
}
