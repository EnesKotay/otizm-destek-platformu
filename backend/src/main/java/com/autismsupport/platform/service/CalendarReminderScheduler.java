package com.autismsupport.platform.service;

import com.autismsupport.platform.model.CalendarEvent;
import com.autismsupport.platform.repository.CalendarEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CalendarReminderScheduler {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm", Locale.of("tr"));

    private final CalendarEventRepository calendarEventRepository;
    private final NotificationService notificationService;

    // Her 30 dakikada bir çalışır — yaklaşan etkinlik hatırlatmalarını gönderir
    @Scheduled(fixedDelay = 30 * 60 * 1000)
    @Transactional
    public void sendCalendarReminders() {
        LocalDateTime now = LocalDateTime.now();
        // Pencere: şu andan SCHEDULER_INTERVAL_MINUTES + max reminderMinutesBefore dakika sonrasına kadar
        // Her etkinlik için: şu an >= startTime - reminderMinutesBefore AND şu an < startTime
        // Basitleştirilmiş pencere: önümüzdeki 0..1440 dk içinde başlayan etkinlikleri çek, sonra filtrele
        LocalDateTime windowEnd = now.plusMinutes(1440);
        List<CalendarEvent> candidates = calendarEventRepository.findEventsNeedingReminder(now, windowEnd);

        int sent = 0;
        for (CalendarEvent event : candidates) {
            Integer minutesBefore = event.getReminderMinutesBefore();
            if (minutesBefore == null) continue;

            LocalDateTime reminderTime = event.getStartTime().minusMinutes(minutesBefore);
            // Hatırlatma zamanı geldi mi? (şu an >= reminderTime)
            if (!now.isBefore(reminderTime)) {
                String timeStr = event.getStartTime().format(TIME_FMT);
                String title = "Etkinlik Hatırlatması: " + event.getTitle();
                String body = buildReminderBody(event, minutesBefore, timeStr);
                String link = "/takvim";

                UUID parentId = event.getChild().getParent().getId();
                notificationService.createNotification(parentId, "CALENDAR_REMINDER", title, body, link);

                event.setReminderSent(true);
                calendarEventRepository.save(event);
                sent++;
            }
        }

        if (sent > 0) {
            log.info("CalendarReminderScheduler: {} hatirlatma gonderildi", sent);
        }
    }

    private String buildReminderBody(CalendarEvent event, int minutesBefore, String timeStr) {
        String when = minutesBefore >= 1440 ? "1 gün"
                : minutesBefore >= 60 ? (minutesBefore / 60) + " saat"
                : minutesBefore + " dakika";
        String child = event.getChild().getName();
        StringBuilder sb = new StringBuilder();
        sb.append(child).append(" için \"").append(event.getTitle()).append("\" etkinliği ").append(when)
                .append(" sonra (").append(timeStr).append(") başlıyor.");
        if (event.getLocation() != null && !event.getLocation().isBlank()) {
            sb.append(" Konum: ").append(event.getLocation());
        }
        return sb.toString();
    }
}
