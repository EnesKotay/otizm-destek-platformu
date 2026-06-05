package com.autismsupport.platform.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSettingsDto {
    private Boolean maintenanceMode;
    private Boolean registrationsOpen;
    private Boolean aiEnabled;
}
