package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.Goal;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.GoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import com.autismsupport.platform.dto.GoalRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService service;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<Goal>>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getGoals(childId, p.getId())));
    }

    @PostMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<Goal>> create(@PathVariable UUID childId,
            @Valid @RequestBody GoalRequest dto, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success("Hedef olusturuldu", service.createGoal(childId, p.getId(), dto)));
    }

    @PutMapping("/{goalId}")
    public ResponseEntity<ApiResponse<Goal>> update(@PathVariable UUID goalId,
            @Valid @RequestBody GoalRequest dto, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.updateGoal(goalId, p.getId(), dto)));
    }

    @DeleteMapping("/{goalId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID goalId, @CurrentUser UserPrincipal p) {
        service.deleteGoal(goalId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Silindi", null));
    }
}
