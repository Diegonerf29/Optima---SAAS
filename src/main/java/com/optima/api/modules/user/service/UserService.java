package com.optima.api.modules.user.service;

import com.optima.api.common.mail.MailService;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.auth.dto.response.MembershipSummaryResponse;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.model.Role;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.business.repository.RoleRepository;
import com.optima.api.modules.user.dto.request.CreateUserRequest;
import com.optima.api.modules.user.dto.request.UpdateMeRequest;
import com.optima.api.modules.user.dto.request.UpdateUserRequest;
import com.optima.api.modules.user.dto.response.MeResponse;
import com.optima.api.modules.user.dto.response.UserResponse;
import com.optima.api.modules.user.model.User;
import com.optima.api.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** parte de empleados y perfil propio */
@Service
@Transactional
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final BusinessRepository businessRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppointmentRepository appointmentRepository;
    private final MailService mailService;

    /** direccion del frontend para el enlace de la invitacion */
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** crea un empleado dentro del negocio */
    public UserResponse create(Long businessId, CreateUserRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el negocio con ID: " + businessId));

        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el rol con ID: " + request.roleId()));

        String email = request.email().trim().toLowerCase();

        // si el email ya tiene cuenta no se vincula directamente: se le invita (A3)
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            return invite(business, role, existing.get());
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setIsActive(true);
        user = userRepository.save(user);

        Membership m = new Membership();
        m.setUser(user);
        m.setBusiness(business);
        m.setRole(role);
        m.setIsActive(true);

        return UserResponse.from(membershipRepository.save(m));
    }

    /**
     * invita a una persona que ya tiene cuenta en Optima
     * la membresia queda inactiva hasta que la acepte y el negocio no ve su nombre ni su telefono
     */
    private UserResponse invite(Business business, Role role, User user) {
        Optional<Membership> current = membershipRepository.findByUserIdAndBusinessId(user.getId(), business.getId());
        if (current.isPresent()) {
            String msg = Boolean.TRUE.equals(current.get().getInvitationPending())
                    ? "Ya hay una invitación pendiente para ese email"
                    : "Ya existe un empleado con ese email en este negocio";
            throw new ResponseStatusException(HttpStatus.CONFLICT, msg);
        }

        Membership m = new Membership();
        m.setUser(user);
        m.setBusiness(business);
        m.setRole(role);
        m.setIsActive(false);
        m.setInvitationPending(true);
        m.setInvitedAt(LocalDateTime.now());
        m = membershipRepository.save(m);

        mailService.sendSimpleEmail(user.getEmail(),
                "Optima - " + business.getName() + " te ha invitado",
                """
                Hola,

                El negocio "%s" te ha invitado a unirte a su equipo en Optima.

                Inicia sesión con tu cuenta en %s para aceptar o rechazar la invitación.
                Si no conoces este negocio, puedes rechazarla o ignorar este correo.

                Optima.
                """.formatted(business.getName(), frontendUrl));

        return UserResponse.from(m);
    }

    /** lista empleados activos o archivados */
    @Transactional(readOnly = true)
    public Page<UserResponse> listByBusiness(Long businessId, boolean active, Pageable pageable) {
        Page<Membership> page = active
                ? membershipRepository.findByBusinessIdAndIsActiveTrue(businessId, pageable)
                : membershipRepository.findByBusinessIdAndIsActiveFalseAndInvitationPendingFalse(businessId, pageable);
        return page.map(UserResponse::from);
    }

    /** lista las invitaciones pendientes del negocio */
    @Transactional(readOnly = true)
    public Page<UserResponse> listInvitations(Long businessId, Pageable pageable) {
        return membershipRepository.findByBusinessIdAndInvitationPendingTrue(businessId, pageable)
                .map(UserResponse::from);
    }

    /** devuelve un empleado concreto */
    @Transactional(readOnly = true)
    public UserResponse getById(Long businessId, Long id) {
        return UserResponse.from(findOrThrow(businessId, id));
    }

    /** se actualiza rol y color dentro de este negocio */
    public UserResponse update(Long businessId, Long id, UpdateUserRequest request) {
        Membership m = findOrThrow(businessId, id);

        if (!m.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El empleado está desactivado");
        }

        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el rol con ID: " + request.roleId()));

        m.setRole(role);
        m.setColor(request.color());
        return UserResponse.from(membershipRepository.save(m));
    }

    /**
     * archiva sin citas futuras
     * evita que el usuario se archive a si mismo
     */
    public void deactivate(Long businessId, Long id, Long callerUserId) {
        Membership m = findOrThrow(businessId, id);
        // una invitacion sin aceptar se cancela borrandola: nunca llego a ser empleado
        if (Boolean.TRUE.equals(m.getInvitationPending())) {
            membershipRepository.delete(m);
            return;
        }
        if (m.getUser().getId().equals(callerUserId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No puedes desactivar tu propia membresía");
        }
        if (!m.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El empleado ya está desactivado");
        }
        long pendientes = appointmentRepository.countActiveByMembershipAndBusiness(
                id, businessId, LocalDateTime.now());
        if (pendientes > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El empleado tiene " + pendientes + " cita(s) pendiente(s); "
                            + "cancélalas o reasígnalas antes de archivar");
        }
        m.setIsActive(false);
        membershipRepository.save(m);
    }

    /** reactiva una relacion archivada */
    public UserResponse reactivate(Long businessId, Long id) {
        Membership m = findOrThrow(businessId, id);
        if (Boolean.TRUE.equals(m.getInvitationPending())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La invitación aún no se ha aceptado");
        }
        if (m.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El empleado ya está activo");
        }
        m.setIsActive(true);
        return UserResponse.from(membershipRepository.save(m));
    }

    /** obtiene los datos del propio usuario */
    @Transactional(readOnly = true)
    public MeResponse getMyProfile(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario con ID: " + userId));
        return MeResponse.from(u);
    }

    /** actualiza los datos del propio usuario */
    public MeResponse updateMyProfile(Long userId, UpdateMeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario con ID: " + userId));

        String email = request.email().trim().toLowerCase();
        boolean emailChanges = !user.getEmail().equalsIgnoreCase(email);
        if (emailChanges) {
            // con un token robado no se puede cambiar el email y luego pedir "olvide mi contraseña" (M5)
            if (request.currentPassword() == null
                    || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Para cambiar el email debes indicar tu contraseña actual correcta");
            }
            if (userRepository.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Ya existe un usuario con ese email");
            }
        }

        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(request.phone());
        return MeResponse.from(userRepository.save(user));
    }

    /** lista los negocios activos del usuario */
    @Transactional(readOnly = true)
    public List<MembershipSummaryResponse> listMyBusinesses(Long userId) {
        // igual que en el login solo cuentan relaciones y negocios activos
        return membershipRepository.findAllByUserId(userId).stream()
                .filter(Membership::getIsActive)
                .filter(m -> Boolean.TRUE.equals(m.getBusiness().getIsActive()))
                .map(MembershipSummaryResponse::from)
                .toList();
    }

    /** cambia la contrasena del propio usuario */
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario con ID: " + userId));

        if (!u.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El usuario está desactivado");
        }

        if (!passwordEncoder.matches(currentPassword, u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña actual no es correcta");
        }

        if (passwordEncoder.matches(newPassword, u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe ser distinta a la actual");
        }

        u.setPasswordHash(passwordEncoder.encode(newPassword));
        // cierra las demas sesiones: si alguien tenia un token robado, deja de valer
        u.revokeTokens();
        userRepository.save(u);
    }

    /** busca la relacion dentro del negocio */
    private Membership findOrThrow(Long businessId, Long id) {
        return membershipRepository.findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el empleado con ID: " + id
                                + " en el negocio con ID: " + businessId));
    }
}
