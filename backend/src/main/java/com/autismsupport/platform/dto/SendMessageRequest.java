package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.UUID;

@Data
public class SendMessageRequest {
    // Icerik bos olabilir (sadece dosya gonderimi icin)
    @Size(max = 4000, message = "Mesaj en fazla 4000 karakter olabilir")
    private String content;

    @Size(max = 30, message = "Mesaj tipi en fazla 30 karakter olabilir")
    private String messageType;

    @Size(max = 1000, message = "Dosya adresi en fazla 1000 karakter olabilir")
    private String fileUrl;

    @Size(max = 255, message = "Dosya adi en fazla 255 karakter olabilir")
    private String fileName;

    @Size(max = 100, message = "Dosya tipi en fazla 100 karakter olabilir")
    private String fileType;

    private UUID replyToId;
}
