package com.optima.api.common.security;

import com.optima.api.common.exception.ErrorWriter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * limita peticiones por ip en rutas de auth
 * sirve para frenar intentos repetidos
 *
 * la ip sale de request.getRemoteAddr(): detras de Caddy, Tomcat ya la sustituye por la real
 * (server.forward-headers-strategy=native), pero solo si la peticion viene de un proxy de confianza.
 * Asi un cliente no puede inventarse otra ip con la cabecera X-Forwarded-For (M3)
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // cada ruta tiene su propio limite

    /** 10 intentos de inicio de sesion por minuto por cada ip */
    private static final Supplier<Bucket> LOGIN_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofMinutes(1)).build())
            .build();

    /** 20 registros por hora por cada ip */
    private static final Supplier<Bucket> REGISTER_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(20).refillIntervally(20, Duration.ofHours(1)).build())
            .build();

    /** 10 solicitudes de "olvide mi contrasena" por hora por cada ip */
    private static final Supplier<Bucket> FORGOT_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofHours(1)).build())
            .build();

    /** 20 intentos de resetear contrasena por hora por cada ip */
    private static final Supplier<Bucket> RESET_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(20).refillIntervally(20, Duration.ofHours(1)).build())
            .build();

    /** 20 intentos de confirmar email y 5 reenvios del enlace por hora por cada ip */
    private static final Supplier<Bucket> VERIFY_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(20).refillIntervally(20, Duration.ofHours(1)).build())
            .build();
    private static final Supplier<Bucket> RESEND_BUCKET = () -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofHours(1)).build())
            .build();

    /** tope de ips guardadas por mapa para no agotar memoria */
    private static final int MAX_TRACKED_IPS = 10_000;

    // se guarda un cubo por ip
    private final Map<String, Bucket> loginBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));
    private final Map<String, Bucket> registerBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));
    private final Map<String, Bucket> forgotBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));
    private final Map<String, Bucket> resetBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));
    private final Map<String, Bucket> verifyBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));
    private final Map<String, Bucket> resendBuckets = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_IPS));

    private final ErrorWriter errorWriter;
    private final boolean enabled;

    public RateLimitFilter(ErrorWriter errorWriter,
                           @Value("${app.rate-limit.enabled:true}") boolean enabled) {
        this.errorWriter = errorWriter;
        this.enabled = enabled;
    }

    /** revisa si la peticion debe pasar por rate limit */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        Bucket bucket = enabled ? pickBucket(request) : null;
        // si no hay limite para esta ruta se deja pasar
        if (bucket == null) {
            chain.doFilter(request, response);
            return;
        }

        // se intenta consumir una ficha
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            chain.doFilter(request, response);
            return;
        }

        // si no quedan fichas se devuelve 429
        long waitSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
        writeTooManyRequests(response, waitSeconds);
    }

    /** elige el cubo segun la ruta */
    private Bucket pickBucket(HttpServletRequest request) {
        // solo se limitan peticiones post
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String uri = request.getRequestURI();
        String ip = request.getRemoteAddr();
        if ("/api/auth/token".equals(uri)) {
            return bucketFor(loginBuckets, ip, LOGIN_BUCKET);
        }
        if ("/api/auth/register".equals(uri)) {
            return bucketFor(registerBuckets, ip, REGISTER_BUCKET);
        }
        if ("/api/auth/forgot-password".equals(uri)) {
            return bucketFor(forgotBuckets, ip, FORGOT_BUCKET);
        }
        if ("/api/auth/reset-password".equals(uri)) {
            return bucketFor(resetBuckets, ip, RESET_BUCKET);
        }
        if ("/api/auth/verify-email".equals(uri)) {
            return bucketFor(verifyBuckets, ip, VERIFY_BUCKET);
        }
        if ("/api/auth/verify-email/resend".equals(uri)) {
            return bucketFor(resendBuckets, ip, RESEND_BUCKET);
        }
        return null;
    }

    /** devuelve el cubo de la ip; si el mapa esta lleno se olvida la ip menos reciente */
    private Bucket bucketFor(Map<String, Bucket> buckets, String ip, Supplier<Bucket> factory) {
        return buckets.computeIfAbsent(ip, k -> factory.get());
    }

    /** escribe la respuesta de too many requests */
    private void writeTooManyRequests(HttpServletResponse response, long retryAfterSeconds) throws IOException {
        long seconds = Math.max(1, retryAfterSeconds);
        response.setHeader("Retry-After", String.valueOf(seconds));
        errorWriter.write(response, HttpStatus.TOO_MANY_REQUESTS,
                "Demasiadas peticiones. Reintenta en " + seconds + " segundos.");
    }
}
