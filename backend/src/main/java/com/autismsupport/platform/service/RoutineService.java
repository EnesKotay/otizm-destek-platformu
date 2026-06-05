package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.RoutineDto;
import com.autismsupport.platform.dto.RoutineItemDto;
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
    public List<RoutineDto> getActiveRoutinesForChild(UUID childId) {
        return routineRepository.findByChildIdAndIsActiveTrueWithItems(childId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoutineDto createRoutine(RoutineDto dto) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new RuntimeException("Child not found"));

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
    public RoutineItemDto addRoutineItem(UUID routineId, RoutineItemDto dto) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new RuntimeException("Routine not found"));

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
    public void deleteRoutine(UUID routineId) {
        routineRepository.deleteById(routineId);
    }

    @Transactional
    public void deleteRoutineItem(UUID itemId) {
        routineItemRepository.deleteById(itemId);
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
