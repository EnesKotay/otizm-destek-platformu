package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    void deleteByUserId(UUID userId);
}
