package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String lastSession;
    private int tasksCompleted;
    private int totalTasks;
}
