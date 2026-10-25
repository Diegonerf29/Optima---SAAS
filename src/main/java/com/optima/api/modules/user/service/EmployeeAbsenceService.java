package com.optima.api.modules.user.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.common.utils.TextUtils;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.user.dto.request.EmployeeAbsenceRequest;
import com.optima.api.modules.user.dto.response.EmployeeAbsenceResponse;
import com.optima.api.modules.user.model.EmployeeAbsence;
import com.optima.api.modules.user.repository.EmployeeAbsenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/** servicio de ausencias puntuales de empleados */
@Service
@Transactional
@RequiredArgsConstructor
public class EmployeeAbsenceService {

    private final EmployeeAbsenceRepository absenceRepository;
    private final MembershipRepository membershipRepository;

    /**
     * lista ausencias del negocio que solapan con un rango
     */
    @Transactional(readOnly = true)
    public List<EmployeeAbsenceResponse> listByBusinessAndRange(Long businessId,
                                                                LocalDateTime from,
                                                                LocalDateTime to) {
        return absenceRepository.findOverlappingByBusinessAndRange(businessId, from, to)
                .stream().map(EmployeeAbsenceResponse::from).toList();
    }

    /**
     * crea una ausencia para un empleado del negocio
     */
    public EmployeeAbsenceResponse create(Long businessId, Long membershipId, EmployeeAbsenceRequest request) {
        Membership membership = membershipRepository.getInBusiness(membershipId, businessId);
        validateRange(request.startDateTime(), request.endDateTime());

        validateNoOverlap(membershipId, request.startDateTime(), request.endDateTime(), null);

        EmployeeAbsence a = new EmployeeAbsence();
        a.setMembership(membership);
        a.setStartDateTime(request.startDateTime());
        a.setEndDateTime(request.endDateTime());
        a.setReason(TextUtils.blankToNull(request.reason()));

        return EmployeeAbsenceResponse.from(absenceRepository.save(a));
    }

    /**
     * lista de ausencias del empleado
     */
    @Transactional(readOnly = true)
    public Page<EmployeeAbsenceResponse> listByEmployee(Long businessId, Long membershipId, Pageable pageable) {
        membershipRepository.getInBusiness(membershipId, businessId);
        return absenceRepository.findByMembershipIdOrderByStartDateTimeAsc(membershipId, pageable)
                .map(EmployeeAbsenceResponse::from);
    }

    /**
     * obtiene una ausencia concreta del empleado
     */
    @Transactional(readOnly = true)
    public EmployeeAbsenceResponse getById(Long businessId, Long membershipId, Long id) {
        membershipRepository.getInBusiness(membershipId, businessId);
        return EmployeeAbsenceResponse.from(findOrThrow(membershipId, id));
    }

    /**
     * actualiza el rango y motivo de una ausencia existente
     */
    public EmployeeAbsenceResponse update(Long businessId, Long membershipId, Long id, EmployeeAbsenceRequest request) {
        membershipRepository.getInBusiness(membershipId, businessId);
        validateRange(request.startDateTime(), request.endDateTime());

        EmployeeAbsence a = findOrThrow(membershipId, id);
        validateNoOverlap(membershipId, request.startDateTime(), request.endDateTime(), id);

        a.setStartDateTime(request.startDateTime());
        a.setEndDateTime(request.endDateTime());
        a.setReason(TextUtils.blankToNull(request.reason()));

        return EmployeeAbsenceResponse.from(absenceRepository.save(a));
    }

    /**
     * elimina una ausencia
     */
    public void delete(Long businessId, Long membershipId, Long id) {
        membershipRepository.getInBusiness(membershipId, businessId);
        EmployeeAbsence a = findOrThrow(membershipId, id);
        absenceRepository.delete(a);
    }

    /** busca la ausencia dentro de la relacion */
    private EmployeeAbsence findOrThrow(Long membershipId, Long id) {
        return absenceRepository.findByIdAndMembershipId(id, membershipId)
                .orElseThrow(() -> new NotFoundException("la ausencia", id));
    }

    /** valida que el inicio sea anterior al fin */
    private void validateRange(LocalDateTime start, LocalDateTime end) {
        if (!start.isBefore(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha de inicio debe ser anterior a la fecha de fin");
        }
    }

    /**
     * valida que el rango no solape con otras ausencias
     */
    private void validateNoOverlap(Long membershipId,
                                   LocalDateTime startDateTime,
                                   LocalDateTime endDateTime,
                                   Long excludeId) {
        // el solape lo calcula la base de datos; al editar se ignora la propia ausencia
        boolean overlaps = absenceRepository
                .findOverlappingByMembershipAndRange(membershipId, startDateTime, endDateTime).stream()
                .anyMatch(existing -> !existing.getId().equals(excludeId));
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El empleado ya tiene una ausencia en ese rango de fechas");
        }
    }
}
