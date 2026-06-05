package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.TreatmentStateDto;
import com.autismsupport.platform.model.TreatmentState;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.TreatmentStateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TreatmentStateService {

    private final TreatmentStateRepository treatmentStateRepository;
    private final ChildRepository childRepository;

    private static final Map<String, Object> DEFAULT_SENSORY_PROFILE = Map.of(
            "sound", 76,
            "touch", 54,
            "visual", 68
    );

    @Transactional(readOnly = true)
    public TreatmentStateDto get(UUID childId, UUID userId) {
        validateOwnership(childId, userId);
        return treatmentStateRepository.findByChildId(childId)
                .map(this::toDto)
                .orElseGet(this::emptyDto);
    }

    @Transactional
    public TreatmentStateDto save(UUID childId, TreatmentStateDto dto, UUID userId) {
        validateOwnership(childId, userId);
        TreatmentState state = treatmentStateRepository.findByChildId(childId)
                .orElseGet(() -> TreatmentState.builder().childId(childId).build());

        state.setGameFeedback(dto.getGameFeedback() != null ? dto.getGameFeedback() : new HashMap<>());
        state.setCustomGoals(dto.getCustomGoals() != null ? dto.getCustomGoals() : new ArrayList<>());
        state.setSensoryProfile(dto.getSensoryProfile() != null ? dto.getSensoryProfile() : new HashMap<>(DEFAULT_SENSORY_PROFILE));
        state.setGameSessions(dto.getGameSessions() != null ? dto.getGameSessions() : new ArrayList<>());
        state.setGoalProgressHistory(dto.getGoalProgressHistory() != null ? dto.getGoalProgressHistory() : new ArrayList<>());

        return toDto(treatmentStateRepository.save(state));
    }

    private TreatmentStateDto toDto(TreatmentState state) {
        return new TreatmentStateDto(
                state.getGameFeedback() != null ? state.getGameFeedback() : new HashMap<>(),
                state.getCustomGoals() != null ? state.getCustomGoals() : new ArrayList<>(),
                state.getSensoryProfile() != null ? state.getSensoryProfile() : new HashMap<>(DEFAULT_SENSORY_PROFILE),
                state.getGameSessions() != null ? state.getGameSessions() : new ArrayList<>(),
                state.getGoalProgressHistory() != null ? state.getGoalProgressHistory() : new ArrayList<>()
        );
    }

    private void validateOwnership(UUID childId, UUID userId) {
        if (!childRepository.existsByIdAndParentId(childId, userId)) {
            throw new SecurityException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    private TreatmentStateDto emptyDto() {
        return new TreatmentStateDto(
                new HashMap<>(),
                new ArrayList<>(),
                new HashMap<>(DEFAULT_SENSORY_PROFILE),
                new ArrayList<>(),
                new ArrayList<>()
        );
    }
}
