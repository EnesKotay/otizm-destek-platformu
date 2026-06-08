package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.MilestoneDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Milestone;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final ChildRepository childRepository;

    public List<MilestoneDto> getMilestonesByChild(UUID childId, UUID parentId) {
        validateChildOwnership(childId, parentId);
        return milestoneRepository.findByChildIdOrderByAchievedDateDesc(childId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public MilestoneDto createMilestone(MilestoneDto dto, UUID parentId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);

        Milestone milestone = Milestone.builder()
                .child(child)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .achievedDate(dto.getAchievedDate() != null ? dto.getAchievedDate() : LocalDate.now())
                .build();

        milestone = milestoneRepository.save(milestone);
        return toDto(milestone);
    }

    @Transactional
    public void deleteMilestone(UUID milestoneId, UUID parentId) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone bulunamadı"));
        validateChildOwnership(milestone.getChild(), parentId);
        milestoneRepository.delete(milestone);
    }

    @Transactional
    public MilestoneDto updateMilestone(UUID id, MilestoneDto dto, UUID parentId) {
        Milestone milestone = milestoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone bulunamadı"));
        validateChildOwnership(milestone.getChild(), parentId);
        if (dto.getTitle() != null) milestone.setTitle(dto.getTitle());
        if (dto.getDescription() != null) milestone.setDescription(dto.getDescription());
        if (dto.getCategory() != null) milestone.setCategory(dto.getCategory());
        if (dto.getAchievedDate() != null) milestone.setAchievedDate(dto.getAchievedDate());
        return toDto(milestoneRepository.save(milestone));
    }

    private void validateChildOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);
    }

    private void validateChildOwnership(Child child, UUID parentId) {
        if (!child.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }

    private MilestoneDto toDto(Milestone milestone) {
        return MilestoneDto.builder()
                .id(milestone.getId())
                .title(milestone.getTitle())
                .description(milestone.getDescription())
                .category(milestone.getCategory())
                .achievedDate(milestone.getAchievedDate())
                .childId(milestone.getChild().getId())
                .createdAt(milestone.getCreatedAt())
                .build();
    }
}
