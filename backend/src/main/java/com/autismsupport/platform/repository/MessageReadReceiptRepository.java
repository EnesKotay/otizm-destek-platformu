package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Message;
import com.autismsupport.platform.model.MessageReadReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MessageReadReceiptRepository extends JpaRepository<MessageReadReceipt, UUID> {

    boolean existsByMessageIdAndUserId(UUID messageId, UUID userId);

    long countByMessageIdAndUserIdNot(UUID messageId, UUID senderId);

    @Query("""
            SELECT COUNT(m) FROM Message m
            JOIN m.conversation c
            JOIN c.participants p
            WHERE c.id = :conversationId
              AND p.id = :userId
              AND m.sender.id <> :userId
              AND NOT EXISTS (
                  SELECT r.id FROM MessageReadReceipt r
                  WHERE r.message = m AND r.user.id = :userId
              )
            """)
    long countUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(m) FROM Message m
            JOIN m.conversation c
            JOIN c.participants p
            WHERE p.id = :userId
              AND :userId NOT MEMBER OF c.archivedBy
              AND m.sender.id <> :userId
              AND NOT EXISTS (
                  SELECT r.id FROM MessageReadReceipt r
                  WHERE r.message = m AND r.user.id = :userId
              )
            """)
    long countTotalUnreadMessages(@Param("userId") UUID userId);

    @Query("""
            SELECT m FROM Message m
            JOIN m.conversation c
            JOIN c.participants p
            WHERE c.id = :conversationId
              AND p.id = :userId
              AND m.sender.id <> :userId
              AND NOT EXISTS (
                  SELECT r.id FROM MessageReadReceipt r
                  WHERE r.message = m AND r.user.id = :userId
              )
            """)
    List<Message> findUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
}
