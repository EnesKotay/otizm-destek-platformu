package com.autismsupport.platform.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String accessToken;
    @JsonIgnore
    private String refreshToken;
    private UserDto user;
    @Builder.Default
    private boolean pendingApproval = false;
    @Builder.Default
    private boolean pendingEmailVerification = false;
    @Builder.Default
    private boolean mfaRequired = false;
    private String mfaToken;
}
