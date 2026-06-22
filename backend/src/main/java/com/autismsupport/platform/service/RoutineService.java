package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.RoutineDto;
import com.autismsupport.platform.dto.RoutineItemDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Routine;
import com.autismsupport.platform.model.RoutineItem;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.RoutineItemRepository;
import com.autismsupport.platform.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final RoutineItemRepository routineItemRepository;
    private final ChildRepository childRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional(readOnly = true)
    public List<RoutineDto> getActiveRoutinesForChild(UUID childId, UUID userId) {
        validateChildOwnership(childId, userId);
        return routineRepository.findByChildIdAndIsActiveTrueWithItems(childId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoutineDto createRoutine(RoutineDto dto, UUID userId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));
        validateChildOwnership(child.getId(), userId);

        Routine routine = Routine.builder()
                .child(child)
                .name(dto.getName())
                .description(dto.getDescription())
                .isActive(true)
                .build();

        routine = routineRepository.save(routine);
        return mapToDto(routine);
    }

    @Transactional
    public RoutineItemDto addRoutineItem(UUID routineId, RoutineItemDto dto, UUID userId) {
        Routine routine = getOwnedRoutine(routineId, userId);

        LocalTime scheduledTime = null;
        if (dto.getScheduledTime() != null && !dto.getScheduledTime().isBlank()) {
            try {
                scheduledTime = LocalTime.parse(dto.getScheduledTime(), TIME_FORMATTER);
            } catch (Exception e) {
                // Gecersiz format ise null birak
            }
        }

        RoutineItem item = RoutineItem.builder()
                .routine(routine)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .scheduledTime(scheduledTime)
                .iconName(dto.getIconName())
                .build();

        item = routineItemRepository.save(item);
        return mapItemToDto(item);
    }

    @Transactional
    public void deleteRoutine(UUID routineId, UUID userId) {
        Routine routine = getOwnedRoutine(routineId, userId);
        routineRepository.delete(routine);
    }

    @Transactional
    public void deleteRoutineItem(UUID routineId, UUID itemId, UUID userId) {
        Routine routine = getOwnedRoutine(routineId, userId);
        RoutineItem item = routineItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Rutin adimi bulunamadi"));
        if (item.getRoutine() == null || !routine.getId().equals(item.getRoutine().getId())) {
            throw new UnauthorizedException("Bu rutin adimina erisim yetkiniz yok");
        }
        routineItemRepository.delete(item);
    }

    private Routine getOwnedRoutine(UUID routineId, UUID userId) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new ResourceNotFoundException("Rutin bulunamadi"));
        validateChildOwnership(routine.getChild().getId(), userId);
        return routine;
    }

    private void validateChildOwnership(UUID childId, UUID userId) {
        if (!childRepository.existsByIdAndParentId(childId, userId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    private RoutineDto mapToDto(Routine routine) {
        return RoutineDto.builder()
                .id(routine.getId())
                .childId(routine.getChild().getId())
                .name(routine.getName())
                .description(routine.getDescription())
                .isActive(routine.isActive())
                .items(routine.getItems() != null ?
                        routine.getItems().stream()
                                .map(this::mapItemToDto)
                                .collect(Collectors.toList()) :
                        List.of())
                .createdAt(routine.getCreatedAt())
                .updatedAt(routine.getUpdatedAt())
                .build();
    }

    private RoutineItemDto mapItemToDto(RoutineItem item) {
        String timeStr = null;
        if (item.getScheduledTime() != null) {
            timeStr = item.getScheduledTime().format(TIME_FORMATTER);
        }
        return RoutineItemDto.builder()
                .id(item.getId())
                .routineId(item.getRoutine().getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .scheduledTime(timeStr)
                .iconName(item.getIconName())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
