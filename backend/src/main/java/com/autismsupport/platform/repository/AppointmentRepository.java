package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Appointment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.parent.id = :parentId ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findByParentIdOrderByAppointmentDateAscAppointmentTimeAsc(@Param("parentId") UUID parentId);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findByExpertIdOrderByAppointmentDateAscAppointmentTimeAsc(@Param("expertId") UUID expertId);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId AND a.status IN :statuses ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findByExpertIdAndStatusInOrderByAppointmentDateAscAppointmentTimeAsc(@Param("expertId") UUID expertId, @Param("statuses") List<String> statuses);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId AND a.parent.id = :parentId")
    List<Appointment> findByExpertIdAndParentId(@Param("expertId") UUID expertId, @Param("parentId") UUID parentId);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId AND a.parent.id = :parentId AND a.status IN :statuses")
    List<Appointment> findByExpertIdAndParentIdAndStatusIn(@Param("expertId") UUID expertId, @Param("parentId") UUID parentId, @Param("statuses") List<String> statuses);

    long countByExpertId(UUID expertId);
    long countByExpertIdAndStatus(UUID expertId, String status);
    boolean existsByExpertIdAndChildIdAndStatusIn(UUID expertId, UUID childId, List<String> statuses);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId AND a.appointmentDate = :date ORDER BY a.appointmentTime ASC")
    List<Appointment> findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(@Param("expertId") UUID expertId, @Param("date") LocalDate date);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.expert.id = :expertId AND a.appointmentDate BETWEEN :from AND :to ORDER BY a.appointmentDate ASC")
    List<Appointment> findByExpertIdAndAppointmentDateBetweenOrderByAppointmentDateAsc(@Param("expertId") UUID expertId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.appointmentDate = :date ORDER BY a.appointmentTime ASC")
    List<Appointment> findByAppointmentDateOrderByAppointmentTimeAsc(@Param("date") LocalDate date);

    // Tarihi geçmiş ama hâlâ CONFIRMED durumundaki randevular (otomatik tamamlama için)
    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.status = 'CONFIRMED' AND (a.appointmentDate < :today OR (a.appointmentDate = :today AND a.appointmentTime < :now))")
    List<Appointment> findExpiredConfirmedAppointments(@Param("today") LocalDate today, @Param("now") LocalTime now);

    // 48 saat içinde randevusu olan ama hâlâ PENDING durumundaki randevular (otomatik iptal için)
    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.status = 'PENDING' AND (a.appointmentDate < :cutoffDate OR (a.appointmentDate = :cutoffDate AND a.appointmentTime <= :cutoffTime))")
    List<Appointment> findPendingAppointmentsBeforeCutoff(@Param("cutoffDate") LocalDate cutoffDate, @Param("cutoffTime") LocalTime cutoffTime);

    // Recurring group — seri içindeki tüm randevular
    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.expert LEFT JOIN FETCH a.parent LEFT JOIN FETCH a.child WHERE a.recurringGroupId = :groupId ORDER BY a.appointmentDate ASC, a.appointmentTime ASC")
    List<Appointment> findByRecurringGroupId(@Param("groupId") UUID groupId);

    @Modifying
    @Query("UPDATE Appointment a SET a.status = 'CANCELLED' WHERE a.expert.id = :expertId AND a.child.id = :childId AND a.status IN ('PENDING', 'CONFIRMED')")
    int cancelPendingByExpertAndChild(@Param("expertId") UUID expertId, @Param("childId") UUID childId);

    @Query("SELECT AVG(a.rating) FROM Appointment a WHERE a.expert.id = :expertId AND a.rating IS NOT NULL")
    Double getAverageRatingByExpertId(@Param("expertId") UUID expertId);

    @Query("SELECT a.child.id AS childId, MAX(a.appointmentDate) AS lastDate FROM Appointment a WHERE a.expert.id = :expertId AND a.child.id IN :childIds AND a.status = 'COMPLETED' GROUP BY a.child.id")
    List<LastSessionProjection> findLastSessionsByExpertAndChildren(@Param("expertId") UUID expertId, @Param("childIds") List<UUID> childIds);

    // Günlük aktif randevu sayısı (kapasite kontrolü için)
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.expert.id = :expertId AND a.appointmentDate = :date AND a.status IN ('PENDING', 'CONFIRMED')")
    long countActiveByExpertIdAndDate(@Param("expertId") UUID expertId, @Param("date") LocalDate date);

    // Çift rezervasyonu önlemek için pessimistic write lock — eş zamanlı booking'leri sıralar
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.expert.id = :expertId AND a.appointmentDate = :date AND a.status IN ('PENDING', 'CONFIRMED')")
    List<Appointment> lockActiveSlotsByExpertAndDate(@Param("expertId") UUID expertId, @Param("date") LocalDate date);

    @Query("SELECT a.parent.id AS parentId, a.parent.fullName AS parentName, " +
           "a.child.id AS childId, a.child.name AS childName, " +
           "COUNT(a) AS totalAppointments, " +
           "SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedAppointments, " +
           "AVG(a.rating) AS avgRating, " +
           "MAX(a.appointmentDate) AS lastAppointmentDate " +
           "FROM Appointment a " +
           "WHERE a.expert.id = :expertId AND a.parent IS NOT NULL AND a.status != 'BLOCKED' " +
           "GROUP BY a.parent.id, a.parent.fullName, a.child.id, a.child.name")
    List<PatientSummaryProjection> getPatientSummariesGrouped(@Param("expertId") UUID expertId);
}
