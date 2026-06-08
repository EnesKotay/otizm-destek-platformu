package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstitutionRepository extends JpaRepository<Institution, String> {
    List<Institution> findByCityIgnoreCase(String city);
    List<Institution> findByCategory(String category);
}
