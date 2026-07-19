package com.autismsupport.platform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;

@Slf4j
@Service
public class MfaService {

    private static final int SECRET_SIZE = 10;
    private static final String ALGORITHM = "HmacSHA1";
    private static final SecureRandom random = new SecureRandom();

    public String generateSecret() {
        byte[] buffer = new byte[SECRET_SIZE];
        random.nextBytes(buffer);
        return encodeBase32(buffer);
    }

    public boolean verifyCode(String secret, String codeStr) {
        if (secret == null || codeStr == null) return false;
        try {
            int code = Integer.parseInt(codeStr.trim());
            byte[] decodedSecret = decodeBase32(secret);
            long currentInterval = System.currentTimeMillis() / 1000L / 30L;

            // Allow window of +/- 1 interval for clock drift
            for (int i = -1; i <= 1; i++) {
                if (calculateTotp(decodedSecret, currentInterval + i) == code) {
                    return true;
                }
            }
        } catch (NumberFormatException e) {
            return false;
        } catch (Exception e) {
            log.error("TOTP verification error: {}", e.getMessage());
        }
        return false;
    }

    public String getQrCodeUrl(String email, String secret) {
        return String.format("otpauth://totp/OtizmDestek:%s?secret=%s&issuer=OtizmDestek", email, secret);
    }

    private int calculateTotp(byte[] secret, long interval) throws GeneralSecurityException {
        byte[] data = ByteBuffer.allocate(8).putLong(interval).array();
        SecretKeySpec signKey = new SecretKeySpec(secret, ALGORITHM);
        Mac mac = Mac.getInstance(ALGORITHM);
        mac.init(signKey);
        byte[] hash = mac.doFinal(data);

        int offset = hash[hash.length - 1] & 0xF;
        long truncatedHash = 0;
        for (int i = 0; i < 4; ++i) {
            truncatedHash <<= 8;
            truncatedHash |= (hash[offset + i] & 0xFF);
        }
        truncatedHash &= 0x7FFFFFFF;
        truncatedHash %= 1000000;
        return (int) truncatedHash;
    }

    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private static String encodeBase32(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        int i = 0, index = 0, digit = 0;
        int currByte, nextByte;
        while (i < bytes.length) {
            currByte = (bytes[i] >= 0) ? bytes[i] : (bytes[i] + 256);
            if (index > 3) {
                if (i + 1 < bytes.length) {
                    nextByte = (bytes[i + 1] >= 0) ? bytes[i + 1] : (bytes[i + 1] + 256);
                } else {
                    nextByte = 0;
                }
                digit = currByte & (0xFF >> index);
                index = (index + 5) % 8;
                digit <<= index;
                digit |= nextByte >> (8 - index);
                i++;
            } else {
                digit = (currByte >> (8 - (index + 5))) & 0x1F;
                index = (index + 5) % 8;
                if (index == 0) i++;
            }
            sb.append(BASE32_CHARS.charAt(digit));
        }
        return sb.toString();
    }

    private static byte[] decodeBase32(String base32) {
        base32 = base32.toUpperCase();
        int len = base32.length() * 5 / 8;
        byte[] bytes = new byte[len];
        int i = 0, index = 0, offset = 0;
        while (i < base32.length()) {
            char c = base32.charAt(i);
            int lookup = BASE32_CHARS.indexOf(c);
            if (lookup < 0) {
                i++;
                continue;
            }
            if (index <= 3) {
                index = (index + 5) % 8;
                if (index == 0) {
                    bytes[offset] |= lookup;
                    offset++;
                } else {
                    bytes[offset] |= lookup << (8 - index);
                }
            } else {
                index = (index + 5) % 8;
                bytes[offset] |= lookup >>> index;
                offset++;
                if (offset < bytes.length) {
                    bytes[offset] |= lookup << (8 - index);
                }
            }
            i++;
        }
        return bytes;
    }
}
