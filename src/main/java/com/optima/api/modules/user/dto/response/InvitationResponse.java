package com.optima.api.modules.user.dto.response;

import com.optima.api.modules.business.model.Membership;

import java.time.LocalDateTime;

/** invitacion pendiente vista por la persona invitada */
public record InvitationResponse(
        Long membershipId,
        Long businessId,
        String businessName,
        String role,
        LocalDateTime invitedAt
) {
    public static InvitationResponse from(Membership m) {
        return new InvitationResponse(
                m.getId(),
                m.getBusiness().getId(),
                m.getBusiness().getName(),
                m.getRole().getName(),
                m.getInvitedAt()
        );
    }
}
