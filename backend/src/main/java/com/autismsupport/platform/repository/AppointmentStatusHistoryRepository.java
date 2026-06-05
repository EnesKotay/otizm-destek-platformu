package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.AppointmentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AppointmentStatusHistoryRepository extends JpaRepository<AppointmentStatusHistory, UUID> {

    @Query("SELECT h FROM AppointmentStatusHistory h LEFT JOIN FETCH h.changedBy WHERE h.appointment.id = :appointmentId ORDER BY h.changedAt ASC")
    List<AppointmentStatusHistory> findByAppointmentId(@Param("appointmentId") UUID appointmentId);
}
