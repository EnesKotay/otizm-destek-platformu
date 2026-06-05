package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.RoutineDto;
import com.autismsupport.platform.dto.RoutineItemDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.RoutineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<RoutineDto>>> getActiveRoutinesForChild(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(routineService.getActiveRoutinesForChild(childId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoutineDto>> createRoutine(
            @RequestBody RoutineDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Rutin olusturuldu", routineService.createRoutine(dto)));
    }

    @DeleteMapping("/{routineId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoutine(
            @PathVariable UUID routineId, @CurrentUser UserPrincipal principal) {
        routineService.deleteRoutine(routineId);
        return ResponseEntity.ok(ApiResponse.success("Rutin silindi", null));
    }

    @PostMapping("/{routineId}/items")
    public ResponseEntity<ApiResponse<RoutineItemDto>> addRoutineItem(
            @PathVariable UUID routineId,
            @RequestBody RoutineItemDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Adim eklendi", routineService.addRoutineItem(routineId, dto)));
    }

    @DeleteMapping("/{routineId}/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoutineItem(
            @PathVariable UUID routineId,
            @PathVariable UUID itemId,
            @CurrentUser UserPrincipal principal) {
        routineService.deleteRoutineItem(itemId);
        return ResponseEntity.ok(ApiResponse.success("Adim silindi", null));
    }
}
