package com.optima.api.modules.appointment.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.appointment.dto.request.CreateAppointmentRequest;
import com.optima.api.modules.appointment.dto.request.UpdateAppointmentRequest;
import com.optima.api.modules.appointment.dto.request.UpdateAppointmentStatusRequest;
import com.optima.api.modules.appointment.dto.request.UpdatePaymentRequest;
import com.optima.api.modules.appointment.dto.response.AppointmentResponse;
import com.optima.api.modules.appointment.model.Appointment;
import com.optima.api.modules.appointment.model.AppointmentStatus;
import com.optima.api.modules.appointment.model.BookedService;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.appointment.repository.AppointmentStatusRepository;
import com.optima.api.modules.appointment.repository.BookedServiceRepository;
import com.optima.api.modules.business.model.Booth;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.model.BusinessHour;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.repository.BoothRepository;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.catalog.model.BusinessService;
import com.optima.api.modules.client.model.Client;
import com.optima.api.modules.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * logica principal de citas
 * valida disponibilidad estados y servicios reservados
 * crear y editar comparten los mismos pasos (metodos privados de abajo) para que no se separen (M12)
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AppointmentService {

    /** campos permitidos para ordenar la busqueda de citas */
    private static final Set<String> SORTABLE_FIELDS =
            Set.of("id", "startDateTime", "endDateTime", "createdAt", "isPaid");

    /** estados que no permiten editar la cita */
    private static final Set<String> NON_EDITABLE_STATUSES = Set.of("COMPLETED");

    /** estados que vuelven a pendiente al editarse */
    private static final Set<String> RESET_TO_PENDING_ON_EDIT = Set.of("CANCELLED", "NO_SHOW");

    private final AppointmentRepository appointmentRepository;
    private final AppointmentStatusRepository statusRepository;
    private final BookedServiceRepository bookedServiceRepository;
    private final BoothRepository boothRepository;
    private final BusinessRepository businessRepository;
    private final ClientRepository clientRepository;
    private final MembershipRepository membershipRepository;
    private final AppointmentValidator validator;
    private final BookableServices bookableServices;

    /**
     * crea una cita nueva
     * guarda los servicios con su precio e impuesto actuales
     *
     * READ_COMMITTED (M1): con el nivel por defecto de MySQL (REPEATABLE READ) la comprobacion de
     * solapes leia una "foto" tomada al empezar la transaccion y no veia la cita que otra peticion
     * acababa de guardar mientras esta esperaba el bloqueo del empleado. Asi cada consulta ve lo ultimo confirmado
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AppointmentResponse createAppointment(Long businessId, CreateAppointmentRequest request) {
        Business business = findActiveBusiness(businessId);
        Client client = findActiveClient(businessId, request.clientId());
        // se bloquean empleado y cabina (siempre en este orden) para que dos reservas del mismo hueco vayan por turnos
        Membership membership = lockActiveEmployee(businessId, request.membershipId());
        Booth booth = request.boothId() != null ? lockActiveBooth(businessId, request.boothId()) : null;

        List<BusinessService> services = bookableServices.load(businessId, request.serviceIds());
        LocalDateTime start = request.startDateTime();
        LocalDateTime end = start.plusMinutes(BookableServices.totalMinutes(services));
        validateSlot(business, membership, booth, start, end, null);

        Appointment appointment = new Appointment();
        appointment.setBusiness(business);
        appointment.setClient(client);
        appointment.setMembership(membership);
        appointment.setBooth(booth);  // queda sin valor si la cita no usa cabina
        // toda cita nueva empieza en pendiente
        appointment.setStatus(findStatus("PENDING"));
        appointment.setStartDateTime(start);
        appointment.setEndDateTime(end);
        appointment.setNotes(request.notes());

        Appointment saved = saveCheckingConflicts(appointment);
        return AppointmentResponse.from(saved, saveBookedServices(saved, services));
    }

    /** busca citas con paginacion y filtros opcionales */
    @Transactional(readOnly = true)
    public Page<AppointmentResponse> searchAppointments(Long businessId,
                                                       LocalDate from,
                                                       LocalDate to,
                                                       Long membershipId,
                                                       Pageable pageable) {
        // un rango invertido se rechaza antes de consultar
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha 'from' no puede ser posterior a 'to'");
        }

        // si el campo no se puede ordenar se rechaza antes de consultar la base de datos
        pageable.getSort().forEach(order -> {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El campo de ordenación '" + order.getProperty() + "' no es válido");
            }
        });

        LocalDateTime fromInclusive = from != null ? from.atStartOfDay() : null;
        LocalDateTime toExclusive = to != null ? to.plusDays(1).atStartOfDay() : null;

        // se busca la pagina ya filtrada
        Page<Appointment> appointmentPage = appointmentRepository.searchAppointments(
                businessId, fromInclusive, toExclusive, membershipId, pageable);

        List<Appointment> appointments = appointmentPage.getContent();
        if (appointments.isEmpty()) {
            return appointmentPage.map(a -> AppointmentResponse.from(a, List.of()));
        }

        // evita pedir servicios uno por uno
        List<Long> appointmentIds = appointments.stream()
                .map(Appointment::getId)
                .toList();

        Map<Long, List<BookedService>> bookedServicesByAppointmentId =
                bookedServiceRepository.findAllByAppointmentIdIn(appointmentIds)
                        .stream()
                        .collect(Collectors.groupingBy(bs -> bs.getAppointment().getId()));

        return appointmentPage.map(a -> AppointmentResponse.from(
                a,
                bookedServicesByAppointmentId.getOrDefault(a.getId(), List.of())
        ));
    }

    /** busca una cita dentro de un negocio */
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long businessId, Long id) {
        return toResponse(findAppointment(businessId, id));
    }

    /** cambia el estado de una cita validando la transicion */
    public AppointmentResponse updateAppointmentStatus(Long businessId,
                                                       Long appointmentId,
                                                       UpdateAppointmentStatusRequest request) {
        Appointment appointment = findAppointment(businessId, appointmentId);

        // un estado inexistente se trata como entrada invalida
        AppointmentStatus newStatus = statusRepository.findByName(request.statusName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El estado '" + request.statusName() + "' no es válido. "
                                + "Estados permitidos: PENDING, CONFIRMED, IN_PROGRESS, "
                                + "COMPLETED, CANCELLED, NO_SHOW"
                ));

        validator.validateStatusTransition(appointment.getStatus().getName(), request.statusName());

        // si la transicion es valida se guarda el cambio
        appointment.setStatus(newStatus);
        return toResponse(appointmentRepository.save(appointment));
    }

    /** actualiza los datos editables de una cita (no cambia cliente ni pago); READ_COMMITTED como al crear (M1) */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AppointmentResponse updateAppointment(Long businessId,
                                                 Long appointmentId,
                                                 UpdateAppointmentRequest request) {
        // se bloquea la cita porque puede cambiar casi todo
        Appointment appointment = appointmentRepository
                .findByIdAndBusinessIdForUpdate(appointmentId, businessId)
                .orElseThrow(() -> new NotFoundException("la cita", appointmentId));

        String currentStatus = appointment.getStatus().getName();
        if (NON_EDITABLE_STATUSES.contains(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se puede editar una cita en estado " + currentStatus);
        }

        Business business = findActiveBusiness(businessId);
        Membership membership = lockActiveEmployee(businessId, request.membershipId());
        Booth booth = request.boothId() != null ? lockActiveBooth(businessId, request.boothId()) : null;

        List<BusinessService> services = bookableServices.load(businessId, request.serviceIds());
        LocalDateTime start = request.startDateTime();
        LocalDateTime end = start.plusMinutes(BookableServices.totalMinutes(services));
        // la propia cita no cuenta como ocupada
        validateSlot(business, membership, booth, start, end, appointmentId);

        // reagendar una cita cancelada la devuelve al flujo normal desde pendiente
        if (RESET_TO_PENDING_ON_EDIT.contains(currentStatus)) {
            appointment.setStatus(findStatus("PENDING"));
        }
        appointment.setMembership(membership);
        appointment.setBooth(booth);
        appointment.setStartDateTime(start);
        appointment.setEndDateTime(end);
        appointment.setNotes(request.notes());

        Appointment saved = saveCheckingConflicts(appointment);

        // se borra lo viejo y se guarda lo nuevo
        bookedServiceRepository.deleteAllByAppointmentId(saved.getId());
        bookedServiceRepository.flush();
        return AppointmentResponse.from(saved, saveBookedServices(saved, services));
    }

    /** cambia el estado de pago de una cita del negocio */
    public AppointmentResponse markPayment(Long businessId,
                                           Long appointmentId,
                                           UpdatePaymentRequest request) {
        Appointment appointment = findAppointment(businessId, appointmentId);
        appointment.setIsPaid(request.isPaid());
        return toResponse(appointmentRepository.save(appointment));
    }

    // pasos comunes de crear y editar

    /** todas las comprobaciones de horario y solapes de un hueco */
    private void validateSlot(Business business, Membership membership, Booth booth,
                              LocalDateTime start, LocalDateTime end, Long excludeAppointmentId) {
        Long membershipId = membership.getId();
        Long boothId = booth != null ? booth.getId() : null;

        BusinessHour opening = validator.validateBusinessHours(business.getId(), start, end);
        validator.validateAppointmentInterval(start, opening.getStartTime(), business.getAppointmentInterval());
        validator.validateEmployeeSchedule(membershipId, start, end);
        validator.validateNoOverlap(membershipId, start, end, excludeAppointmentId);
        validator.validateNoEmployeeAbsence(membershipId, start, end);
        if (boothId != null) {
            validator.validateNoBoothOverlap(boothId, start, end, excludeAppointmentId);
        }
        validator.validateNoScheduleBlock(business.getId(), membershipId, boothId, start);
    }

    /**
     * guarda la cita en el momento para convertir un duplicado en un 409 controlado
     * los indices unicos de la base de datos son la ultima barrera contra la doble reserva
     */
    private Appointment saveCheckingConflicts(Appointment appointment) {
        try {
            return appointmentRepository.saveAndFlush(appointment);
        } catch (DataIntegrityViolationException ex) {
            String constraint = constraintName(ex);
            if (constraint.contains("uq_appointment_active_booth_slot")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "La cabina ya tiene una cita en ese horario");
            }
            if (constraint.contains("uq_appointment_active_slot")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El empleado ya tiene una cita en ese horario");
            }
            throw ex;
        }
    }

    /** nombre de la restriccion que ha fallado, segun Hibernate */
    private static String constraintName(DataIntegrityViolationException ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof ConstraintViolationException cve && cve.getConstraintName() != null) {
                return cve.getConstraintName();
            }
        }
        return "";
    }

    /** congela precio e impuesto de cada servicio en el momento de reservar */
    private List<BookedService> saveBookedServices(Appointment appointment, List<BusinessService> services) {
        List<BookedService> booked = services.stream().map(service -> {
            BookedService b = new BookedService();
            b.setAppointment(appointment);
            b.setService(service);
            b.setAppliedPrice(service.getPrice());
            b.setAppliedTaxPercentage(service.getTax().getPercentage());
            return b;
        }).toList();
        return bookedServiceRepository.saveAll(booked);
    }

    // busquedas con su error correspondiente

    private Business findActiveBusiness(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new NotFoundException("el negocio", businessId));
        if (!Boolean.TRUE.equals(business.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El negocio está desactivado");
        }
        return business;
    }

    private Client findActiveClient(Long businessId, Long clientId) {
        Client client = clientRepository.findByIdAndBusinessId(clientId, businessId)
                .orElseThrow(() -> new NotFoundException("el cliente", clientId));
        if (!client.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El cliente con ID: " + clientId + " está desactivado");
        }
        return client;
    }

    private Membership lockActiveEmployee(Long businessId, Long membershipId) {
        Membership membership = membershipRepository.findByIdAndBusinessIdForUpdate(membershipId, businessId)
                .orElseThrow(() -> new NotFoundException("el empleado", membershipId));
        if (!membership.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El empleado con ID: " + membershipId + " está desactivado");
        }
        return membership;
    }

    private Booth lockActiveBooth(Long businessId, Long boothId) {
        Booth booth = boothRepository.findByIdAndBusinessIdForUpdate(boothId, businessId)
                .orElseThrow(() -> new NotFoundException("la cabina", boothId));
        if (!booth.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La cabina con ID: " + boothId + " está desactivada");
        }
        return booth;
    }

    private Appointment findAppointment(Long businessId, Long appointmentId) {
        return appointmentRepository.findByIdAndBusinessId(appointmentId, businessId)
                .orElseThrow(() -> new NotFoundException("la cita", appointmentId));
    }

    /** si falta un estado el problema es de datos base, no de la peticion */
    private AppointmentStatus findStatus(String name) {
        return statusRepository.findByName(name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Error de configuración: no se encontró el estado " + name + " en la base de datos"));
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        return AppointmentResponse.from(appointment,
                bookedServiceRepository.findAllByAppointmentId(appointment.getId()));
    }
}
