package com.autismsupport.platform.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    private static final int MIN_LENGTH = 8;
    // BCrypt yalnızca ilk 72 baytı dikkate alır; güvenli bir üst sınır belirliyoruz.
    private static final int MAX_LENGTH = 64;

    // Sık kullanılan / kolay tahmin edilebilen şifreler (küçük harfe çevrilerek karşılaştırılır).
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "12345678", "123456789", "1234567890", "password", "password1", "password123",
            "qwerty123", "qwertyuiop", "11111111", "00000000", "abc12345", "iloveyou",
            "admin123", "sifre123", "parola123", "1q2w3e4r", "q1w2e3r4", "12345678a",
            "aaaaaaaa", "1234abcd", "987654321", "asdfghjkl", "zxcvbnm1", "sifre1234",
            "deneme123", "test1234", "welcome1", "letmein1"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null/boş kontrolü @NotBlank tarafından yapılır; burada geçerli sayıyoruz.
        if (value == null) {
            return true;
        }

        String reason = null;
        if (value.length() < MIN_LENGTH) {
            reason = "Şifre en az " + MIN_LENGTH + " karakter olmalıdır";
        } else if (value.length() > MAX_LENGTH) {
            reason = "Şifre en fazla " + MAX_LENGTH + " karakter olabilir";
        } else if (value.chars().noneMatch(Character::isUpperCase)) {
            reason = "Şifre en az bir büyük harf içermelidir";
        } else if (value.chars().noneMatch(Character::isDigit)) {
            reason = "Şifre en az bir rakam içermelidir";
        } else if (value.chars().allMatch(Character::isLetterOrDigit)) {
            reason = "Şifre en az bir özel karakter (örn. ! ? * . -) içermelidir";
        } else if (COMMON_PASSWORDS.contains(value.toLowerCase())) {
            reason = "Bu şifre çok yaygın ve kolay tahmin edilebilir; lütfen farklı bir şifre seçin";
        }

        if (reason != null) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(reason).addConstraintViolation();
            return false;
        }
        return true;
    }
}
