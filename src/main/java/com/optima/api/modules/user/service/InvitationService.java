package com.optima.api.modules.user.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.auth.dto.response.MembershipSummaryResponse;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.user.dto.response.InvitationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** invitaciones vistas por la persona invitada: listar, aceptar y rechazar */
@Service
@Transactional
@RequiredArgsConstructor
public class InvitationService {

    private final MembershipRepository membershipRepository;

    /** invitaciones pendientes del usuario */
    @Transactional(readOnly = true)
    public List<InvitationResponse> listMine(Long userId) {
        return membershipRepository.findAllByUserIdAndInvitationPendingTrue(userId).stream()
                .filter(m -> Boolean.TRUE.equals(m.getBusiness().getIsActive()))
                .map(InvitationResponse::from)
                .toList();
    }

    /** acepta la invitacion: desde ahora es empleado del negocio */
    public MembershipSummaryResponse accept(Long userId, Long membershipId) {
        Membership m = findMine(userId, membershipId);
        if (!Boolean.TRUE.equals(m.getBusiness().getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El negocio está desactivado");
        }
        m.setInvitationPending(false);
        m.setIsActive(true);
        return MembershipSummaryResponse.from(membershipRepository.save(m));
    }

    /** rechaza la invitacion: se borra porque nunca llego a ser empleado */
    public void decline(Long userId, Long membershipId) {
        membershipRepository.delete(findMine(userId, membershipId));
    }

    /** busca una invitacion pendiente que sea del propio usuario */
    private Membership findMine(Long userId, Long membershipId) {
        return membershipRepository.findById(membershipId)
                .filter(m -> m.getUser().getId().equals(userId))
                .filter(m -> Boolean.TRUE.equals(m.getInvitationPending()))
                // mismo mensaje si no existe o es de otra persona, para no dar pistas
                .orElseThrow(() -> new NotFoundException("la invitación", membershipId));
    }
}
