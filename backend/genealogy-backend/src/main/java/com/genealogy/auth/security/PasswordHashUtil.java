package com.genealogy.auth.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class PasswordHashUtil {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;

    private PasswordHashUtil() {
    }

    public static String hash(String rawPassword) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        byte[] hash = pbkdf2(rawPassword.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        return "PBKDF2$" + ITERATIONS + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean verify(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null || !storedHash.startsWith("PBKDF2$")) {
            return false;
        }
        String[] parts = storedHash.split("\\$");
        if (parts.length != 4) {
            return false;
        }
        int iterations = Integer.parseInt(parts[1]);
        byte[] salt = Base64.getDecoder().decode(parts[2]);
        byte[] expectedHash = Base64.getDecoder().decode(parts[3]);
        byte[] actualHash = pbkdf2(rawPassword.toCharArray(), salt, iterations, expectedHash.length * 8);
        return MessageDigest.isEqual(expectedHash, actualHash);
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations, int keyLength) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyLength);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception ex) {
            throw new IllegalStateException("PBKDF2 password hashing failed", ex);
        }
    }
}
