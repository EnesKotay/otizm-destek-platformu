package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTest {
    @TempDir Path tempDir;

    @Test
    void storesFileOnlyWhenExtensionMimeAndSignatureMatch() {
        FileStorageService service = service();
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2};
        String filename = service.store(new MockMultipartFile("file", "child.png", "image/png", png));
        assertThat(filename).endsWith(".png");
        assertThat(service.load(filename)).exists();
    }

    @Test
    void rejectsSpoofedMimeAndMismatchedExtension() {
        FileStorageService service = service();
        assertThatThrownBy(() -> service.store(new MockMultipartFile(
                "file", "report.png", "image/png", "%PDF-fake".getBytes())))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile(
                "file", "report.jpg", "application/pdf", "%PDF-1.7".getBytes())))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void deletesStoredLocalFile() {
        FileStorageService service = service();
        String filename = service.store(new MockMultipartFile(
                "file", "note.txt", "text/plain", "safe note".getBytes()));

        service.delete(filename);

        assertThat(service.load(filename)).doesNotExist();
    }

    private FileStorageService service() {
        FileStorageService service = new FileStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        return service;
    }
}
