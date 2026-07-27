package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ConsentRecord;
import com.autismsupport.platform.model.ConsentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {

    List<ConsentRecord> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<ConsentRecord> findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(UUID userId, ConsentType consentType);
}
