package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateDataSubjectRequest {

    /** BILGI_TALEBI, DUZELTME, SILME, AKTARIM_BILGISI, ISLEMEYE_ITIRAZ, ZARARIN_GIDERILMESI */
    @NotNull(message = "Başvuru türü zorunludur")
    private String requestType;

    @NotBlank(message = "Başvuru açıklaması zorunludur")
    @Size(max = 4000, message = "Açıklama en fazla 4000 karakter olabilir")
    private String description;

    /** Boş bırakılırsa hesabın e-posta adresi kullanılır. */
    @Email(message = "Geçerli bir e-posta adresi girin")
    private String contactEmail;
}
