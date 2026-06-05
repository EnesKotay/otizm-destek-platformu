package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findByCategory(String category);
    List<Tag> findAllByOrderByCategoryAscNameAsc();
    Set<Tag> findByIdIn(Set<UUID> ids);
}
