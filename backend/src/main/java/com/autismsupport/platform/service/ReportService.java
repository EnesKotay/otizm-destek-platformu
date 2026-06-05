package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ReportDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.Report;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ReportRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportDto createReport(ReportDto dto, UUID userId) {
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(userId, dto.getTargetType(), dto.getTargetId())) {
            throw new RuntimeException("Bu içeriği zaten şikayet ettiniz");
        }
        User reporter = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        Report report = Report.builder()
                .reporter(reporter)
                .targetType(dto.getTargetType())
                .targetId(dto.getTargetId())
                .reason(dto.getReason())
                .build();
        return toDto(reportRepository.save(report));
    }

    public Page<ReportDto> getAllReports(Pageable pageable) {
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    public Page<ReportDto> getReportsByStatus(String status, Pageable pageable) {
        return reportRepository.findByStatusOrderByCreatedAtDesc(status, pageable).map(this::toDto);
    }

    @Transactional
    public ReportDto updateStatus(UUID id, String status, String adminNote) {
        Report report = reportRepository.findById(id).orElseThrow(() -> new RuntimeException("Şikayet bulunamadı"));
        report.setStatus(status);
        report.setAdminNote(adminNote);
        return toDto(reportRepository.save(report));
    }

    private ReportDto toDto(Report r) {
        UserDto reporterDto = UserDto.builder()
                .id(r.getReporter().getId())
                .fullName(r.getReporter().getFullName())
                .build();
        return ReportDto.builder()
                .id(r.getId())
                .targetType(r.getTargetType())
                .targetId(r.getTargetId())
                .reason(r.getReason())
                .status(r.getStatus())
                .adminNote(r.getAdminNote())
                .createdAt(r.getCreatedAt())
                .reporter(reporterDto)
                .build();
    }
}
