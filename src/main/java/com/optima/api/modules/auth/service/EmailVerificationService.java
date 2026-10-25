package com.optima.api.modules.auth.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.common.mail.MailService;
import com.optima.api.common.security.SecureTokens;
import com.optima.api.modules.auth.dto.request.VerifyEmailRequest;
import com.optima.api.modules.auth.model.EmailVerificationToken;
import com.optima.api.modules.auth.repository.EmailVerificationRepository;
import com.optima.api.modules.user.model.User;
import com.optima.api.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * confirmacion del email (P4)
 * se envia un enlace al registrarse y al cambiar el email; hasta confirmarlo
 * no se pueden enviar invitaciones a otras personas
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class EmailVerificationService {

    /** tiempo de validez del enlace */
    private static final Duration TOKEN_TTL = Duration.ofHours(48);

    private final EmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** crea un codigo nuevo para el email actual del usuario y devuelve el enlace que hay que enviarle */
    public String createLink(User user) {
        // solo vale el ultimo enlace
        verificationRepository.invalidateAllForUser(user.getId(), LocalDateTime.now());

        String rawToken = SecureTokens.generate();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setEmail(user.getEmail());
        token.setTokenHash(SecureTokens.sha256Hex(rawToken));
        token.setExpiresAt(LocalDateTime.now().plus(TOKEN_TTL));
        verificationRepository.save(token);

        return frontendUrl.replaceAll("/+$", "") + "/verify-email?token=" + rawToken;
    }

    /** envia un correo solo con el enlace de confirmacion */
    public void sendVerification(User user) {
        String link = createLink(user);
        mailService.sendSimpleEmail(user.getEmail(), "Optima - confirma tu email", """
                Hola %s,

                Confirma tu email abriendo este enlace (válido durante 48 horas):

                    %s

                Si no has sido tú, ignora este correo.

                Optima.
                """.formatted(user.getFullName(), link));
    }

    /** marca el email como confirmado si el codigo es valido */
    public void verify(VerifyEmailRequest request) {
        EmailVerificationToken token = verificationRepository.findByTokenHash(SecureTokens.sha256Hex(request.token()))
                .orElseThrow(this::badToken);
        User user = token.getUser();
        boolean valid = token.getUsedAt() == null
                && token.getExpiresAt().isAfter(LocalDateTime.now())
                // si el usuario cambio el email despues de pedir el enlace, ese enlace ya no confirma nada
                && token.getEmail().equalsIgnoreCase(user.getEmail());
        if (!valid) {
            throw badToken();
        }
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        verificationRepository.invalidateAllForUser(user.getId(), LocalDateTime.now());
    }

    /** vuelve a enviar el enlace a un usuario que aun no ha confirmado */
    public void resend(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("el usuario", userId));
        if (user.hasVerifiedEmail()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tu email ya está confirmado");
        }
        sendVerification(user);
    }

    /** cada noche borra los codigos caducados hace mas de un dia */
    @Scheduled(cron = "0 35 3 * * *")
    public void deleteExpiredTokens() {
        int deleted = verificationRepository.deleteExpiredBefore(LocalDateTime.now().minusDays(1));
        if (deleted > 0) {
            log.info("Borrados {} codigos de verificacion de email caducados", deleted);
        }
    }

    private ResponseStatusException badToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El enlace de confirmación no es válido o ha caducado");
    }
}
