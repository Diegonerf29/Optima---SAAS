package com.optima.api.modules.auth.service;

import com.optima.api.common.mail.MailService;
import com.optima.api.common.security.SecureTokens;
import com.optima.api.modules.auth.dto.request.ForgotPasswordRequest;
import com.optima.api.modules.auth.dto.request.ResetPasswordRequest;
import com.optima.api.modules.auth.model.PasswordResetToken;
import com.optima.api.modules.auth.repository.PasswordResetRepository;
import com.optima.api.modules.user.model.User;
import com.optima.api.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/** logica para solicitar y consumir codigos de recuperacion de contrasena */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class PasswordResetService {

    /** tiempo maximo de validez del codigo de recuperacion */
    private static final Duration TOKEN_TTL = Duration.ofHours(1);

    private final UserRepository userRepository;
    private final PasswordResetRepository resetRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    /** URL base del frontend para construir el enlace de recuperacion */
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * inicia el proceso de recuperacion sin indicar si el email existe
     * no revela si el email existe para evitar enumeracion de cuentas
     */
    public void requestReset(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);

        if (userOpt.isEmpty()) {
            // se responde igual aunque el email no exista
            return;
        }

        User user = userOpt.get();
        // un usuario desactivado se trata igual que si no existiera
        if (!user.getIsActive()) {
            return;
        }

        // solo vale el ultimo enlace pedido (M6)
        resetRepository.invalidateAllForUser(user.getId(), LocalDateTime.now());

        String rawToken = SecureTokens.generate();
        String tokenHash = SecureTokens.sha256Hex(rawToken);

        PasswordResetToken reset = new PasswordResetToken();
        reset.setUser(user);
        reset.setTokenHash(tokenHash);
        reset.setExpiresAt(LocalDateTime.now().plus(TOKEN_TTL));
        resetRepository.save(reset);

        String resetLink = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;

        String subject = "Optima - restablece tu contraseña";
        String body = """
                Hola %s,

                Has solicitado restablecer tu contraseña en Optima. Abre
                este enlace para crear una nueva (valido durante 1 hora):

                    %s

                Si el enlace no funciona, copia este codigo y pegalo en la
                pantalla de restablecimiento:

                    %s

                Si no has solicitado este cambio, ignora este correo: tu
                contraseña actual sigue siendo valida y el codigo caducara
                solo.

                Optima.
                """.formatted(user.getFullName(), resetLink, rawToken);

        // se envia en segundo plano (@Async): la respuesta tarda lo mismo exista o no el email (M6)
        mailService.sendSimpleEmail(user.getEmail(), subject, body);
    }

    /** valida el codigo y guarda la nueva contrasena */
    public void consumeReset(ResetPasswordRequest request) {
        String tokenHash = SecureTokens.sha256Hex(request.token());

        PasswordResetToken reset = resetRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> badToken());

        if (reset.getUsedAt() != null) {
            throw badToken();
        }
        if (reset.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw badToken();
        }

        User user = reset.getUser();
        // un usuario desactivado no puede recuperar su cuenta
        if (!user.getIsActive()) {
            throw badToken();
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        // las sesiones abiertas con la contraseña anterior se cierran
        user.revokeTokens();
        userRepository.save(user);

        // se anulan este y cualquier otro enlace pendiente del usuario
        resetRepository.invalidateAllForUser(user.getId(), LocalDateTime.now());
    }

    /** cada noche borra los codigos caducados hace mas de un dia para que la tabla no crezca sin limite (B16) */
    @Scheduled(cron = "0 30 3 * * *")
    public void deleteExpiredTokens() {
        int deleted = resetRepository.deleteExpiredBefore(LocalDateTime.now().minusDays(1));
        if (deleted > 0) {
            log.info("Borrados {} codigos de recuperacion caducados", deleted);
        }
    }

    /** devuelve siempre el mismo error para codigos invalidos */
    private ResponseStatusException badToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El token de reset no es valido o ha caducado");
    }
}
