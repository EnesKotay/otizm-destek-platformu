// Şifre güvenlik kuralları — backend'deki StrongPasswordValidator ile birebir uyumludur.
// Kayıt, şifre sıfırlama ve şifre değiştirme akışlarında kullanılır.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

// Sık kullanılan / kolay tahmin edilebilen şifreler (küçük harfe çevrilerek karşılaştırılır).
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
  'qwerty123', 'qwertyuiop', '11111111', '00000000', 'abc12345', 'iloveyou',
  'admin123', 'sifre123', 'parola123', '1q2w3e4r', 'q1w2e3r4', '12345678a',
  'aaaaaaaa', '1234abcd', '987654321', 'asdfghjkl', 'zxcvbnm1', 'sifre1234',
  'deneme123', 'test1234', 'welcome1', 'letmein1',
]);

/**
 * Şifreyi doğrular. Geçerliyse null, değilse kullanıcıya gösterilecek Türkçe hata mesajı döner.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir`;
  }
  if (!/[A-ZÇĞİÖŞÜ]/.test(password)) {
    return 'Şifre en az bir büyük harf içermelidir';
  }
  if (!/[0-9]/.test(password)) {
    return 'Şifre en az bir rakam içermelidir';
  }
  if (!/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(password)) {
    return 'Şifre en az bir özel karakter (örn. ! ? * . -) içermelidir';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Bu şifre çok yaygın ve kolay tahmin edilebilir; lütfen farklı bir şifre seçin';
  }
  return null;
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null;
}
