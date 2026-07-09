package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivitySummaryDto {
    /** PARENT rolündeki kullanıcılar için çocuk sayısı; diğer roller için null. */
    private Long childrenCount;
    /** EXPERT rolündeki kullanıcılar için randevu sayısı; diğer roller için null. */
    private Long appointmentsCount;
    private long forumPostsCount;
    /** Sistemde bu kullanıcı için kayıtlı denetim (audit log) işlemi sayısı. */
    private long trackedActionsCount;
    private List<AuditLogDto> recentActions;
}
