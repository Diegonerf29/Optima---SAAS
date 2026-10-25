package com.optima.api.modules.user.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.user.dto.request.EmployeeScheduleRequest;
import com.optima.api.modules.user.dto.response.EmployeeScheduleResponse;
import com.optima.api.modules.user.model.EmployeeSchedule;
import com.optima.api.modules.user.repository.EmployeeScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.util.List;

/** servicio de horarios semanales de empleados */
@Service
@Transactional
@RequiredArgsConstructor
public class EmployeeScheduleService {

    private final EmployeeScheduleRepository scheduleRepository;
    private final MembershipRepository membershipRepository;

    /**
     * crea un tramo del horario semanal de un empleado
     */
    public EmployeeScheduleResponse create(Long businessId, Long membershipId, EmployeeScheduleRequest request) {
        Membership membership = membershipRepository.getInBusiness(membershipId, businessId);
        validateHours(request.startTime(), request.endTime());

        validateNoOverlap(membershipId, request.dayOfWeek(), request.startTime(), request.endTime(), null);

        EmployeeSchedule s = new EmployeeSchedule();
        s.setMembership(membership);
        s.setDayOfWeek(request.dayOfWeek());
        s.setStartTime(request.startTime());
        s.setEndTime(request.endTime());

        return EmployeeScheduleResponse.from(scheduleRepository.save(s));
    }

    /**
     * lista todos los tramos del horario semanal de un empleado
     */
    @Transactional(readOnly = true)
    public List<EmployeeScheduleResponse> listByEmployee(Long businessId, Long membershipId) {
        membershipRepository.getInBusiness(membershipId, businessId);
        return scheduleRepository
                .findAllByMembershipIdOrderByDayOfWeekAscStartTimeAsc(membershipId)
                .stream().map(EmployeeScheduleResponse::from).toList();
    }

    /**
     * obtiene un tramo concreto del horario
     */
    @Transactional(readOnly = true)
    public EmployeeScheduleResponse getById(Long businessId, Long membershipId, Long id) {
        membershipRepository.getInBusiness(membershipId, businessId);
        return EmployeeScheduleResponse.from(findOrThrow(membershipId, id));
    }

    /**
     * actualiza dia y horas de un tramo existente
     */
    public EmployeeScheduleResponse update(Long businessId, Long membershipId, Long id, EmployeeScheduleRequest request) {
        membershipRepository.getInBusiness(membershipId, businessId);
        validateHours(request.startTime(), request.endTime());

        EmployeeSchedule s = findOrThrow(membershipId, id);
        validateNoOverlap(membershipId, request.dayOfWeek(), request.startTime(), request.endTime(), id);

        s.setDayOfWeek(request.dayOfWeek());
        s.setStartTime(request.startTime());
        s.setEndTime(request.endTime());

        return EmployeeScheduleResponse.from(scheduleRepository.save(s));
    }

    /**
     * elimina un tramo del horario
     */
    public void delete(Long businessId, Long membershipId, Long id) {
        membershipRepository.getInBusiness(membershipId, businessId);
        EmployeeSchedule s = findOrThrow(membershipId, id);
        scheduleRepository.delete(s);
    }

    /** busca el tramo dentro de la relacion */
    private EmployeeSchedule findOrThrow(Long membershipId, Long id) {
        return scheduleRepository.findByIdAndMembershipId(id, membershipId)
                .orElseThrow(() -> new NotFoundException("el horario", id));
    }

    /** valida que la hora de inicio sea anterior a la de fin */
    private void validateHours(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La hora de inicio debe ser anterior a la hora de fin");
        }
    }

    /** valida que el tramo no solape con otros del mismo dia */
    private void validateNoOverlap(Long membershipId, Integer dayOfWeek,
                                   LocalTime startTime, LocalTime endTime,
                                   Long excludeId) {
        List<EmployeeSchedule> existingSchedules = scheduleRepository
                .findAllByMembershipIdAndDayOfWeek(membershipId, dayOfWeek);
        for (EmployeeSchedule existing : existingSchedules) {
            if (existing.getId().equals(excludeId)) continue;
            if (startTime.isBefore(existing.getEndTime())
                    && endTime.isAfter(existing.getStartTime())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El empleado ya tiene un tramo en ese horario para ese día");
            }
        }
    }
}
