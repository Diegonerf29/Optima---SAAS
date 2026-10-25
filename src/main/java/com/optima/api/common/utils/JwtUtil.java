package com.optima.api.common.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * crea y valida las claves de acceso
 * hay una basica y otra con negocio y rol
 */
@Component
@RequiredArgsConstructor
public class JwtUtil {

    /** clave publica de application-dev.properties, solo valida en el perfil dev */
    private static final String DEV_SECRET = "dev-secret-solo-para-local-no-usar-en-produccion-0123456789";

    // perfiles activos de la aplicacion
    private final Environment environment;

    // valor tomado de la configuracion
    @Value("${app.jwt.secret}")
    private String secretString;

    @Value("${app.jwt.expiration-ms}")
    private long expirationTime;

    private SecretKey secretKey;

    /** prepara la clave para firmar y validar tokens */
    @PostConstruct
    public void init() {
        // la clave necesita un minimo para ser valida
        if (secretString == null || secretString.length() < 32) {
            throw new IllegalStateException("La clave 'app.jwt.secret' debe tener al menos 32 caracteres.");
        }
        // la clave de desarrollo es publica, fuera de dev cualquiera podria firmar tokens
        if (DEV_SECRET.equals(secretString) && !environment.matchesProfiles("dev")) {
            throw new IllegalStateException("La clave JWT de desarrollo solo se permite con el perfil 'dev'. Define JWT_SECRET con una clave aleatoria.");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
    }

    /** nombre del claim con la version de token del usuario */
    public static final String VERSION_CLAIM = "ver";

    /** genera el codigo cuando ya hay negocio y rol */
    public String generateTenantToken(String email, Long userId, int tokenVersion, Long businessId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put(VERSION_CLAIM, tokenVersion);
        claims.put("businessId", businessId);
        claims.put("role", role);
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey)
                .compact();
    }

    /** genera el codigo basico cuando aun no hay negocio */
    public String generateIdentityToken(String email, Long userId, int tokenVersion) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put(VERSION_CLAIM, tokenVersion);
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey)
                .compact();
    }

    /** lee el codigo y devuelve sus datos */
    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
