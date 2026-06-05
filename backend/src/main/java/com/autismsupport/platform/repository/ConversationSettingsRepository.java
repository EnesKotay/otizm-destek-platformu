package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ConversationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversationSettingsRepository extends JpaRepository<ConversationSettings, UUID> {
    Optional<ConversationSettings> findByConversationIdAndUserId(UUID conversationId, UUID userId);
}
