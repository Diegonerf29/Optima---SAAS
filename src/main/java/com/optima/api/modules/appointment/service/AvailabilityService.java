package com.optima.api.modules.appointment.service;

import com.optima.api.modules.appointment.dto.response.AvailabilityResponse;
import com.optima.api.modules.appointment.dto.response.AvailabilitySlotResponse;
import com.optima.api.modules.appointment.model.Appointment;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.business.model.Booth;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.model.BusinessHour;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.model.ScheduleBlock;
import com.optima.api.modules.business.repository.BoothRepository;
import com.optima.api.modules.business.repository.BusinessHourRepository;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.business.repository.ScheduleBlockRepository;
import com.optima.api.modules.business.service.BusinessClock;
import com.optima.api.modules.user.model.EmployeeAbsence;
import com.optima.api.modules.user.model.EmployeeSchedule;
import com.optima.api.modules.user.repository.EmployeeAbsenceRepository;
import com.optima.api.modules.user.repository.EmployeeScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** calcula los huecos libres para una fecha y unos servicios */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AvailabilityService {

    private final BusinessRepository businessRepository;
    private final BusinessHourRepository businessHourRepository;
    private final BookableServices bookableServices;
    private final MembershipRepository membershipRepository;
    private final EmployeeScheduleRepository scheduleRepository;
    private final EmployeeAbsenceRepository absenceRepository;
    private final BoothRepository boothRepository;
    private final ScheduleBlockRepository scheduleBlockRepository;
    private final AppointmentRepository appointmentRepository;
    private final BusinessClock businessClock;

    /** calcula la disponibilidad teniendo en cuenta horarios y bloqueos */
    public AvailabilityResponse getAvailability(Long businessId,
                                                LocalDate date,
                                                List<Long> serviceIds,
                                                Long membershipId,
                                                Long boothId,
                                                Long excludeAppointmentId) {
        // se obtiene la duracion total para construir los huecos

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No se encontró el negocio con ID: " + businessId));

        // "hoy" segun la zona horaria del negocio, no la del servidor (M14)
        if (date.isBefore(businessClock.today(business))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha no puede estar en el pasado");
        }

        int totalDuration = BookableServices.totalMinutes(bookableServices.load(businessId, serviceIds));

        // un mismo dia puede tener varios tramos abiertos
        int dayOfWeek = date.getDayOfWeek().getValue(); // 1 lunes 7 domingo
        List<BusinessHour> openHours = businessHourRepository
                .findAllByBusinessIdAndDayOfWeekOrderByStartTimeAsc(businessId, dayOfWeek)
                .stream()
                .filter(h -> !Boolean.TRUE.equals(h.getIsClosed()))
                .toList();
        if (openHours.isEmpty()) {
            return new AvailabilityResponse(date, businessId, totalDuration, List.of());
        }

        // un bloqueo general deja el dia completo sin huecos
        List<ScheduleBlock> blocksOfDay =
                scheduleBlockRepository.findAllForDay(businessId, date);
        boolean hasGlobalBlock = blocksOfDay.stream()
                .anyMatch(b -> b.getMembership() == null && b.getBooth() == null);
        if (hasGlobalBlock) {
            return new AvailabilityResponse(date, businessId, totalDuration, List.of());
        }
        List<Long> blockedEmployeeIds = blocksOfDay.stream()
                .filter(b -> b.getMembership() != null)
                .map(b -> b.getMembership().getId())
                .toList();
        List<Long> blockedBoothIds = blocksOfDay.stream()
                .filter(b -> b.getBooth() != null)
                .map(b -> b.getBooth().getId())
                .toList();

        // se decide que empleados y cabinas entran en la busqueda
        List<Membership> candidates = resolveEmployeeCandidates(businessId, membershipId);

        List<Booth> candidateBooths = resolveBoothCandidates(businessId, boothId);

        // al editar la propia cita no debe contar como ocupada
        LocalDateTime dayWindowStart = date.atStartOfDay();
        LocalDateTime dayWindowEnd = date.plusDays(1).atStartOfDay();
        List<Appointment> activeAppointments =
                appointmentRepository.findActiveByBusinessAndDay(
                        businessId, dayWindowStart, dayWindowEnd)
                        .stream()
                        .filter(a -> excludeAppointmentId == null
                                || !excludeAppointmentId.equals(a.getId()))
                        .toList();

        // si es hoy, no se ofrecen huecos que ya han pasado (B12)
        LocalDateTime notBefore = date.equals(businessClock.today(business)) ? businessClock.now(business) : null;

        // se cargan horarios y ausencias antes de recorrer los huecos
        int interval = business.getAppointmentInterval();
        List<AvailabilitySlotResponse> slots = new ArrayList<>();

        List<Long> candidateIds = candidates.stream()
                .map(Membership::getId)
                .toList();

        Map<Long, List<EmployeeSchedule>> schedulesByEmp = candidateIds.isEmpty()
                ? Map.of()
                : scheduleRepository
                        .findAllByMembershipIdInAndDayOfWeek(candidateIds, dayOfWeek)
                        .stream()
                        .collect(Collectors.groupingBy(s -> s.getMembership().getId()));

        Map<Long, List<EmployeeAbsence>> absencesByEmp = candidateIds.isEmpty()
                ? Map.of()
                : absenceRepository
                        .findOverlappingForDayBatch(candidateIds, dayWindowStart, dayWindowEnd)
                        .stream()
                        .collect(Collectors.groupingBy(a -> a.getMembership().getId()));

        // luego se recorre empleado por empleado para montar huecos
        for (Membership emp : candidates) {
            if (blockedEmployeeIds.contains(emp.getId())) continue;

            List<EmployeeSchedule> ranges =
                    schedulesByEmp.getOrDefault(emp.getId(), List.of());
            if (ranges.isEmpty()) continue;

            List<EmployeeAbsence> absences =
                    absencesByEmp.getOrDefault(emp.getId(), List.of());

            List<Appointment> empAppts = activeAppointments.stream()
                    .filter(a -> a.getMembership().getId().equals(emp.getId()))
                    .toList();

            for (EmployeeSchedule range : ranges) {
                // asi tambien se respetan los cortes del horario del negocio
                for (BusinessHour bh : openHours) {
                    LocalDateTime dayStart = date.atTime(bh.getStartTime());
                    LocalDateTime dayEnd = date.atTime(bh.getEndTime());
                    addSlotsForEmployeeRange(
                            slots, date, range, dayStart, dayEnd, notBefore,
                            interval, totalDuration,
                            emp, absences, empAppts,
                            candidateBooths, blockedBoothIds, activeAppointments
                    );
                }
            }
        }

        slots.sort(Comparator
                .comparing(AvailabilitySlotResponse::startTime)
                .thenComparing(AvailabilitySlotResponse::membershipId));

        // al final se devuelven ordenados por hora
        return new AvailabilityResponse(date, businessId, totalDuration, slots);
    }

    /** devuelve los empleados que se van a revisar */
    private List<Membership> resolveEmployeeCandidates(Long businessId, Long membershipId) {
        if (membershipId == null) {
            return membershipRepository.findAllByBusinessIdAndIsActiveTrue(businessId);
        }
        Membership emp = membershipRepository.findByIdAndBusinessId(membershipId, businessId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No se encontró el empleado con ID: " + membershipId
                                + " en el negocio con ID: " + businessId));
        if (!emp.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El empleado con ID: " + membershipId + " está desactivado");
        }
        return List.of(emp);
    }

    /** devuelve las cabinas que se van a revisar */
    private List<Booth> resolveBoothCandidates(Long businessId, Long boothId) {
        if (boothId == null) {
            return boothRepository.findAllByBusinessIdAndIsActiveTrue(businessId);
        }
        Booth b = boothRepository.findByIdAndBusinessId(boothId, businessId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No se encontró la cabina con ID: " + boothId
                                + " en el negocio con ID: " + businessId));
        if (!b.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La cabina con ID: " + boothId + " está desactivada");
        }
        return List.of(b);
    }

    /**
     * recorre un tramo del empleado usando el intervalo del negocio
     * va guardando cada hueco valido encontrado
     */
    private void addSlotsForEmployeeRange(
            List<AvailabilitySlotResponse> slots,
            LocalDate date,
            EmployeeSchedule range,
            LocalDateTime dayStart,
            LocalDateTime dayEnd,
            LocalDateTime notBefore,
            int interval,
            int totalDuration,
            Membership emp,
            List<EmployeeAbsence> absences,
            List<Appointment> empAppts,
            List<Booth> candidateBooths,
            List<Long> blockedBoothIds,
            List<Appointment> allActiveAppointments
    ) {
        // se cruza el horario del empleado con el tramo del negocio
        LocalDateTime rangeStart = max(date.atTime(range.getStartTime()), dayStart);
        LocalDateTime rangeEnd   = min(date.atTime(range.getEndTime()),   dayEnd);
        if (notBefore != null) {
            rangeStart = max(rangeStart, notBefore);
        }

        // se ajusta el inicio al siguiente hueco contando desde la apertura del tramo (M2)
        LocalDateTime cursor = SlotGrid.alignUp(rangeStart, dayStart, interval);

        while (!cursor.plusMinutes(totalDuration).isAfter(rangeEnd)) {
            LocalDateTime slotStart = cursor;
            LocalDateTime slotEnd = cursor.plusMinutes(totalDuration);

            // solo se guarda si no pisa ausencias citas o cabinas ocupadas
            if (!conflictsWith(slotStart, slotEnd, absences, empAppts)) {
                Booth booth = pickFreeBooth(
                        slotStart, slotEnd,
                        candidateBooths, blockedBoothIds, allActiveAppointments);

                // si el negocio no trabaja con cabinas el hueco sigue siendo valido
                boolean boothConstraintSatisfied =
                        candidateBooths.isEmpty() || booth != null;

                if (boothConstraintSatisfied) {
                    slots.add(new AvailabilitySlotResponse(
                            slotStart.toLocalTime(),
                            slotEnd.toLocalTime(),
                            emp.getId(),
                            emp.getUser().getFullName(),
                            booth != null ? booth.getId() : null,
                            booth != null ? booth.getName() : null
                    ));
                }
            }
            cursor = cursor.plusMinutes(interval);
        }
    }

    /** revisa si el hueco choca con ausencias o citas */
    private boolean conflictsWith(LocalDateTime start, LocalDateTime end,
                                  List<EmployeeAbsence> absences,
                                  List<Appointment> empAppts) {
        for (EmployeeAbsence a : absences) {
            if (start.isBefore(a.getEndDateTime()) && end.isAfter(a.getStartDateTime())) return true;
        }
        for (Appointment a : empAppts) {
            if (start.isBefore(a.getEndDateTime()) && end.isAfter(a.getStartDateTime())) return true;
        }
        return false;
    }

    /** devuelve la primera cabina libre del rango o vacio si no hay */
    private Booth pickFreeBooth(LocalDateTime start, LocalDateTime end,
                                List<Booth> candidates,
                                List<Long> blockedBoothIds,
                                List<Appointment> activeAppointments) {
        for (Booth b : candidates) {
            if (blockedBoothIds.contains(b.getId())) continue;
            boolean overlap = activeAppointments.stream()
                    .filter(a -> a.getBooth() != null
                            && a.getBooth().getId().equals(b.getId()))
                    .anyMatch(a -> start.isBefore(a.getEndDateTime())
                            && end.isAfter(a.getStartDateTime()));
            if (!overlap) return b;
        }
        return null;
    }

    /** devuelve la fecha mas tardia */
    private LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    /** devuelve la fecha mas temprana */
    private LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}
