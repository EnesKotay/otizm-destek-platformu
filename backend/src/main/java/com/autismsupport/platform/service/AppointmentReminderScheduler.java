package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Appointment;
import com.autismsupport.platform.model.AppointmentStatusHistory;
import com.autismsupport.platform.model.ExpertTask;
import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.AppointmentStatusHistoryRepository;
import com.autismsupport.platform.repository.ExpertTaskRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentStatusHistoryRepository historyRepository;
    private final ExpertTaskRepository expertTaskRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /** Her sabah 08:00'de calisir — ertesi gun randevusu olan herkese hatirlatma gonderir. */
    @Transactional
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDayBeforeReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Appointment> upcoming = appointmentRepository
                .findByAppointmentDateOrderByAppointmentTimeAsc(tomorrow);

        for (Appointment appt : upcoming) {
            if (!"CONFIRMED".equals(appt.getStatus()) && !"PENDING".equals(appt.getStatus())) continue;

            String timeStr = appt.getAppointmentTime().format(DateTimeFormatter.ofPattern("HH:mm"));
            String dateStr = tomorrow.format(DateTimeFormatter.ofPattern("d MMMM", Locale.forLanguageTag("tr")));
            String expertName = appt.getExpert().getFullName();
            String apptType = "ONLINE".equals(appt.getType()) ? "Online" : "Yuz yuze";

            // Ebeveyne bildirim
            if (appt.getParent() != null) {
                notificationService.createNotification(
                        appt.getParent().getId(),
                        "APPOINTMENT_REMINDER",
                        "Randevu Hatirlatmasi",
                        String.format("Yarin %s saat %s — %s ile %s randevunuz var.",
                                dateStr, timeStr, expertName, apptType),
                        "/randevular"
                );
                emailService.sendAppointmentReminderEmail(
                        appt.getParent().getEmail(),
                        "Randevu Hatirlatmasi",
                        String.format("Yarin %s saat %s — %s ile %s randevunuz var.",
                                dateStr, timeStr, expertName, apptType)
                );
            }

            // Uzmana bildirim
            if (appt.getExpert() != null) {
                String parentName = appt.getParent() != null ? appt.getParent().getFullName() : "Danisan";
                notificationService.createNotification(
                        appt.getExpert().getId(),
                        "APPOINTMENT_REMINDER",
                        "Randevu Hatirlatmasi",
                        String.format("Yarin %s saat %s — %s ile %s randevunuz var.",
                                dateStr, timeStr, parentName, apptType),
                        "/randevular"
                );
                emailService.sendAppointmentReminderEmail(
                        appt.getExpert().getEmail(),
                        "Randevu Hatirlatmasi",
                        String.format("Yarin %s saat %s — %s ile %s randevunuz var.",
                                dateStr, timeStr, parentName, apptType)
                );
            }
        }
        log.info("Randevu hatirlatmasi gonderildi: {} adet ({})", upcoming.size(), tomorrow);
    }

    /** Her saat basi calisir — 2 saat icinde randevusu olan herkese son bildirim gonderir. */
    @Transactional
    @Scheduled(cron = "0 0 * * * *")
    public void sendTwoHourReminders() {
        LocalDate today = LocalDate.now();
        LocalTime inTwoHours = LocalTime.now().plusHours(2);
        LocalTime inTwoHoursPlus10 = inTwoHours.plusMinutes(10);

        appointmentRepository
                .findByAppointmentDateOrderByAppointmentTimeAsc(today)
                .stream()
                .filter(a -> ("CONFIRMED".equals(a.getStatus()) || "PENDING".equals(a.getStatus()))
                        && a.getAppointmentTime().isAfter(inTwoHours)
                        && a.getAppointmentTime().isBefore(inTwoHoursPlus10))
                .forEach(appt -> {
                    String timeStr = appt.getAppointmentTime().format(DateTimeFormatter.ofPattern("HH:mm"));

                    // Ebeveyne bildirim
                    if (appt.getParent() != null) {
                        notificationService.createNotification(
                                appt.getParent().getId(),
                                "APPOINTMENT_SOON",
                                "Randevunuz 2 saat sonra",
                                String.format("Bugun saat %s'de %s ile randevunuz yaklasiyor.",
                                        timeStr, appt.getExpert().getFullName()),
                                "/randevular"
                        );
                        emailService.sendAppointmentReminderEmail(
                                appt.getParent().getEmail(),
                                "Randevunuz 2 saat sonra",
                                String.format("Bugun saat %s'de %s ile randevunuz yaklasiyor.",
                                        timeStr, appt.getExpert().getFullName())
                        );
                    }

                    // Uzmana bildirim
                    if (appt.getExpert() != null) {
                        String parentName = appt.getParent() != null ? appt.getParent().getFullName() : "Danisan";
                        notificationService.createNotification(
                                appt.getExpert().getId(),
                                "APPOINTMENT_SOON",
                                "Randevunuz 2 saat sonra",
                                String.format("Bugun saat %s'de %s ile randevunuz yaklasiyor.",
                                        timeStr, parentName),
                                "/randevular"
                        );
                        emailService.sendAppointmentReminderEmail(
                                appt.getExpert().getEmail(),
                                "Randevunuz 2 saat sonra",
                                String.format("Bugun saat %s'de %s ile randevunuz yaklasiyor.",
                                        timeStr, parentName)
                        );
                    }
                });
    }


    /** Her saat 15. dakikasinda calisir — 48 saat icinde randevusu olan ama hala PENDING kalan randevulari iptal eder. */
    @Transactional
    @Scheduled(cron = "0 15 * * * *")
    public void autoCancelUnconfirmedAppointments() {
        // Zaman damgasını bir kez al — tüm döngü boyunca tutarlı kalsın
        LocalDateTime now = LocalDateTime.now();
        LocalDate cutoffDate = now.toLocalDate().plusDays(2);
        LocalTime cutoffTime = now.toLocalTime();
        List<Appointment> pending = appointmentRepository.findPendingAppointmentsBeforeCutoff(cutoffDate, cutoffTime);
        if (pending.isEmpty()) return;
        for (Appointment appt : pending) {
            appt.setStatus("CANCELLED");
            appt.setCancellationBy("SYSTEM");
            appt.setCancellationReason("Uzman 48 saat icinde onay vermedi, randevu otomatik iptal edildi.");
            Appointment savedCancel = appointmentRepository.save(appt);
            historyRepository.save(AppointmentStatusHistory.builder()
                    .appointment(savedCancel).oldStatus("PENDING").newStatus("CANCELLED")
                    .note("Otomatik iptal: 48 saat icerisinde onaylanmadi").build());
            if (appt.getParent() != null) {
                notificationService.createNotification(
                        appt.getParent().getId(),
                        "APPOINTMENT_CANCELLED",
                        "Randevu otomatik iptal edildi",
                        appt.getExpert().getFullName() + " randevunuzu 48 saat icinde onaylamadigi icin otomatik iptal edildi.",
                        "/randevular"
                );
            }
            notificationService.createNotification(
                    appt.getExpert().getId(),
                    "APPOINTMENT_CANCELLED",
                    "Onaylanmayan randevu iptal edildi",
                    appt.getAppointmentDate() + " tarihli randevu 48 saat icerisinde onaylanmadigi icin otomatik iptal edildi.",
                    "/randevular"
            );
        }
        log.info("48 saat icerisinde onaylanmayan {} randevu otomatik iptal edildi.", pending.size());
    }

    /** Her saat basi calisir — tarihi gecmis CONFIRMED randevulari otomatik olarak COMPLETED'a ceker. */
    @Transactional
    @Scheduled(cron = "0 5 * * * *")
    public void autoCompleteExpiredAppointments() {
        // Zaman damgasını bir kez al — tüm döngü boyunca tutarlı kalsın
        LocalDateTime now = LocalDateTime.now();
        List<Appointment> expired = appointmentRepository.findExpiredConfirmedAppointments(
                now.toLocalDate(), now.toLocalTime());
        if (expired.isEmpty()) return;
        for (Appointment appt : expired) {
            appt.setStatus("COMPLETED");
            Appointment savedComplete = appointmentRepository.save(appt);
            historyRepository.save(AppointmentStatusHistory.builder()
                    .appointment(savedComplete).oldStatus("CONFIRMED").newStatus("COMPLETED")
                    .note("Otomatik tamamlandi: randevu saati gecti").build());
            if (appt.getParent() != null) {
                notificationService.createNotification(
                        appt.getParent().getId(),
                        "APPOINTMENT_COMPLETED",
                        "Seansiniz tamamlandi",
                        appt.getExpert().getFullName() + " ile olan seansiniz tamamlandi olarak isaretlendi.",
                        "/randevular"
                );
            }
        }
        log.info("Suresi gecmis {} randevu otomatik olarak COMPLETED yapildi.", expired.size());
    }

    /** Her pazartesi sabah 09:00'da — suresi gecmis gorevlerin hatirlatmasini gonderir. */
    @Transactional
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendOverdueTaskReminders() {
        log.info("Gecikmis gorev hatirlatmalari kontrol ediliyor...");
        List<ExpertTask> overdueTasks = expertTaskRepository.findByDueDateBeforeAndStatusNot(LocalDate.now(), "COMPLETED");
        for (ExpertTask task : overdueTasks) {
            notificationService.createNotification(
                    task.getParent().getId(),
                    "TASK_OVERDUE",
                    "Gorev suresi gecti",
                    String.format("%s icin \"%s\" gorevinin suresi gecti.", task.getChild().getName(), task.getTitle()),
                    "/gorevler"
            );
        }
        log.info("Gecikmis gorev hatirlatmasi gonderildi: {} adet", overdueTasks.size());
    }

    /** Her pazar gece yarisi — 90 gunden eski okunmus bildirimleri siler. */
    @Transactional
    @Scheduled(cron = "0 0 0 * * SUN")
    public void cleanOldNotifications() {
        notificationService.deleteOldNotifications(LocalDateTime.now().minusDays(90));
    }
}
