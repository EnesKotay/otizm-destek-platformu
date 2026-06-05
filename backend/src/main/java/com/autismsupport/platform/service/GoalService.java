package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Goal;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.GoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autismsupport.platform.dto.GoalRequest;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final ObjectMapper objectMapper;

    private final GoalRepository repository;
    private final ChildRepository childRepository;

    @Transactional(readOnly = true)
    public List<Goal> getGoals(UUID childId, UUID userId) {
        validateOwnership(childId, userId);
        return repository.findByChildIdAndUserIdOrderByCreatedAtDesc(childId, userId);
    }

    @Transactional
    public Goal createGoal(UUID childId, UUID userId, GoalRequest dto) {
        validateOwnership(childId, userId);
        Goal goal = Goal.builder()
                .childId(childId)
                .userId(userId)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .targetCount(dto.getTargetCount() != null ? dto.getTargetCount() : 10)
                .tokenColor(dto.getTokenColor() != null ? dto.getTokenColor() : "#6366f1")
                .tokenEmoji(dto.getTokenEmoji() != null ? dto.getTokenEmoji() : "\u2B50")
                .rewardTitle(dto.getRewardTitle())
                .rewardDescription(dto.getRewardDescription())
                .active(true)
                .entries("[]")
                .build();
        return repository.save(goal);
    }

    @Transactional
    public Goal updateGoal(UUID goalId, UUID userId, GoalRequest dto) {
        Goal goal = repository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Hedef bulunamadi"));
        if (!goal.getUserId().equals(userId)) throw new RuntimeException("Yetkiniz yok");
        if (dto.getTitle() != null) goal.setTitle(dto.getTitle());
        if (dto.getDescription() != null) goal.setDescription(dto.getDescription());
        if (dto.getCategory() != null) goal.setCategory(dto.getCategory());
        if (dto.getTargetCount() != null) goal.setTargetCount(dto.getTargetCount());
        if (dto.getTokenColor() != null) goal.setTokenColor(dto.getTokenColor());
        if (dto.getTokenEmoji() != null) goal.setTokenEmoji(dto.getTokenEmoji());
        if (dto.getRewardTitle() != null) goal.setRewardTitle(dto.getRewardTitle());
        if (dto.getRewardDescription() != null) goal.setRewardDescription(dto.getRewardDescription());
        if (dto.getActive() != null) goal.setActive(dto.getActive());
        if (dto.getEntries() != null) {
            try {
                goal.setEntries(objectMapper.writeValueAsString(dto.getEntries()));
            } catch (Exception e) {
                goal.setEntries(dto.getEntries().toString());
            }
        }
        return repository.save(goal);
    }

    @Transactional
    public void deleteGoal(UUID goalId, UUID userId) {
        Goal goal = repository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Hedef bulunamadi"));
        if (!goal.getUserId().equals(userId)) throw new RuntimeException("Yetkiniz yok");
        repository.delete(goal);
    }

    private void validateOwnership(UUID childId, UUID userId) {
        if (!childRepository.existsByIdAndParentId(childId, userId)) {
            throw new SecurityException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }


}
