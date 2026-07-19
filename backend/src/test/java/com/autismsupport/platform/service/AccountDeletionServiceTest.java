package com.autismsupport.platform.service;

import com.autismsupport.platform.model.StoredFile;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.RefreshTokenRepository;
import com.autismsupport.platform.repository.StoredFileRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {
    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock StoredFileRepository storedFileRepository;
    @Mock JdbcTemplate jdbcTemplate;
    @InjectMocks AccountDeletionService service;

    @Test
    void queuesOwnedObjectsBeforeDeletingAccount() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).build();
        when(storedFileRepository.findAllByOwnerId(userId)).thenReturn(List.of(
                StoredFile.builder().filename("private.pdf").ownerId(userId).build()));

        service.delete(user);

        verify(jdbcTemplate).update(anyString(), eq("private.pdf"));
        verify(refreshTokenRepository).deleteByUserId(userId);
        verify(userRepository).delete(user);
    }
}
