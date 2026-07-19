package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    boolean existsByIdAndParticipantsId(UUID id, UUID participantId);

    // Eski — hâlâ kullanılabilir ama participant lazy-load içerir
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p.id = :userId ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findByParticipantId(@Param("userId") UUID userId);

    // Performanslı versiyon: participants tek sorguda çekilir (N+1 önlenir)
    @Query("SELECT DISTINCT c FROM Conversation c JOIN FETCH c.participants JOIN c.participants p WHERE p.id = :userId ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findByParticipantIdWithParticipants(@Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
           "WHERE c.type = 'DIRECT' AND p1.id = :user1Id AND p2.id = :user2Id")
    List<Conversation> findDirectConversations(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
           "WHERE c.type = 'DIRECT' AND p1.id = :user1Id AND p2.id = :user2Id")
    java.util.Optional<Conversation> findDirectConversation(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    @Query("SELECT DISTINCT c FROM Conversation c JOIN FETCH c.participants JOIN c.participants p " +
           "WHERE p.id = :userId " +
           "AND (:archived IS NULL OR " +
           "     (:archived = true AND :userId MEMBER OF c.archivedBy) OR " +
           "     (:archived = false AND :userId NOT MEMBER OF c.archivedBy)) " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findUserConversations(@Param("userId") UUID userId, @Param("archived") Boolean archived);

    @Query("SELECT DISTINCT c FROM Conversation c JOIN FETCH c.participants JOIN c.participants p " +
           "WHERE p.id = :userId " +
           "AND (:archived IS NULL OR " +
           "     (:archived = true AND :userId MEMBER OF c.archivedBy) OR " +
           "     (:archived = false AND :userId NOT MEMBER OF c.archivedBy)) " +
           "AND (LOWER(COALESCE(c.title, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR EXISTS (SELECT 1 FROM c.participants p2 WHERE LOWER(COALESCE(p2.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')) AND p2.id != :userId)) " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> searchConversations(@Param("userId") UUID userId, @Param("search") String search, @Param("archived") Boolean archived);
}
