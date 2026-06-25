package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.MedicationDto;
import com.autismsupport.platform.dto.MedicationLogDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Medication;
import com.autismsupport.platform.model.MedicationLog;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.MedicationLogRepository;
import com.autismsupport.platform.repository.MedicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
    private final ChildRepository childRepository;
    private final ClinicalDataShareService clinicalDataShareService;

    public List<MedicationDto> getMedications(UUID childId, UUID userId) {
        validateReadAccess(childId, userId);
        return medicationRepository.findByChildIdOrderByCreatedAtDesc(childId)
                .stream().map(m -> toDto(m, LocalDate.now())).toList();
    }

    @Transactional
    public MedicationDto createMedication(MedicationDto dto, UUID parentId) {
        Child child = getChildAndValidate(dto.getChildId(), parentId);
        Medication med = Medication.builder()
                .child(child).name(dto.getName()).dosage(dto.getDosage())
                .unit(dto.getUnit()).frequency(dto.getFrequency())
                .scheduledTimes(dto.getScheduledTimes()).notes(dto.getNotes())
                .isActive(true).startDate(dto.getStartDate()).endDate(dto.getEndDate())
                .build();
        return toDto(medicationRepository.save(med), LocalDate.now());
    }

    @Transactional
    public MedicationDto updateMedication(UUID id, MedicationDto dto, UUID parentId) {
        Medication med = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ilac bulunamadi"));
        validateOwnership(med.getChild().getId(), parentId);
        med.setName(dto.getName()); med.setDosage(dto.getDosage());
        med.setUnit(dto.getUnit()); med.setFrequency(dto.getFrequency());
        med.setScheduledTimes(dto.getScheduledTimes()); med.setNotes(dto.getNotes());
        med.setActive(dto.isActive()); med.setStartDate(dto.getStartDate());
        med.setEndDate(dto.getEndDate());
        return toDto(medicationRepository.save(med), LocalDate.now());
    }

    @Transactional
    public void deleteMedication(UUID id, UUID parentId) {
        Medication med = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ilac bulunamadi"));
        validateOwnership(med.getChild().getId(), parentId);
        medicationRepository.delete(med);
    }

    @Transactional
    public MedicationLogDto toggleLog(UUID medicationId, LocalDate date, String scheduledTime, UUID parentId) {
        Medication med = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Ilac bulunamadi"));
        validateOwnership(med.getChild().getId(), parentId);

        var existing = medicationLogRepository.findByMedicationIdAndLogDateAndScheduledTime(medicationId, date, scheduledTime);
        if (existing.isPresent()) {
            MedicationLog log = existing.get();
            log.setTaken(!log.isTaken());
            log.setTakenAt(log.isTaken() ? LocalDateTime.now() : null);
            return toLogDto(medicationLogRepository.save(log));
        }
        MedicationLog log = MedicationLog.builder()
                .medication(med).child(med.getChild()).logDate(date)
                .scheduledTime(scheduledTime).taken(true).takenAt(LocalDateTime.now())
                .build();
        return toLogDto(medicationLogRepository.save(log));
    }

    @Transactional
    public MedicationLogDto saveLog(UUID medicationId, MedicationLogDto dto, UUID parentId) {
        Medication med = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Ilac bulunamadi"));
        validateOwnership(med.getChild().getId(), parentId);

        var existing = medicationLogRepository.findByMedicationIdAndLogDateAndScheduledTime(
                medicationId, dto.getLogDate(), dto.getScheduledTime());
        MedicationLog log;
        if (existing.isPresent()) {
            log = existing.get();
            log.setTaken(dto.isTaken());
            log.setTakenAt(dto.isTaken() ? LocalDateTime.now() : null);
            log.setSideEffects(dto.getSideEffects());
            log.setNotes(dto.getNotes());
        } else {
            log = MedicationLog.builder()
                    .medication(med).child(med.getChild()).logDate(dto.getLogDate())
                    .scheduledTime(dto.getScheduledTime()).taken(dto.isTaken())
                    .takenAt(dto.isTaken() ? LocalDateTime.now() : null)
                    .sideEffects(dto.getSideEffects()).notes(dto.getNotes())
                    .build();
        }
        return toLogDto(medicationLogRepository.save(log));
    }

    public List<MedicationLogDto> getMedicationLogs(UUID childId, UUID userId) {
        validateReadAccess(childId, userId);
        return medicationLogRepository.findByChildIdOrderByLogDateAsc(childId)
                .stream().map(this::toLogDto).toList();
    }

    private void validateOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(parentId))
            throw new UnauthorizedException("Erisim yetkisi yok");
    }

    private void validateReadAccess(UUID childId, UUID userId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk bulunamadi"));
        if (child.getParent().getId().equals(userId)) {
            return;
        }
        if (!clinicalDataShareService.verifyAccess(userId, childId, "tracker")) {
            throw new UnauthorizedException("Erisim yetkisi yok");
        }
    }

    private Child getChildAndValidate(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(parentId))
            throw new UnauthorizedException("Erisim yetkisi yok");
        return child;
    }

    private MedicationDto toDto(Medication m, LocalDate today) {
        List<MedicationLogDto> todayLogs = medicationLogRepository
                .findByChildIdAndLogDate(m.getChild().getId(), today).stream()
                .filter(l -> l.getMedication().getId().equals(m.getId()))
                .map(this::toLogDto).toList();
        return MedicationDto.builder()
                .id(m.getId()).childId(m.getChild().getId()).name(m.getName())
                .dosage(m.getDosage()).unit(m.getUnit()).frequency(m.getFrequency())
                .scheduledTimes(m.getScheduledTimes()).notes(m.getNotes())
                .isActive(m.isActive()).startDate(m.getStartDate()).endDate(m.getEndDate())
                .createdAt(m.getCreatedAt()).todayLogs(todayLogs).build();
    }

    private MedicationLogDto toLogDto(MedicationLog l) {
        return MedicationLogDto.builder()
                .id(l.getId()).medicationId(l.getMedication().getId())
                .childId(l.getChild().getId()).logDate(l.getLogDate())
                .scheduledTime(l.getScheduledTime()).taken(l.isTaken())
                .takenAt(l.getTakenAt()).notes(l.getNotes())
                .sideEffects(l.getSideEffects())
                .createdAt(l.getCreatedAt()).build();
    }
}
