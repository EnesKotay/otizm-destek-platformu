package com.autismsupport.platform.service;

import com.autismsupport.platform.model.SensoryProfile;
import com.autismsupport.platform.repository.SensoryProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SensoryProfileService {

    private final SensoryProfileRepository repository;
    private final ClinicalDataShareService clinicalDataShareService;

    public String getProfile(UUID childId, UUID userId) {
        // Enforce parent OR active medical data share permission
        if (!clinicalDataShareService.verifyAccess(userId, childId, "sensory")) {
            throw new AccessDeniedException("Bu duyusal profil verisine erisim izniniz bulunmuyor.");
        }
        return repository.findByChildId(childId)
                .map(SensoryProfile::getDomains)
                .orElse(null);
    }

    @Transactional
    public void saveProfile(UUID childId, UUID userId, String domainsJson) {
        SensoryProfile profile = repository.findByChildIdAndUserId(childId, userId)
                .orElse(SensoryProfile.builder().childId(childId).userId(userId).build());
        profile.setDomains(domainsJson);
        repository.save(profile);
    }
}
