package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StoredFileRepository extends JpaRepository<StoredFile, String> {
    List<StoredFile> findAllByOwnerId(UUID ownerId);
}
