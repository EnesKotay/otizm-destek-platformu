package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AppointmentDto;
import com.autismsupport.platform.dto.AppointmentHistoryDto;
import com.autismsupport.platform.dto.ExpertAvailabilityDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.UUID;


@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final int DEFAULT_DURATION_MINUTES = 50;
    private static final int SLOT_STEP_MINUTES = 30;
    private static final int MIN_DURATION_MINUTES = 15;
    private static final int MAX_DURATION_MINUTES = 180;
    private static final int MAX_APPOINTMENTS_PER_EXPERT_PER_DAY = 12;
    private static final int LATE_CANCELLATION_HOURS = 24;
    private static final List<String> BOOKING_BLOCKING_STATUSES = List.of("PENDING", "CONFIRMED", "COMPLETED");

    // Geçerli durum geçişleri — terminal durumlardan çıkış olmaz
    private static final java.util.Map<String, java.util.Set<String>> VALID_TRANSITIONS = java.util.Map.of(
        "PENDING",   java.util.Set.of("CONFIRMED", "CANCELLED"),
        "CONFIRMED", java.util.Set.of("COMPLETED", "CANCELLED"),
        "COMPLETED", java.util.Set.of(),
        "CANCELLED", java.util.Set.of()
    );

    private final AppointmentRepository appointmentRepository;
    private final AppointmentStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final ExpertAvailabilityRepository availabilityRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final PatientService patientService;

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getAppointments(UUID userId, String role) {
        List<Appointment> appointments = "EXPERT".equals(role)
                ? appointmentRepository.findByExpertIdOrderByAppointmentDateAscAppointmentTimeAsc(userId)
                : appointmentRepository.findByParentIdOrderByAppointmentDateAscAppointmentTimeAsc(userId);
        // BLOCKED status randevular; blockedSlots uzerinden yonetilir, listede gosterilmez
        return appointments.stream()
                .filter(a -> !"BLOCKED".equals(a.getStatus()))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExpertAvailabilityDto> getAvailabilities(UUID expertId) {
        return availabilityRepository.findByExpertIdOrderByDayOfWeekAsc(expertId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getBookedTimes(UUID expertId, LocalDate date, Integer duration) {
        final int slotDuration = duration != null ? resolveDuration(duration) : DEFAULT_DURATION_MINUTES;

        List<Appointment> booked = appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expertId, date)
                .stream()
                .filter(this::isBookableAppointment)
                .toList();

        ExpertAvailability availability = availabilityRepository.findByExpertIdAndDayOfWeek(expertId, date.getDayOfWeek().getValue())
                .orElse(null);
        Set<String> unavailableTimes = new LinkedHashSet<>();

        if (availability != null && availability.isEnabled()
                && availability.getStartTime() != null && availability.getEndTime() != null) {
            List<LocalTime> blockedSlotTimes = blockedSlotTimesForDate(availability, date);
            for (LocalTime candidate : generateTimeSlots(availability.getStartTime(), availability.getEndTime(), slotDuration)) {
                boolean overlapsAppointment = booked.stream()
                        .anyMatch(a -> timesOverlap(candidate, slotDuration, a.getAppointmentTime(), appointmentDuration(a)));
                boolean overlapsBlockedSlot = blockedSlotTimes.stream()
                        .anyMatch(blockedTime -> timesOverlap(candidate, slotDuration, blockedTime, DEFAULT_DURATION_MINUTES));
                if (overlapsAppointment || overlapsBlockedSlot) {
                    unavailableTimes.add(candidate.format(TIME_FORMAT));
                }
            }
        } else {
            booked.forEach(a -> unavailableTimes.add(a.getAppointmentTime().format(TIME_FORMAT)));
        }

        return unavailableTimes.stream().toList();
    }

    @Transactional(readOnly = true)
    public Map<String, String> getNextAvailableSlot(UUID expertId, Integer requestedDuration) {
        int duration = requestedDuration != null ? resolveDuration(requestedDuration) : DEFAULT_DURATION_MINUTES;
        for (int offset = 0; offset <= 60; offset++) {
            LocalDate date = LocalDate.now().plusDays(offset);
            ExpertAvailability availability = availabilityRepository
                    .findByExpertIdAndDayOfWeek(expertId, date.getDayOfWeek().getValue()).orElse(null);
            if (availability == null || !availability.isEnabled() || availability.getStartTime() == null || availability.getEndTime() == null) continue;
            Set<String> unavailable = new java.util.HashSet<>(getBookedTimes(expertId, date, duration));
            for (LocalTime slot : generateTimeSlots(availability.getStartTime(), availability.getEndTime(), duration)) {
                if (date.equals(LocalDate.now()) && !slot.isAfter(LocalTime.now())) continue;
                String time = slot.format(TIME_FORMAT);
                if (!unavailable.contains(time)) return Map.of("date", date.toString(), "time", time);
            }
        }
        return Map.of();
    }

    @Transactional
    public List<ExpertAvailabilityDto> saveAvailabilities(UUID expertId, List<ExpertAvailabilityDto> items) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new AccessDeniedException("Sadece uzmanlar musaitlik ayarlayabilir");
        }
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("Musaitlik plani bos olamaz");
        }

        Set<Integer> seenDays = new java.util.HashSet<>();
        List<ExpertAvailability> entities = items.stream()
                .map(item -> buildAvailability(expert, item, seenDays))
                .toList();

        List<ExpertAvailability> existing = availabilityRepository.findByExpertIdOrderByDayOfWeekAsc(expertId);
        availabilityRepository.deleteAll(existing);
        availabilityRepository.flush(); // Force delete to database before inserting new records

        List<ExpertAvailability> saved = availabilityRepository.saveAll(entities);

        auditLogService.log(expert, "AVAILABILITY_UPDATED", "USER", expert.getId(), Map.of("count", saved.size()));
        return saved.stream().map(this::toDto).toList();
    }

    private ExpertAvailability buildAvailability(User expert, ExpertAvailabilityDto item, Set<Integer> seenDays) {
        if (item == null) {
            throw new RuntimeException("Musaitlik satiri bos olamaz");
        }
        Integer dayOfWeek = item.getDayOfWeek();
        if (dayOfWeek == null || dayOfWeek < 1 || dayOfWeek > 7) {
            throw new RuntimeException("Gun 1 ile 7 arasinda olmalidir");
        }
        if (!seenDays.add(dayOfWeek)) {
            throw new RuntimeException("Ayni gun icin birden fazla musaitlik satiri olamaz");
        }

        boolean enabled = Boolean.TRUE.equals(item.getEnabled());
        LocalTime startTime = null;
        LocalTime endTime = null;
        if (enabled) {
            startTime = parseTime(item.getStartTime(), true);
            endTime = parseTime(item.getEndTime(), true);
            if (!endTime.isAfter(startTime)) {
                throw new RuntimeException("Bitis saati baslangic saatinden sonra olmalidir");
            }
            if (ChronoUnit.MINUTES.between(startTime, endTime) < DEFAULT_DURATION_MINUTES) {
                throw new RuntimeException("Musaitlik araligi en az " + DEFAULT_DURATION_MINUTES + " dakika olmalidir");
            }
        }

        return ExpertAvailability.builder()
                .expert(expert)
                .dayOfWeek(dayOfWeek)
                .enabled(enabled)
                .startTime(startTime)
                .endTime(endTime)
                .blockedSlots(normalizeBlockedSlots(item.getBlockedSlots()))
                .build();
    }

    @Transactional
    public AppointmentDto createAppointment(UUID parentId, AppointmentDto dto) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Ebeveyn bulunamadi"));
        if (dto.getExpertId() == null) {
            throw new RuntimeException("Uzman secimi zorunludur");
        }
        if (dto.getChildId() == null) {
            throw new RuntimeException("Cocuk secimi zorunludur");
        }
        User expert = userRepository.findById(dto.getExpertId())
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));

        if (expert.getRole() != UserRole.EXPERT || !expert.isVerified()) {
            throw new RuntimeException("Secilen uzman randevuya uygun degil");
        }
        if (parentId.equals(expert.getId())) {
            throw new RuntimeException("Kendi profilinizle randevu olusturulamaz");
        }

        if (dto.getDate() == null) {
            throw new RuntimeException("Randevu tarihi zorunludur");
        }
        if (dto.getDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Gecmis bir tarih icin randevu olusturulamaz");
        }
        if (dto.getDate().isAfter(LocalDate.now().plusMonths(6))) {
            throw new RuntimeException("En fazla 6 ay ileriye randevu alinabilir");
        }

        Child child = resolveChildForParent(parentId, dto.getChildId());
        LocalTime appointmentTime = parseTime(dto.getTime(), true);
        if (dto.getDate().equals(LocalDate.now()) && !appointmentTime.isAfter(LocalTime.now())) {
            throw new RuntimeException("Gecmis bir saat icin randevu olusturulamaz");
        }
        int duration = resolveDuration(dto.getDuration());
        String type = resolveAppointmentType(dto.getType());

        lockExpertSchedule(expert.getId());

        // Günlük kapasite kontrolü
        long dailyCount = appointmentRepository.countActiveByExpertIdAndDate(expert.getId(), dto.getDate());
        if (dailyCount >= MAX_APPOINTMENTS_PER_EXPERT_PER_DAY) {
            throw new RuntimeException("Uzman bu gun icin maksimum randevu kapasitesine ulasmistir");
        }

        // Pessimistic lock — eş zamanlı booking'leri sıralar, çift rezervasyonu önler
        appointmentRepository.lockActiveSlotsByExpertAndDate(expert.getId(), dto.getDate());

        validateAvailability(expert.getId(), dto.getDate(), appointmentTime, duration);
        ensureNoAppointmentConflict(expert.getId(), dto.getDate(), appointmentTime, duration, null);
        List<Appointment> existingForDay = appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expert.getId(), dto.getDate());

        Appointment appointment = existingForDay.stream()
                .filter(a -> "CANCELLED".equals(a.getStatus()))
                .filter(a -> a.getAppointmentTime().equals(appointmentTime))
                .findFirst()
                .orElseGet(Appointment::new);

        appointment.setExpert(expert);
        appointment.setParent(parent);
        appointment.setChild(child);
        appointment.setAppointmentDate(dto.getDate());
        appointment.setAppointmentTime(appointmentTime);
        appointment.setDuration(duration);
        appointment.setType(type);
        appointment.setStatus("PENDING");
        appointment.setNotes(dto.getNotes());
        appointment.setAppointmentTopic(blankToNull(dto.getAppointmentTopic()));
        appointment.setPreSessionNotes(blankToNull(dto.getPreSessionNotes()));
        appointment.setSessionNotes(null);
        appointment.setCancellationReason(null);
        appointment.setCalendarEventId(null);
        if ("ONLINE".equals(type) && appointment.getMeetingLink() == null) {
            appointment.setMeetingLink("https://meet.jit.si/otizm-destek-" + UUID.randomUUID().toString().substring(0, 8));
        }

        appointment = appointmentRepository.save(appointment);
        recordHistory(appointment, null, "PENDING", parent, "Randevu olusturuldu");

        // Tekrarlayan seans desteği
        int recurrenceWeeks = dto.getRecurrenceWeeks() != null && dto.getRecurrenceWeeks() > 0
                ? Math.min(dto.getRecurrenceWeeks(), 24)
                : 0;
        java.util.List<String> skippedWeeks = new java.util.ArrayList<>();
        if (recurrenceWeeks > 1) {
            UUID groupId = UUID.randomUUID();
            appointment.setRecurringGroupId(groupId);
            appointment.setRecurrenceIndex(1);
            appointmentRepository.save(appointment);

            for (int week = 1; week < recurrenceWeeks; week++) {
                LocalDate nextDate = dto.getDate().plusWeeks(week);
                if (nextDate.isAfter(LocalDate.now().plusMonths(6))) {
                    skippedWeeks.add(nextDate + " (6 ay siniri asiliyor)");
                    break;
                }
                try {
                    validateAvailability(expert.getId(), nextDate, appointmentTime, duration);
                    ensureNoAppointmentConflict(expert.getId(), nextDate, appointmentTime, duration, null);
                } catch (Exception e) {
                    skippedWeeks.add(nextDate.toString()); // Çakışan haftayı kayıt et
                    continue;
                }
                Appointment recurring = Appointment.builder()
                        .expert(expert).parent(parent).child(child)
                        .appointmentDate(nextDate).appointmentTime(appointmentTime)
                        .duration(duration).type(type).status("PENDING")
                        .notes(appointment.getNotes())
                        .recurringGroupId(groupId).recurrenceIndex(week + 1)
                        .build();
                Appointment savedRecurring = appointmentRepository.save(recurring);
                recordHistory(savedRecurring, null, "PENDING", parent, "Tekrarlayan seans serisi: " + week + ". hafta");
            }
        }

        int createdCount = recurrenceWeeks > 1 ? (recurrenceWeeks - skippedWeeks.size()) : 1;
        String notifSuffix = recurrenceWeeks > 1
                ? String.format(" (%d haftalik seri, %d randevu olusturuldu%s)",
                        recurrenceWeeks, createdCount,
                        skippedWeeks.isEmpty() ? "" : ", " + skippedWeeks.size() + " hafta atlandi")
                : "";
        notificationService.createNotification(
                expert.getId(),
                "APPOINTMENT_REQUEST",
                "Yeni randevu talebi",
                parent.getFullName() + " sizden " + dto.getDate() + " icin randevu talep etti." + notifSuffix,
                "/randevular",
                appointment.getId()
        );
        auditLogService.log(parent, "APPOINTMENT_CREATED", "APPOINTMENT", appointment.getId(), Map.of(
                "expertId", expert.getId().toString(),
                "childId", child.getId().toString()
        ));
        AppointmentDto result = toDto(appointment);
        if (!skippedWeeks.isEmpty()) result.setSkippedWeeks(skippedWeeks);
        return result;
    }

    @Transactional
    public void cancelRecurringGroup(UUID groupId, UUID userId) {
        List<Appointment> group = appointmentRepository.findByRecurringGroupId(groupId);
        if (group.isEmpty()) throw new RuntimeException("Seri bulunamadi");
        assertRecurringGroupAccess(group, userId);
        for (Appointment appt : group) {
            if ("COMPLETED".equals(appt.getStatus()) || "CANCELLED".equals(appt.getStatus())) continue;
            boolean isParent = appt.getParent() != null && appt.getParent().getId().equals(userId);
            String prevStatus = appt.getStatus();
            boolean late = isLateCancellation(appt);
            appt.setStatus("CANCELLED");
            appt.setCancellationBy(isParent ? "PARENT" : "EXPERT");
            appt.setLateCancellation(late);
            appt.setCancellationReason("Tekrarlayan seans serisi iptal edildi.");
            Appointment saved = appointmentRepository.save(appt);
            String note = late ? "Seri iptali [Geç iptal: randevuya 24 saatten az kaldı]" : "Seri iptali";
            recordHistory(saved, prevStatus, "CANCELLED", userRepository.findById(userId).orElse(null), note);
        }
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getRecurringGroup(UUID groupId, UUID userId) {
        List<Appointment> group = appointmentRepository.findByRecurringGroupId(groupId);
        if (group.isEmpty()) throw new RuntimeException("Seri bulunamadi");
        assertRecurringGroupAccess(group, userId);
        return group.stream()
                .map(this::toDto).toList();
    }

    @Transactional
    public AppointmentDto cancelAppointment(UUID appointmentId, UUID userId, String reason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        UUID parentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        boolean isParent = parentId != null && parentId.equals(userId);
        boolean isExpert = appointment.getExpert().getId().equals(userId);
        if (!isParent && !isExpert) {
            throw new AccessDeniedException("Bu randevuyu iptal etme yetkiniz yok");
        }
        if ("COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Tamamlanmis randevu iptal edilemez");
        }
        if ("CANCELLED".equals(appointment.getStatus())) {
            return toDto(appointment);
        }

        String prevStatusCancel = appointment.getStatus();
        validateStatusTransition(prevStatusCancel, "CANCELLED");

        boolean late = isLateCancellation(appointment);
        String cancelledByRole = isParent ? "PARENT" : "EXPERT";

        appointment.setStatus("CANCELLED");
        appointment.setCancellationBy(cancelledByRole);
        appointment.setLateCancellation(late);
        appointment.setCancellationReason(reason == null || reason.isBlank() ? null : reason.trim());
        deleteLinkedCalendarEvent(appointment);
        Appointment saved = appointmentRepository.save(appointment);
        User cancelledBy = userRepository.findById(userId).orElse(null);
        String historyNote = appointment.getCancellationReason();
        if (late) historyNote = (historyNote == null ? "" : historyNote + " ") + "[Geç iptal: randevuya 24 saatten az kaldı]";
        recordHistory(saved, prevStatusCancel, "CANCELLED", cancelledBy, historyNote);
        UUID targetUserId = isParent
                ? appointment.getExpert().getId()
                : (parentId != null ? parentId : null);
        if (targetUserId == null) return toDto(saved);
        String message = appointment.getAppointmentDate() + " tarihli randevu iptal edildi.";
        if (appointment.getCancellationReason() != null) {
            message += " Gerekce: " + appointment.getCancellationReason();
        }
        notificationService.createNotification(
                targetUserId,
                "APPOINTMENT_CANCELLED",
                "Randevu iptal edildi",
                message,
                "/randevular",
                appointment.getId()
        );
        auditLogService.log(
                userRepository.findById(userId).orElse(null),
                "APPOINTMENT_CANCELLED",
                "APPOINTMENT",
                appointment.getId(),
                Map.of()
        );
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto confirmAppointment(UUID appointmentId, UUID expertId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        if (!appointment.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Sadece uzman randevuyu onaylayabilir");
        }
        if (appointment.getParent() == null) {
            throw new RuntimeException("Bu kayit onaylanabilir bir randevu degil");
        }
        if (!"PENDING".equals(appointment.getStatus())) {
            throw new RuntimeException("Sadece bekleyen randevular onaylanabilir");
        }
        validateStatusTransition(appointment.getStatus(), "CONFIRMED");

        appointment.setStatus("CONFIRMED");
        if ("ONLINE".equals(appointment.getType()) && (appointment.getMeetingLink() == null || appointment.getMeetingLink().isBlank())) {
            appointment.setMeetingLink("https://meet.jit.si/otizm-destek-" + UUID.randomUUID().toString().substring(0, 8));
        }
        upsertCalendarEvent(appointment);
        Appointment saved = appointmentRepository.save(appointment);
        recordHistory(saved, "PENDING", "CONFIRMED", userRepository.findById(expertId).orElse(null), null);
        notificationService.createNotification(
                appointment.getParent().getId(),
                "APPOINTMENT_CONFIRMED",
                "Randevunuz onaylandi",
                appointment.getExpert().getFullName() + " randevunuzu onayladi.",
                "/randevular",
                appointment.getId()
        );
        auditLogService.log(
                userRepository.findById(expertId).orElse(null),
                "APPOINTMENT_CONFIRMED",
                "APPOINTMENT",
                appointment.getId(),
                Map.of()
        );
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto rescheduleAppointment(UUID appointmentId, UUID userId, LocalDate date, String time, Integer durationOverride) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        UUID parentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        boolean isParent = parentId != null && parentId.equals(userId);
        boolean isExpert = appointment.getExpert().getId().equals(userId);
        if (!isParent && !isExpert) {
            throw new AccessDeniedException("Bu randevuyu yeniden planlama yetkiniz yok");
        }
        if ("COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Tamamlanmis randevu yeniden planlanamaz");
        }
        if (date == null) {
            throw new RuntimeException("Randevu tarihi zorunludur");
        }
        if (date.isBefore(LocalDate.now())) {
            throw new RuntimeException("Gecmis bir tarih icin randevu planlanamaz");
        }

        LocalTime newTime = parseTime(time, true);
        if (date.equals(LocalDate.now()) && !newTime.isAfter(LocalTime.now())) {
            throw new RuntimeException("Gecmis bir saat icin randevu planlanamaz");
        }
        int newDuration = durationOverride != null && durationOverride > 0
                ? resolveDuration(durationOverride)
                : appointmentDuration(appointment);

        lockExpertSchedule(appointment.getExpert().getId());

        validateAvailability(appointment.getExpert().getId(), date, newTime, newDuration);
        ensureNoAppointmentConflict(appointment.getExpert().getId(), date, newTime, newDuration, appointment.getId());
        List<Appointment> existingForDay = appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(appointment.getExpert().getId(), date);
        existingForDay.stream()
                .filter(a -> "CANCELLED".equals(a.getStatus()))
                .filter(a -> !appointment.getId().equals(a.getId()))
                .filter(a -> a.getAppointmentTime().equals(newTime))
                .findFirst()
                .ifPresent(staleCancelled -> {
                    appointmentRepository.delete(staleCancelled);
                    appointmentRepository.flush();
                });

        String prevStatusReschedule = appointment.getStatus();
        appointment.setAppointmentDate(date);
        appointment.setAppointmentTime(newTime);
        appointment.setDuration(newDuration);
        appointment.setCancellationReason(null);
        appointment.setCancellationBy(null);
        appointment.setLateCancellation(false);
        if ("CANCELLED".equals(appointment.getStatus())) {
            appointment.setStatus("PENDING");
        }
        if ("CONFIRMED".equals(appointment.getStatus())) {
            try {
                upsertCalendarEvent(appointment);
            } catch (Exception e) {
                // Takvim guncellemesi basarisiz olursa randevu yeniden planlamayi engelleme
                log.warn("Takvim etkinligi guncellenemedi (randevu yeniden planlandi): {}", e.getMessage());
            }
        }

        Appointment saved = appointmentRepository.save(appointment);
        User rescheduledBy = userRepository.findById(userId).orElse(null);
        recordHistory(saved, prevStatusReschedule, saved.getStatus(), rescheduledBy,
                "Yeniden planlandi: " + date + " " + newTime.format(TIME_FORMAT));
        UUID targetUserId = isParent ? appointment.getExpert().getId() : parentId;
        if (targetUserId != null) {
            notificationService.createNotification(
                    targetUserId,
                    "APPOINTMENT_RESCHEDULED",
                    "Randevu yeniden planlandi",
                    appointment.getAppointmentDate() + " tarihli randevu " + appointment.getAppointmentTime().format(TIME_FORMAT) + " saatine tasindi.",
                    "/randevular",
                    appointment.getId()
            );
        }
        auditLogService.log(userRepository.findById(userId).orElse(null), "APPOINTMENT_RESCHEDULED", "APPOINTMENT", appointment.getId(), Map.of(
                "date", date.toString(),
                "time", newTime.format(TIME_FORMAT)
        ));
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto updateAppointment(UUID appointmentId, UUID userId, String notes, String type, String meetingLink) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        UUID parentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        boolean isParent = parentId != null && parentId.equals(userId);
        boolean isExpert = appointment.getExpert().getId().equals(userId);
        if (!isParent && !isExpert) {
            throw new AccessDeniedException("Bu randevuyu duzenleme yetkiniz yok");
        }
        if ("COMPLETED".equals(appointment.getStatus()) || "CANCELLED".equals(appointment.getStatus())) {
            throw new RuntimeException("Tamamlanmis veya iptal edilmis randevular duzenlenemez");
        }
        if (notes != null) {
            appointment.setNotes(notes.isBlank() ? null : notes.trim());
        }
        if (type != null && !type.isBlank()) {
            String normalized = type.trim().toUpperCase();
            if (!"ONLINE".equals(normalized) && !"FACE_TO_FACE".equals(normalized)) {
                throw new RuntimeException("Gecersiz randevu tipi");
            }
            appointment.setType(normalized);
            if ("FACE_TO_FACE".equals(normalized)) {
                appointment.setMeetingLink(null);
            }
        }
        // Sadece uzman meeting link ekleyebilir ve sadece ONLINE randevulara
        if (meetingLink != null && isExpert) {
            if ("ONLINE".equals(appointment.getType())) {
                appointment.setMeetingLink(meetingLink.isBlank() ? null : meetingLink.trim());
                if (appointment.getParent() != null && !meetingLink.isBlank()) {
                    notificationService.createNotification(
                            appointment.getParent().getId(),
                            "MEETING_LINK_ADDED",
                            "Görüşme linki eklendi",
                            appointment.getExpert().getFullName() + " online randevunuz için görüşme linki ekledi.",
                            "/randevular",
                            appointment.getId()
                    );
                }
            }
        }
        if ("CONFIRMED".equals(appointment.getStatus())) {
            upsertCalendarEvent(appointment);
        }
        return toDto(appointmentRepository.save(appointment));
    }

    @Transactional
    public void deleteAppointment(UUID appointmentId, UUID userId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        UUID parentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        boolean isParent = parentId != null && parentId.equals(userId);
        boolean isExpert = appointment.getExpert().getId().equals(userId);
        if (!isParent && !isExpert) {
            throw new AccessDeniedException("Bu randevuyu silme yetkiniz yok");
        }
        deleteLinkedCalendarEvent(appointment);
        appointment.setDeletedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);
        auditLogService.log(
                userRepository.findById(userId).orElse(null),
                "APPOINTMENT_DELETED",
                "APPOINTMENT",
                appointmentId,
                Map.of()
        );
    }

    @Transactional
    public AppointmentDto updateSessionNotes(UUID appointmentId, UUID expertId, String sessionNotes,
                                             String sessionSummary, String recommendations, String followUpTask) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        if (!appointment.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Sadece uzman seans notu ekleyebilir");
        }
        if (!"COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Seans notu sadece tamamlanmis randevulara eklenebilir");
        }

        appointment.setSessionNotes(sessionNotes.trim());
        appointment.setSessionSummary(blankToNull(sessionSummary));
        appointment.setFollowUpRecommendations(blankToNull(recommendations));
        appointment.setFollowUpTask(blankToNull(followUpTask));
        Appointment saved = appointmentRepository.save(appointment);
        if (appointment.getParent() != null) {
            notificationService.createNotification(
                    appointment.getParent().getId(),
                    "SESSION_NOTES_ADDED",
                    "Seans notu eklendi",
                    appointment.getExpert().getFullName() + " tamamlanan seans icin not ekledi.",
                    "/randevular",
                    appointment.getId()
            );
        }
        auditLogService.log(userRepository.findById(expertId).orElse(null), "SESSION_NOTES_UPDATED", "APPOINTMENT", appointment.getId(), Map.of());
        return toDto(saved);
    }

    @Transactional
    public AppointmentDto completeAppointment(UUID appointmentId, UUID expertId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        if (!appointment.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Sadece uzman randevuyu tamamlandi olarak isaretleyebilir");
        }
        if (!"CONFIRMED".equals(appointment.getStatus())) {
            throw new RuntimeException("Sadece onaylanmis randevular tamamlandi olarak isaretlenebilir");
        }
        validateStatusTransition(appointment.getStatus(), "COMPLETED");

        appointment.setStatus("COMPLETED");
        syncLinkedCalendarEventStatus(appointment, "COMPLETED");
        Appointment saved = appointmentRepository.save(appointment);
        recordHistory(saved, "CONFIRMED", "COMPLETED", userRepository.findById(expertId).orElse(null), null);

        patientService.syncConnectionFromCompletedAppointment(saved);

        if (appointment.getParent() != null) {
            notificationService.createNotification(
                    appointment.getParent().getId(),
                    "APPOINTMENT_COMPLETED",
                    "Seansiniz tamamlandi",
                    appointment.getExpert().getFullName() + " ile olan seansiniz tamamlandi olarak isaretlendi.",
                    "/randevular",
                    appointment.getId()
            );
        }

        auditLogService.log(
                userRepository.findById(expertId).orElse(null),
                "APPOINTMENT_COMPLETED",
                "APPOINTMENT",
                appointment.getId(),
                Map.of()
        );
        return toDto(saved);
    }

    private Child resolveChildForParent(UUID parentId, UUID childId) {
        if (childId != null) {
            Child child = childRepository.findById(childId)
                    .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
            if (!child.getParent().getId().equals(parentId)) {
                throw new AccessDeniedException("Bu cocuk size ait degil");
            }
            return child;
        }

        return childRepository.findByParentId(parentId).stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Once bir cocuk profili olusturmalisiniz"));
    }

    private void validateAvailability(UUID expertId, LocalDate date, LocalTime time, int durationMinutes) {
        ExpertAvailability availability = findAvailabilityForDate(expertId, date);
        if (!availability.isEnabled() || availability.getStartTime() == null || availability.getEndTime() == null) {
            throw new RuntimeException("Uzman secilen gun calismiyor");
        }
        if (time.isBefore(availability.getStartTime()) || time.isAfter(availability.getEndTime().minus(durationMinutes, ChronoUnit.MINUTES))) {
            throw new RuntimeException("Secilen saat uzmanin calisma plani disinda");
        }
        // Uzmanin manuel olarak kapattigi (blockedSlots) saatleri kontrol et
        boolean overlapsBlockedSlot = blockedSlotTimesForDate(availability, date).stream()
                .anyMatch(blockedTime -> timesOverlap(time, durationMinutes, blockedTime, DEFAULT_DURATION_MINUTES));
        if (overlapsBlockedSlot) {
            throw new RuntimeException("Secilen saat uzman tarafindan kapatilmis");
        }
    }

    private LocalTime parseTime(String rawTime, boolean strict) {
        if (rawTime == null || rawTime.isBlank()) {
            if (strict) throw new RuntimeException("Saat bilgisi zorunludur");
            return LocalTime.of(9, 0);
        }
        try {
            return LocalTime.parse(rawTime, TIME_FORMAT);
        } catch (DateTimeParseException ex) {
            if (strict) {
                throw new RuntimeException("Gecersiz saat formati");
            }
            return LocalTime.of(9, 0);
        }
    }

    private ExpertAvailabilityDto toDto(ExpertAvailability item) {
        return ExpertAvailabilityDto.builder()
                .dayOfWeek(item.getDayOfWeek())
                .enabled(item.isEnabled())
                .startTime(item.getStartTime() == null ? null : item.getStartTime().format(TIME_FORMAT))
                .endTime(item.getEndTime() == null ? null : item.getEndTime().format(TIME_FORMAT))
                .blockedSlots(item.getBlockedSlots() != null ? new java.util.ArrayList<>(item.getBlockedSlots()) : new java.util.ArrayList<>())
                .build();
    }

    private AppointmentDto toDto(Appointment appointment) {
        return AppointmentDto.builder()
                .id(appointment.getId())
                .expertId(appointment.getExpert().getId())
                .expertName(appointment.getExpert().getFullName())
                .expertTitle(appointment.getExpert().getExpertTitle())
                .parentId(appointment.getParent() != null ? appointment.getParent().getId() : null)
                .parentName(appointment.getParent() != null ? appointment.getParent().getFullName() : "Sistem (Kapali)")
                .childId(appointment.getChild() != null ? appointment.getChild().getId() : null)
                .childName(appointment.getChild() != null ? appointment.getChild().getName() : "-")
                .date(appointment.getAppointmentDate())
                .time(appointment.getAppointmentTime().format(TIME_FORMAT))
                .duration(appointment.getDuration())
                .type(appointment.getType())
                .status(appointment.getStatus())
                .notes(appointment.getNotes())
                .sessionNotes(appointment.getSessionNotes())
                .sessionSummary(appointment.getSessionSummary())
                .followUpRecommendations(appointment.getFollowUpRecommendations())
                .followUpTask(appointment.getFollowUpTask())
                .appointmentTopic(appointment.getAppointmentTopic())
                .preSessionNotes(appointment.getPreSessionNotes())
                .cancellationReason(appointment.getCancellationReason())
                .meetingLink(appointment.getMeetingLink())
                .calendarEventId(appointment.getCalendarEventId())
                .createdAt(appointment.getCreatedAt())
                .rating(appointment.getRating())
                .ratingComment(appointment.getRatingComment())
                .recurringGroupId(appointment.getRecurringGroupId())
                .recurrenceIndex(appointment.getRecurrenceIndex())
                .lateCancellation(appointment.isLateCancellation())
                .cancellationBy(appointment.getCancellationBy())
                .build();
    }

    @Transactional
    public ExpertAvailabilityDto blockSlot(UUID expertId, LocalDate date, String time) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new AccessDeniedException("Sadece uzmanlar saat kapatabilir");
        }

        lockExpertSchedule(expertId);

        LocalTime apptTime = parseTime(time, true);
        ExpertAvailability availability = findAvailabilityForDate(expertId, date);

        if (!availability.isEnabled() || availability.getStartTime() == null || availability.getEndTime() == null) {
            throw new RuntimeException("Uzman secilen gun calismiyor");
        }
        if (apptTime.isBefore(availability.getStartTime()) || apptTime.isAfter(availability.getEndTime().minus(DEFAULT_DURATION_MINUTES, ChronoUnit.MINUTES))) {
            throw new RuntimeException("Secilen saat uzmanin calisma plani disinda");
        }

        List<Appointment> existing = appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expertId, date);
        boolean isConflict = existing.stream()
                .filter(this::isBookableAppointment)
                .anyMatch(a -> timesOverlap(apptTime, DEFAULT_DURATION_MINUTES, a.getAppointmentTime(), appointmentDuration(a)));

        if (isConflict) {
            throw new RuntimeException("Bu saatte mevcut bir randevu var");
        }

        List<String> blockedSlots = availability.getBlockedSlots();
        if (blockedSlots == null) {
            blockedSlots = new java.util.ArrayList<>();
            availability.setBlockedSlots(blockedSlots);
        }
        String timeStr = apptTime.format(TIME_FORMAT);
        String dateSlotKey = dateSlotKey(date, apptTime);
        if (!blockedSlots.contains(dateSlotKey)) {
            blockedSlots.add(dateSlotKey);
        }

        auditLogService.log(expert, "AVAILABILITY_SLOT_BLOCKED", "USER", expert.getId(), Map.of(
                "date", date.toString(),
                "time", timeStr
        ));
        return toDto(availabilityRepository.save(availability));
    }

    @Transactional
    public void unblockSlot(UUID expertId, LocalDate date, String time) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new AccessDeniedException("Sadece uzmanlar saat acabilir");
        }

        LocalTime apptTime = parseTime(time, true);
        ExpertAvailability availability = findAvailabilityForDate(expertId, date);
        String timeStr = apptTime.format(TIME_FORMAT);
        if (availability.getBlockedSlots() != null) {
            boolean removedDateSlot = availability.getBlockedSlots().remove(dateSlotKey(date, apptTime));
            boolean removedWeeklySlot = availability.getBlockedSlots().remove(timeStr);
            if (!removedDateSlot && !removedWeeklySlot) {
                return;
            }
            availabilityRepository.save(availability);
            auditLogService.log(expert, "AVAILABILITY_SLOT_UNBLOCKED", "USER", expert.getId(), Map.of(
                    "date", date.toString(),
                    "time", timeStr
            ));
        }
    }

    private void lockExpertSchedule(UUID expertId) {
        userRepository.lockById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
    }

    private void assertRecurringGroupAccess(List<Appointment> group, UUID userId) {
        if (group.stream().noneMatch(appt -> canAccessAppointment(appt, userId))) {
            throw new AccessDeniedException("Bu randevu serisine erisim yetkiniz yok");
        }
    }

    private boolean canAccessAppointment(Appointment appointment, UUID userId) {
        UUID parentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        boolean isParent = parentId != null && parentId.equals(userId);
        boolean isExpert = appointment.getExpert() != null && appointment.getExpert().getId().equals(userId);
        return isParent || isExpert;
    }

    private ExpertAvailability findAvailabilityForDate(UUID expertId, LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        return availabilityRepository.findByExpertIdAndDayOfWeek(expertId, dayOfWeek.getValue())
                .orElseThrow(() -> new RuntimeException("Uzman secilen gun calismiyor"));
    }

    private boolean isBookableAppointment(Appointment appointment) {
        return BOOKING_BLOCKING_STATUSES.contains(appointment.getStatus());
    }

    private void ensureNoAppointmentConflict(UUID expertId, LocalDate date, LocalTime time, int duration, UUID ignoredAppointmentId) {
        List<Appointment> existingForDay = appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expertId, date);

        boolean hasExactConflict = existingForDay.stream()
                .filter(this::isBookableAppointment)
                .anyMatch(a -> a.getAppointmentTime().equals(time) && (ignoredAppointmentId == null || !ignoredAppointmentId.equals(a.getId())));
        if (hasExactConflict) {
            throw new RuntimeException("Seçilen saat dolu");
        }

        boolean hasActiveConflict = existingForDay.stream()
                .filter(this::isBookableAppointment)
                .filter(a -> ignoredAppointmentId == null || !ignoredAppointmentId.equals(a.getId()))
                .anyMatch(a -> timesOverlap(time, duration, a.getAppointmentTime(), appointmentDuration(a)));
        if (hasActiveConflict) {
            throw new RuntimeException("Seçilen saat dolu");
        }
    }

    private int resolveDuration(int duration) {
        if (duration <= 0) return DEFAULT_DURATION_MINUTES;
        if (duration < MIN_DURATION_MINUTES) {
            throw new RuntimeException("Randevu suresi en az " + MIN_DURATION_MINUTES + " dakika olmalidir");
        }
        if (duration > MAX_DURATION_MINUTES) {
            throw new RuntimeException("Randevu suresi en fazla " + MAX_DURATION_MINUTES + " dakika olabilir");
        }
        return duration;
    }

    private void validateStatusTransition(String from, String to) {
        java.util.Set<String> allowed = VALID_TRANSITIONS.getOrDefault(from, java.util.Set.of());
        if (!allowed.contains(to)) {
            throw new RuntimeException("Gecersiz durum gecisi: " + from + " → " + to);
        }
    }

    private boolean isLateCancellation(Appointment appointment) {
        LocalDateTime appointmentDateTime = LocalDateTime.of(
                appointment.getAppointmentDate(), appointment.getAppointmentTime());
        return LocalDateTime.now().plusHours(LATE_CANCELLATION_HOURS).isAfter(appointmentDateTime);
    }

    private String resolveAppointmentType(String type) {
        if (type == null || type.isBlank()) {
            throw new RuntimeException("Randevu tipi zorunludur");
        }
        String normalized = type.trim().toUpperCase();
        if (!"ONLINE".equals(normalized) && !"FACE_TO_FACE".equals(normalized)) {
            throw new RuntimeException("Gecersiz randevu tipi");
        }
        return normalized;
    }

    private int appointmentDuration(Appointment appointment) {
        return appointment.getDuration() != null && appointment.getDuration() > 0
                ? appointment.getDuration()
                : DEFAULT_DURATION_MINUTES;
    }

    private boolean timesOverlap(LocalTime startA, int durationA, LocalTime startB, int durationB) {
        LocalTime endA = startA.plusMinutes(durationA);
        LocalTime endB = startB.plusMinutes(durationB);
        return startA.isBefore(endB) && endA.isAfter(startB);
    }

    private List<LocalTime> generateTimeSlots(LocalTime startTime, LocalTime endTime, int durationMinutes) {
        java.util.ArrayList<LocalTime> slots = new java.util.ArrayList<>();
        LocalTime cursor = startTime;
        while (!cursor.plusMinutes(durationMinutes).isAfter(endTime)) {
            slots.add(cursor);
            cursor = cursor.plusMinutes(SLOT_STEP_MINUTES);
        }
        return slots;
    }

    private List<LocalTime> blockedSlotTimesForDate(ExpertAvailability availability, LocalDate date) {
        if (availability.getBlockedSlots() == null) return List.of();
        return availability.getBlockedSlots().stream()
                .map(slot -> parseBlockedSlotForDate(slot, date))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private java.util.ArrayList<String> normalizeBlockedSlots(List<String> blockedSlots) {
        java.util.ArrayList<String> normalized = new java.util.ArrayList<>();
        if (blockedSlots == null) {
            return normalized;
        }
        Set<String> seen = new LinkedHashSet<>();
        for (String slot : blockedSlots) {
            String normalizedSlot = normalizeBlockedSlot(slot);
            if (normalizedSlot != null && seen.add(normalizedSlot)) {
                normalized.add(normalizedSlot);
            }
        }
        return normalized;
    }

    private String normalizeBlockedSlot(String slot) {
        if (slot == null || slot.isBlank()) {
            return null;
        }
        String trimmed = slot.trim();
        if (trimmed.contains("|")) {
            String[] parts = trimmed.split("\\|", 2);
            if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
                throw new RuntimeException("Gecersiz kapali saat formati");
            }
            LocalDate date = LocalDate.parse(parts[0].trim());
            LocalTime time = parseTime(parts[1].trim(), true);
            return dateSlotKey(date, time);
        }
        return parseTime(trimmed, true).format(TIME_FORMAT);
    }

    private LocalTime parseBlockedSlotForDate(String slot, LocalDate date) {
        if (slot == null || slot.isBlank()) return null;
        String timePart = slot;
        if (slot.contains("|")) {
            String[] parts = slot.split("\\|", 2);
            if (parts.length != 2 || !date.toString().equals(parts[0])) return null;
            timePart = parts[1];
        }
        try {
            return LocalTime.parse(timePart, TIME_FORMAT);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String dateSlotKey(LocalDate date, LocalTime time) {
        return date + "|" + time.format(TIME_FORMAT);
    }

    private void upsertCalendarEvent(Appointment appointment) {
        if (appointment.getChild() == null || appointment.getParent() == null) return;

        CalendarEvent event = appointment.getCalendarEventId() != null
                ? calendarEventRepository.findById(appointment.getCalendarEventId()).orElseGet(CalendarEvent::new)
                : new CalendarEvent();

        LocalDateTime start = LocalDateTime.of(appointment.getAppointmentDate(), appointment.getAppointmentTime());
        event.setChild(appointment.getChild());
        event.setTitle("Randevu: " + appointment.getExpert().getFullName());
        event.setDescription((appointment.getType() == null ? "Randevu" : appointment.getType())
                + (appointment.getMeetingLink() != null ? "\nGorusme linki: " + appointment.getMeetingLink() : ""));
        event.setEventType("APPOINTMENT");
        event.setStartTime(start);
        event.setEndTime(start.plusMinutes(appointmentDuration(appointment)));
        event.setReminderMinutesBefore(60);
        event.setStatus("COMPLETED".equals(appointment.getStatus()) ? "COMPLETED" : "PLANNED");
        event.setLocation("ONLINE".equals(appointment.getType()) ? "Online görüşme" : null);
        event.setColor("#4F46E5");

        CalendarEvent saved = calendarEventRepository.save(event);
        appointment.setCalendarEventId(saved.getId());
    }

    private void syncLinkedCalendarEventStatus(Appointment appointment, String status) {
        if (appointment.getCalendarEventId() == null) return;
        calendarEventRepository.findById(appointment.getCalendarEventId()).ifPresent(event -> {
            event.setStatus(status);
            calendarEventRepository.save(event);
        });
    }

    private void deleteLinkedCalendarEvent(Appointment appointment) {
        if (appointment.getCalendarEventId() == null) return;
        calendarEventRepository.findById(appointment.getCalendarEventId())
                .ifPresent(calendarEventRepository::delete);
        appointment.setCalendarEventId(null);
    }

    @Transactional
    public AppointmentDto rateAppointment(UUID appointmentId, UUID parentId, int rating, String comment) {
        if (rating < 1 || rating > 5) {
            throw new RuntimeException("Puan 1 ile 5 arasinda olmalidir");
        }
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        UUID apptParentId = appointment.getParent() != null ? appointment.getParent().getId() : null;
        if (apptParentId == null || !apptParentId.equals(parentId)) {
            throw new AccessDeniedException("Sadece randevunun ebeveyni degerlendirme yapabilir");
        }
        if (!"COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Sadece tamamlanmis randevular degerlendirilebilir");
        }
        appointment.setRating(rating);
        appointment.setRatingComment(comment != null && !comment.isBlank() ? comment.trim() : null);
        Appointment saved = appointmentRepository.save(appointment);

        // Uzmana bildirim
        notificationService.createNotification(
                appointment.getExpert().getId(),
                "APPOINTMENT_RATED",
                "Randevu degerlendirildi",
                appointment.getParent().getFullName() + " randevuyu " + rating + "/5 puan ile degerlendirdi.",
                "/randevular",
                appointment.getId()
        );
        auditLogService.log(
                userRepository.findById(parentId).orElse(null),
                "APPOINTMENT_RATED",
                "APPOINTMENT",
                appointmentId,
                Map.of("rating", rating)
        );
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> getPatientSummaries(UUID expertId) {
        List<PatientSummaryProjection> summaries = appointmentRepository.getPatientSummariesGrouped(expertId);
        return summaries.stream().map(s -> {
            java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
            summary.put("parentId", s.getParentId().toString());
            summary.put("parentName", s.getParentName());
            summary.put("childId", s.getChildId() != null ? s.getChildId().toString() : null);
            summary.put("childName", s.getChildId() != null ? s.getChildName() : "-");
            summary.put("totalAppointments", s.getTotalAppointments());
            summary.put("completedAppointments", s.getCompletedAppointments());
            summary.put("lastAppointmentDate", s.getLastAppointmentDate() != null ? s.getLastAppointmentDate().toString() : null);
            
            List<Appointment> lastAppts = appointmentRepository.findByExpertIdAndParentId(expertId, s.getParentId());
            String status = null;
            if (lastAppts != null && !lastAppts.isEmpty()) {
                Appointment lastAppt = lastAppts.stream()
                    .filter(a -> !"BLOCKED".equals(a.getStatus()))
                    .filter(a -> s.getChildId() == null || (a.getChild() != null && s.getChildId().equals(a.getChild().getId())))
                    .max(java.util.Comparator.comparing(a -> a.getAppointmentDate().atTime(a.getAppointmentTime())))
                    .orElse(null);
                if (lastAppt != null) {
                    status = lastAppt.getStatus();
                }
            }
            summary.put("lastAppointmentStatus", status);
            
            summary.put("avgRating", s.getAvgRating() != null ? Math.round(s.getAvgRating() * 10.0) / 10.0 : null);
            return summary;
        }).sorted(java.util.Comparator.comparing(m -> m.get("lastAppointmentDate") == null ? "" : (String) m.get("lastAppointmentDate"), java.util.Comparator.reverseOrder()))
        .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentHistoryDto> getHistory(UUID appointmentId, UUID requesterId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Randevu bulunamadi"));
        boolean isRequesterExpert = appt.getExpert().getId().equals(requesterId);
        boolean isRequesterParent = appt.getParent() != null && appt.getParent().getId().equals(requesterId);
        if (!isRequesterExpert && !isRequesterParent) {
            throw new org.springframework.security.access.AccessDeniedException("Bu randevunun gecmisine erisim yetkiniz yok");
        }
        return historyRepository.findByAppointmentId(appointmentId).stream()
                .map(h -> AppointmentHistoryDto.builder()
                        .id(h.getId())
                        .oldStatus(h.getOldStatus())
                        .newStatus(h.getNewStatus())
                        .changedById(h.getChangedBy() != null ? h.getChangedBy().getId() : null)
                        .changedByName(h.getChangedBy() != null ? h.getChangedBy().getFullName() : "Sistem")
                        .note(h.getNote())
                        .changedAt(h.getChangedAt())
                        .build())
                .toList();
    }

    private void recordHistory(Appointment appointment, String oldStatus, String newStatus, User changedBy, String note) {
        historyRepository.save(AppointmentStatusHistory.builder()
                .appointment(appointment)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedBy(changedBy)
                .note(note)
                .build());
    }
}
