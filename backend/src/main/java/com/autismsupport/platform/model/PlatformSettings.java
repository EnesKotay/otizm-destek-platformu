package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettings {

    @Id
    @Builder.Default
    private String id = "global";

    @Builder.Default
    @Column(name = "maintenance_mode", nullable = false)
    private boolean maintenanceMode = false;

    @Builder.Default
    @Column(name = "registrations_open", nullable = false)
    private boolean registrationsOpen = true;

    @Builder.Default
    @Column(name = "ai_enabled", nullable = false)
    private boolean aiEnabled = true;
}
