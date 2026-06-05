package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ScreeningResultDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.ScreeningResult;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ScreeningResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScreeningResultService {

    private final ScreeningResultRepository screeningResultRepository;
    private final ChildRepository childRepository;
    private final ClinicalDataShareService clinicalDataShareService;

    public List<ScreeningResultDto> getResultsByChild(UUID childId, UUID parentId) {
        childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));

        // Enforce parent OR active medical data share permission
        if (!clinicalDataShareService.verifyAccess(parentId, childId, "screening")) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
        return screeningResultRepository.findByChildIdOrderByCreatedAtDesc(childId)
                .stream().map(this::toDto).toList();
    }

    public List<ScreeningResultDto> getAllResultsByParent(UUID parentId) {
        return screeningResultRepository.findByChildParentIdOrderByCreatedAtDesc(parentId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ScreeningResultDto saveResult(ScreeningResultDto dto, UUID parentId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        if (!child.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }

        ScreeningResult result = ScreeningResult.builder()
                .child(child)
                .testType(dto.getTestType())
                .score(dto.getScore())
                .riskLevel(dto.getRiskLevel())
                .answers(dto.getAnswers())
                .build();

        result = screeningResultRepository.save(result);
        return toDto(result);
    }

    @Transactional
    public void deleteResult(UUID resultId, UUID parentId) {
        ScreeningResult result = screeningResultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarama sonucu bulunamadı"));
        if (!result.getChild().getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu sonuca erişim yetkiniz yok");
        }
        screeningResultRepository.delete(result);
    }

    private ScreeningResultDto toDto(ScreeningResult r) {
        return ScreeningResultDto.builder()
                .id(r.getId())
                .childId(r.getChild().getId())
                .childName(r.getChild().getName())
                .testType(r.getTestType())
                .score(r.getScore())
                .riskLevel(r.getRiskLevel())
                .answers(r.getAnswers())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
