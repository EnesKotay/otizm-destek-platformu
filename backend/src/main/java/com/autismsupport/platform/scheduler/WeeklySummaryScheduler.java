package com.autismsupport.platform.scheduler;

import com.autismsupport.platform.dto.WeeklySummaryDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeeklySummaryScheduler {

    private final UserRepository userRepository;
    private final EmailService emailService;

    // Her Pazartesi saat 09:00'da çalışır
    @Scheduled(cron = "0 0 9 * * MON", zone = "Europe/Istanbul")
    @Transactional(readOnly = true)
    public void sendWeeklySummaries() {
        log.info("Haftalık özet e-postaları gönderimi başlatılıyor...");
        List<User> parents = userRepository.findByRoleAndEmailVerifiedTrue(UserRole.PARENT);
        
        int sentCount = 0;
        for (User parent : parents) {
            if (!parent.isEmailVerified()) continue;

            WeeklySummaryDto summary = WeeklySummaryDto.builder()
                    .userName(parent.getFullName())
                    .completedActivitiesCount(0) // TODO: İleride ActivityRepository'den hesaplanacak
                    .completedGoalsCount(0) // TODO: İleride GoalRepository'den hesaplanacak
                    .completedAppointmentsCount(0) // TODO: İleride AppointmentRepository'den hesaplanacak
                    .unreadMessagesCount(0)
                    .upcomingAppointments(Collections.emptyList())
                    .recommendedResources(List.of("Otizmde Erken Müdahalenin Önemi", "Günlük Rutin Oluşturma Rehberi"))
                    .currentWeek("Bu Hafta")
                    .build();

            try {
                emailService.sendWeeklySummaryEmail(parent.getEmail(), summary);
                sentCount++;
            } catch (Exception e) {
                log.error("Haftalık özet gönderilemedi. Kullanıcı: {}", parent.getId(), e);
            }
        }
        
        log.info("Haftalık özet e-postaları gönderimi tamamlandı. Toplam gönderilen: {}", sentCount);
    }
}
