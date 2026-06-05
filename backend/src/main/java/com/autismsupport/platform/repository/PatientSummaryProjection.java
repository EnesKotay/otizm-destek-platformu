package com.autismsupport.platform.repository;

import java.time.LocalDate;
import java.util.UUID;

public interface PatientSummaryProjection {
    UUID getParentId();
    String getParentName();
    UUID getChildId();
    String getChildName();
    Long getTotalAppointments();
    Long getCompletedAppointments();
    Double getAvgRating();
    LocalDate getLastAppointmentDate();
}
