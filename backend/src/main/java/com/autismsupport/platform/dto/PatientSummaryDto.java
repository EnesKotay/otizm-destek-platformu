package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientSummaryDto {
    private UUID id;
    private UUID parentId;
    private UUID childId;
    private String name;
    private String parentName;
    private int age;
    private String diagnosis;
    /** Null when no completed session exists. */
    private LocalDate lastSessionDate;
    private int tasksCompleted;
    private int totalTasks;
    /**
     * True when the patient appears only because of a completed appointment —
     * i.e. there is no explicit APPROVED ExpertPatientConnection record.
     * Shown as an "implicit access" hint in the UI.
     */
    private boolean implicit;
}
