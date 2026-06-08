package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.Institution;
import com.autismsupport.platform.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionRepository repository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Institution>>> getAll(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String category) {

        List<Institution> result;
        if (city != null && !city.isBlank()) {
            result = repository.findByCityIgnoreCase(city);
        } else if (category != null && !category.isBlank()) {
            result = repository.findByCategory(category);
        } else {
            result = repository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
