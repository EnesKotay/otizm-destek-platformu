package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.BepReportDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.BepReport;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.BepReportRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BepReportService {

    private final BepReportRepository bepReportRepository;
    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final PatientAccessService patientAccessService;

    @Transactional(readOnly = true)
    public List<BepReportDto> getByChild(UUID childId, UUID userId, String role) {
        validateReadAccess(childId, userId, role);
        return bepReportRepository.findByChildIdOrderBySharedAtDesc(childId).stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public BepReportDto create(BepReportDto dto, UUID userId, String role) {
        Child child = getChild(dto.getChildId());
        validateReadAccess(child.getId(), userId, role);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanici bulunamadi"));

        BepReport report = BepReport.builder()
                .child(child)
                .createdBy(user)
                .studentName(dto.getStudentName())
                .diagnosis(dto.getDiagnosis())
                .performance(dto.getPerformance())
                .goals(dto.getGoals())
                .schoolYear(dto.getSchoolYear())
                .build();

        return toDto(bepReportRepository.save(report));
    }

    @Transactional
    public void delete(UUID reportId, UUID userId) {
        BepReport report = bepReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("BEP raporu bulunamadi"));
        if (!report.getCreatedBy().getId().equals(userId)) {
            throw new UnauthorizedException("Bu raporu silme yetkiniz yok");
        }
        bepReportRepository.delete(report);
    }

    private Child getChild(UUID childId) {
        return childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));
    }

    private void validateReadAccess(UUID childId, UUID userId, String role) {
        getChild(childId);
        if (!patientAccessService.canReadChild(userId, role, childId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    private BepReportDto toDto(BepReport r) {
        return BepReportDto.builder()
                .id(r.getId())
                .childId(r.getChild().getId())
                .studentName(r.getStudentName())
                .diagnosis(r.getDiagnosis())
                .performance(r.getPerformance())
                .goals(r.getGoals())
                .schoolYear(r.getSchoolYear())
                .sharedAt(r.getSharedAt())
                .createdById(r.getCreatedBy().getId())
                .build();
    }
}
