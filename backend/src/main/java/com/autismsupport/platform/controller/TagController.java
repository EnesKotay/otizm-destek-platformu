package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.TagDto;
import com.autismsupport.platform.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagDto>>> getAllTags() {
        return ResponseEntity.ok(
                ApiResponse.<List<TagDto>>builder()
                        .success(true)
                        .data(tagService.getAllTags())
                        .build()
        );
    }

    @GetMapping("/grouped")
    public ResponseEntity<ApiResponse<Map<String, List<TagDto>>>> getTagsByCategory() {
        return ResponseEntity.ok(
                ApiResponse.<Map<String, List<TagDto>>>builder()
                        .success(true)
                        .data(tagService.getTagsByCategory())
                        .build()
        );
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<TagDto>>> getTagsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(
                ApiResponse.<List<TagDto>>builder()
                        .success(true)
                        .data(tagService.getTagsByCategory(category))
                        .build()
        );
    }
}
