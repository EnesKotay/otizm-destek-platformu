package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    Page<Message> findByConversationIdOrderBySentAtDesc(UUID conversationId, Pageable pageable);

    Page<Message> findByConversationIdAndContentContainingIgnoreCaseOrderBySentAtDesc(UUID conversationId, String query, Pageable pageable);

    java.util.Optional<Message> findFirstByConversationIdOrderBySentAtDesc(UUID conversationId);

    @Modifying
    @Query("UPDATE Message m SET m.read = true WHERE m.conversation.id = :convId AND m.sender.id != :userId AND m.read = false")
    void markAsRead(@Param("convId") UUID conversationId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM Message m JOIN m.conversation c JOIN c.participants p " +
           "WHERE p.id = :userId AND m.sender.id != :userId AND m.read = false")
    long countTotalUnreadMessages(@Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :convId AND m.sender.id != :userId AND m.read = false")
    long countUnreadMessages(@Param("convId") UUID conversationId, @Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM Message m WHERE m.conversation.id = :convId")
    void deleteByConversationId(@Param("convId") UUID conversationId);
}
