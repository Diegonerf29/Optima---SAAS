package com.optima.api.modules.user.dto.response;

import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.model.Roles;
import com.optima.api.modules.user.model.User;

import java.time.LocalDateTime;

/**
 * respuesta que representa a un empleado dentro de un negocio
 * no incluye clave privada del usuario
 * mientras la invitacion este pendiente no se devuelven nombre ni telefono
 */
public record UserResponse(
        Long id,
        Long userId,
        Long businessId,
        Long roleId,
        String roleName,
        String fullName,
        String email,
        String phone,
        String color,
        Boolean isActive,
        String status,          // ACTIVE, ARCHIVED o INVITED
        LocalDateTime invitedAt,
        LocalDateTime createdAt
) {
    public static final String ACTIVE = "ACTIVE";
    public static final String ARCHIVED = "ARCHIVED";
    public static final String INVITED = "INVITED";

    public static UserResponse from(Membership m) {
        User u = m.getUser();
        boolean invited = Boolean.TRUE.equals(m.getInvitationPending());
        String status = invited ? INVITED : (Boolean.TRUE.equals(m.getIsActive()) ? ACTIVE : ARCHIVED);
        return new UserResponse(
                m.getId(),
                u.getId(),
                m.getBusiness().getId(),
                m.getRole().getId(),
                m.getRole().getName(),
                // datos personales de otra cuenta: solo cuando la persona ha aceptado
                invited ? null : u.getFullName(),
                u.getEmail(),
                invited ? null : u.getPhone(),
                m.getColor(),
                m.getIsActive(),
                status,
                m.getInvitedAt(),
                m.getCreatedAt()
        );
    }

    /** copia sin email ni telefono: lo que ve un EMPLOYEE de sus compañeros (M7) */
    public UserResponse withoutContact() {
        return new UserResponse(id, userId, businessId, roleId, roleName, fullName,
                null, null, color, isActive, status, invitedAt, createdAt);
    }

    /** el ADMIN ve todo; un EMPLOYEE solo ve el contacto de su propia ficha */
    public UserResponse visibleTo(Long callerUserId, String callerRole) {
        return Roles.ADMIN.equals(callerRole) || userId.equals(callerUserId) ? this : withoutContact();
    }
}
