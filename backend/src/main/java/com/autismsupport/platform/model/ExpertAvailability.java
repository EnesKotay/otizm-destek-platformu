package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "expert_availabilities", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"expert_id", "day_of_week"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpertAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expert_id", nullable = false)
    private User expert;

    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek;

    @Builder.Default
    private boolean enabled = false;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "expert_availability_blocked_slots", joinColumns = @JoinColumn(name = "availability_id"))
    @Column(name = "slot_time")
    @Builder.Default
    private java.util.List<String> blockedSlots = new java.util.ArrayList<>();
}
