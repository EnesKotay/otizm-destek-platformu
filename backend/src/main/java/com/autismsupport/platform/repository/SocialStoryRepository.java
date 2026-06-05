package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.SocialStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialStoryRepository extends JpaRepository<SocialStory, UUID> {

    @Query("SELECT s FROM SocialStory s JOIN FETCH s.author LEFT JOIN FETCH s.child WHERE s.author.id = :authorId ORDER BY s.createdAt DESC")
    List<SocialStory> findByAuthorIdWithDetails(@Param("authorId") UUID authorId);

    @Query("SELECT s FROM SocialStory s JOIN FETCH s.author LEFT JOIN FETCH s.child WHERE s.isPublic = true ORDER BY s.createdAt DESC")
    List<SocialStory> findPublicWithDetails();

    @Query("SELECT s FROM SocialStory s JOIN FETCH s.author LEFT JOIN FETCH s.child WHERE s.isPublic = true AND s.category = :category ORDER BY s.createdAt DESC")
    List<SocialStory> findPublicByCategoryWithDetails(@Param("category") String category);

    @Query("SELECT s FROM SocialStory s JOIN FETCH s.author LEFT JOIN FETCH s.child WHERE s.id = :id")
    Optional<SocialStory> findByIdWithDetails(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE SocialStory s SET s.viewCount = s.viewCount + 1 WHERE s.id = :id")
    void incrementViewCount(@Param("id") UUID id);
}
