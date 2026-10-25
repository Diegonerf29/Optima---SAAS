package com.optima.api.modules.auth.dto.response;

import java.util.List;

/**
 * codigo devuelto tras inicio de sesion o seleccion de negocio
 * tokenType: "tenant" (ya hay negocio elegido) o "identity" (hay que elegir negocio o aceptar invitaciones)
 */
public record TokenResponse(
        String token,
        String tokenType,
        List<MembershipSummaryResponse> businesses,
        long pendingInvitations
) {

    public static TokenResponse tenant(String token) {
        return new TokenResponse(token, "tenant", null, 0);
    }

    public static TokenResponse tenant(String token, long pendingInvitations) {
        return new TokenResponse(token, "tenant", null, pendingInvitations);
    }

    public static TokenResponse identity(String token, List<MembershipSummaryResponse> businesses, long pendingInvitations) {
        return new TokenResponse(token, "identity", businesses, pendingInvitations);
    }
}
