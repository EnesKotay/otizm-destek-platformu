package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.SearchResultDto;
import com.autismsupport.platform.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SearchResultDto>>> search(
            @RequestParam String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> tags) {
        return ResponseEntity.ok(ApiResponse.success(searchService.search(q, type, dateFrom, dateTo, category, tags)));
    }
}
