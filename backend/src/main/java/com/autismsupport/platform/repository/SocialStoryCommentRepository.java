package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.SocialStoryComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SocialStoryCommentRepository extends JpaRepository<SocialStoryComment, UUID> {
    List<SocialStoryComment> findBySocialStoryIdOrderByCreatedAtAsc(UUID socialStoryId);
}
