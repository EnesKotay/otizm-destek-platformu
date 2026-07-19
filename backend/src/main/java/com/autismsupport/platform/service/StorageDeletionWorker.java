package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageDeletionWorker {
    private final JdbcTemplate jdbcTemplate;
    private final FileStorageService fileStorageService;

    @Scheduled(fixedDelayString = "${app.storage.deletion-interval-ms:60000}", initialDelay = 15000)
    public void deleteQueuedObjects() {
        List<String> filenames;
        try {
            filenames = jdbcTemplate.queryForList(
                    "SELECT filename FROM storage_deletion_queue ORDER BY created_at LIMIT 50",
                    String.class);
        } catch (org.springframework.dao.DataAccessException exception) {
            log.debug("Depolama silme kuyruğu henüz hazır değil");
            return;
        }
        for (String filename : filenames) {
            try {
                fileStorageService.delete(filename);
                jdbcTemplate.update("DELETE FROM storage_deletion_queue WHERE filename = ?", filename);
            } catch (Exception exception) {
                jdbcTemplate.update("UPDATE storage_deletion_queue SET attempts = attempts + 1, last_error = ? WHERE filename = ?",
                        safeMessage(exception), filename);
                log.warn("Depolama silme işlemi daha sonra yeniden denenecek: {}", filename);
            }
        }
    }

    private String safeMessage(Exception exception) {
        String message = exception.getClass().getSimpleName();
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
