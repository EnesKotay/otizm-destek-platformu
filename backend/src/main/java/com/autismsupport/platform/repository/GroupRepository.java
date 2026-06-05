package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Group;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByCategory(String category);

    @Query("SELECT g FROM Group g JOIN g.members m WHERE m.user.id = :userId")
    List<Group> findByMemberUserId(@Param("userId") UUID userId);

    @Query("SELECT g FROM Group g WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(g.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Group> searchGroups(@Param("query") String query);

    @Query("SELECT g FROM Group g WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(g.description) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Group> searchByQuery(@Param("q") String q, Pageable pageable);

    java.util.Optional<Group> findByConversationId(UUID conversationId);
}
