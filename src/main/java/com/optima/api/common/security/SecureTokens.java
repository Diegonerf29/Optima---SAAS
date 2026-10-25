package com.optima.api.common.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * codigos de un solo uso que se envian por correo (recuperar contraseña, verificar email)
 * en la base de datos solo se guarda su huella SHA-256: si alguien la roba no le sirve
 */
public final class SecureTokens {

    /** longitud del codigo aleatorio antes de codificarlo */
    private static final int TOKEN_LENGTH_BYTES = 32;

    private static final SecureRandom RANDOM = new SecureRandom();

    private SecureTokens() {
    }

    /** genera el codigo aleatorio que se envia por correo */
    public static String generate() {
        byte[] bytes = new byte[TOKEN_LENGTH_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** calcula la huella del codigo para guardarlo o buscarlo en la base de datos */
    public static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 viene en cualquier JVM actual
            throw new IllegalStateException("SHA-256 no disponible en la JVM", e);
        }
    }
}
