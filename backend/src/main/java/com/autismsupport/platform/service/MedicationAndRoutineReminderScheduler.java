package com.autismsupport.platform.service;

import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.MedicationRepository;
import com.autismsupport.platform.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MedicationAndRoutineReminderScheduler {

    private final MedicationRepository medicationRepository;
    private final RoutineRepository routineRepository;
    private final NotificationService notificationService;

    @Transactional
    @Scheduled(cron = "0 * * * * *") // Run every minute
    public void sendReminders() {
        LocalTime now = LocalTime.now();
        String currentStr = now.format(DateTimeFormatter.ofPattern("HH:mm"));

        // 1. Check active medications
        List<Medication> activeMeds = medicationRepository.findByIsActiveTrue();
        for (Medication med : activeMeds) {
            if (med.getScheduledTimes() == null || med.getChild() == null || med.getChild().getParent() == null) {
                continue;
            }
            for (String scheduledStr : med.getScheduledTimes()) {
                if (currentStr.equals(scheduledStr)) {
                    String title = "İlaç Hatırlatması ⏰";
                    String body = String.format("%s için %s (%s %s) ilaç saati geldi.", 
                            med.getChild().getName(), 
                            med.getName(), 
                            med.getDosage() != null ? med.getDosage() : "", 
                            med.getUnit() != null ? med.getUnit() : "");
                    notificationService.createNotification(
                            med.getChild().getParent().getId(),
                            "MEDICATION_REMINDER",
                            title,
                            body,
                            "/gunluk-takip"
                    );
                    log.info("Medication reminder sent to userId={}", med.getChild().getParent().getId());
                }
            }
        }

        // 2. Check active routines
        List<Routine> activeRoutines = routineRepository.findByIsActiveTrueWithItems();
        for (Routine routine : activeRoutines) {
            if (routine.getItems() == null || routine.getChild() == null || routine.getChild().getParent() == null) {
                continue;
            }
            for (RoutineItem item : routine.getItems()) {
                if (item.getScheduledTime() == null) {
                    continue;
                }
                String itemTimeStr = item.getScheduledTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                if (currentStr.equals(itemTimeStr)) {
                    String title = "Rutin Hatırlatması ⏰";
                    String body = String.format("%s için %s rutini başlama saati: %s", 
                            routine.getChild().getName(), 
                            routine.getName(), 
                            item.getTitle());
                    notificationService.createNotification(
                            routine.getChild().getParent().getId(),
                            "ROUTINE_REMINDER",
                            title,
                            body,
                            "/rutinler"
                    );
                    log.info("Routine reminder sent to userId={}", routine.getChild().getParent().getId());
                }
            }
        }
    }
}
