package com.autismsupport.platform.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Güçlü şifre kuralını uygulayan doğrulama anotasyonu.
 * Kayıt, şifre sıfırlama ve şifre değiştirme akışlarında kullanılır.
 * (Giriş akışında KULLANILMAZ; mevcut kullanıcıların eski şifreleriyle giriş yapabilmesi için.)
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {
    String message() default "Şifre en az 8 karakter olmalı; bir büyük harf, bir rakam ve bir özel karakter içermelidir";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
