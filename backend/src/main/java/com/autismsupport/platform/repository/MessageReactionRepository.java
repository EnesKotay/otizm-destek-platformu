package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {

    List<MessageReaction> findByMessageId(UUID messageId);

    @Query("SELECT r FROM MessageReaction r JOIN FETCH r.user WHERE r.message.id = :messageId")
    List<MessageReaction> findByMessageIdWithUser(@Param("messageId") UUID messageId);

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    boolean existsByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    @Transactional
    void deleteByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    @Query("SELECT r FROM MessageReaction r WHERE r.message.id IN :messageIds")
    List<MessageReaction> findByMessageIdIn(@Param("messageIds") List<UUID> messageIds);
}
