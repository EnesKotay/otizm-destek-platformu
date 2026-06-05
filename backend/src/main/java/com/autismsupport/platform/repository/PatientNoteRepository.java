package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.PatientNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PatientNoteRepository extends JpaRepository<PatientNote, UUID> {

    @Query("SELECT n FROM PatientNote n LEFT JOIN FETCH n.parent LEFT JOIN FETCH n.child WHERE n.expert.id = :expertId AND n.parent.id = :parentId ORDER BY n.noteDate DESC, n.createdAt DESC")
    List<PatientNote> findByExpertIdAndParentId(@Param("expertId") UUID expertId, @Param("parentId") UUID parentId);
}
