package com.optima.api.modules.auth.service;

import com.optima.api.common.mail.MailService;
import com.optima.api.common.security.JwtService;
import com.optima.api.modules.auth.dto.request.LoginRequest;
import com.optima.api.modules.auth.dto.request.RegisterRequest;
import com.optima.api.modules.auth.dto.response.MembershipSummaryResponse;
import com.optima.api.modules.auth.dto.response.TokenResponse;
import com.optima.api.modules.billing.service.BillingService;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.model.Role;
import com.optima.api.modules.business.model.Roles;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.business.repository.RoleRepository;
import com.optima.api.modules.business.dto.request.TaxRequest;
import com.optima.api.modules.business.service.BusinessService;
import com.optima.api.modules.business.service.TaxService;
import com.optima.api.modules.catalog.dto.request.CategoryRequest;
import com.optima.api.modules.catalog.service.ServiceCategoryService;
import com.optima.api.modules.user.model.User;
import com.optima.api.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** logica de inicio de sesion seleccion de negocio y registro inicial */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AuthService {

    /** huella usada para igualar tiempos cuando el email no existe */
    private static final String DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final RoleRepository roleRepository;
    private final BusinessService businessService;
    private final BillingService billingService;
    private final TaxService taxService;
    private final ServiceCategoryService categoryService;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final LoginAttemptService loginAttemptService;
    private final EmailVerificationService emailVerificationService;

    /**
     * comprueba el inicio de sesion y devuelve el codigo que corresponda
     * si el usuario tiene varios negocios devuelve codigo de identidad
     */
    public TokenResponse login(LoginRequest request) {
        String email = request.email().trim();
        // la cuenta puede estar bloqueada por demasiados fallos seguidos
        loginAttemptService.checkNotBlocked(email);

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            // se revisa la clave aunque no exista el usuario para no filtrar emails por tiempo
            passwordEncoder.matches(request.password(), DUMMY_BCRYPT_HASH);
            loginAttemptService.recordFailure(email);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }
        User user = userOpt.get();

        if (!user.getIsActive()) {
            // mantiene la misma respuesta que una contrasena incorrecta
            passwordEncoder.matches(request.password(), DUMMY_BCRYPT_HASH);
            loginAttemptService.recordFailure(email);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(email);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }
        loginAttemptService.recordSuccess(email);

        // solo se tienen en cuenta relaciones y negocios activos
        // un negocio desactivado sigue apareciendo a sus ADMIN para que puedan reactivarlo (M4)
        List<Membership> activeMemberships = membershipRepository.findAllByUserId(user.getId())
                .stream()
                .filter(MembershipSummaryResponse::isUsable)
                .toList();

        long pendingInvitations = membershipRepository.countByUserIdAndInvitationPendingTrue(user.getId());

        // sin negocios activos solo puede entrar si tiene invitaciones que aceptar
        if (activeMemberships.isEmpty() && pendingInvitations == 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        if (activeMemberships.size() == 1) {
            Membership only = activeMemberships.get(0);
            String token = jwtService.generateTenantToken(
                    user.getEmail(),
                    user.getId(),
                    user.getTokenVersion(),
                    only.getBusiness().getId(),
                    only.getRole().getName()
            );
            return TokenResponse.tenant(token, pendingInvitations);
        }

        String token = jwtService.generateIdentityToken(user.getEmail(), user.getId(), user.getTokenVersion());
        List<MembershipSummaryResponse> summaries = activeMemberships.stream()
                .map(MembershipSummaryResponse::from)
                .toList();
        return TokenResponse.identity(token, summaries, pendingInvitations);
    }

    /** cambia un codigo de identidad por un codigo de negocio */
    public TokenResponse selectBusiness(Long userId, Long businessId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Token invalido"));

        if (!user.getIsActive()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        Membership membership = membershipRepository.findByUserIdAndBusinessId(userId, businessId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "No tienes acceso a ese negocio"));

        // la relacion tiene que estar activa y el negocio tambien, salvo para un ADMIN que va a reactivarlo
        if (!MembershipSummaryResponse.isUsable(membership)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "No tienes acceso a ese negocio");
        }

        String token = jwtService.generateTenantToken(
                user.getEmail(),
                user.getId(),
                user.getTokenVersion(),
                membership.getBusiness().getId(),
                membership.getRole().getName()
        );
        return TokenResponse.tenant(token);
    }

    /** crea el negocio junto con su primer usuario administrador */
    @Transactional
    public TokenResponse register(RegisterRequest request) {
        String adminEmail = request.admin().email().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya existe un usuario con ese email");
        }

        Role adminRole = roleRepository.findByName(Roles.ADMIN)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Error de configuración: no se encontró el rol ADMIN en la base de datos."));

        Business business = businessService.createEntity(request.business());
        // 14 dias de prueba gratis, sin pedir tarjeta (9.3)
        billingService.startTrial(business);

        User user = new User();
        user.setFullName(request.admin().fullName().trim());
        user.setEmail(adminEmail);
        user.setPasswordHash(passwordEncoder.encode(request.admin().password()));
        user.setPhone(request.admin().phone());
        user.setIsActive(true);
        user = userRepository.save(user);

        Membership membership = new Membership();
        membership.setUser(user);
        membership.setBusiness(business);
        membership.setRole(adminRole);
        membership.setIsActive(true);
        membershipRepository.save(membership);

        // el negocio nace con un impuesto y una categoria para poder crear servicios desde el primer momento
        taxService.create(business.getId(), new TaxRequest("IVA 21 %", new BigDecimal("21.00")));
        categoryService.createCategory(business.getId(), new CategoryRequest("General"));

        String token = jwtService.generateTenantToken(
                user.getEmail(),
                user.getId(),
                user.getTokenVersion(),
                business.getId(),
                adminRole.getName()
        );

        // bienvenida y enlace para confirmar el email en un solo correo (P4)
        String verifyLink = emailVerificationService.createLink(user);
        mailService.sendSimpleEmail(
                user.getEmail(),
                "Bienvenido a Optima: confirma tu email",
                "Hola " + user.getFullName() + ",\n\n"
                        + "Tu negocio \"" + business.getName() + "\" ha sido creado correctamente "
                        + "en Optima. Ya puedes empezar a gestionar tu agenda.\n\n"
                        + "Confirma tu email abriendo este enlace (válido durante 48 horas):\n\n"
                        + "    " + verifyLink + "\n\n"
                        + "Un saludo,\nEl equipo de Optima"
        );

        return TokenResponse.tenant(token);
    }

    /** cierra la sesion en todos los dispositivos: los tokens emitidos dejan de valer */
    @Transactional
    public void logoutEverywhere(Long userId) {
        userRepository.findById(userId).ifPresent(User::revokeTokens);
    }
}
