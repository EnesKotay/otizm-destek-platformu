package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * KVKK md. 11 kapsamındaki ilgili kişi başvurusu. Veri sorumlusu md. 13/2
 * uyarınca talebi en geç otuz gün içinde sonuçlandırmak zorundadır; bu yüzden
 * her kayıtta bir son tarih tutulur ve gecikenler yöneticiye gösterilir.
 */
@Entity
@Table(name = "data_subject_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSubjectRequest {

    /** KVKK md. 11'de sayılan haklar. */
    public enum RequestType {
        BILGI_TALEBI,        // işlenip işlenmediğini öğrenme / bilgi talep etme
        DUZELTME,            // eksik veya yanlış işlenen verinin düzeltilmesi
        SILME,               // silinmesini / yok edilmesini isteme
        AKTARIM_BILGISI,     // aktarıldığı üçüncü kişileri bilme
        ISLEMEYE_ITIRAZ,     // otomatik analiz sonucuna itiraz
        ZARARIN_GIDERILMESI  // zararın giderilmesini talep etme
    }

    public enum Status {
        ACIK, INCELENIYOR, TAMAMLANDI, REDDEDILDI
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Hesabı silinmiş olsa da başvuru kaydı kalır (SET NULL). */
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 48)
    private RequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    @Builder.Default
    private Status status = Status.ACIK;

    @Column(name = "contact_email", nullable = false)
    private String contactEmail;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String response;

    /** Yasal yanıt son tarihi: başvuru + 30 gün. */
    @Column(name = "due_at", nullable = false)
    private LocalDateTime dueAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "handled_by")
    private UUID handledBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean isOverdue() {
        return (status == Status.ACIK || status == Status.INCELENIYOR)
                && dueAt != null && dueAt.isBefore(LocalDateTime.now());
    }
}
