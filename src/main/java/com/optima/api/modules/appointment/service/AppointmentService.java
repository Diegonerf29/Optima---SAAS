package com.optima.api.modules.appointment.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.common.security.AuthPrincipal;
import com.optima.api.modules.appointment.dto.request.CreateAppointmentRequest;
import com.optima.api.modules.appointment.dto.request.UpdateAppointmentRequest;
import com.optima.api.modules.appointment.dto.request.UpdateAppointmentStatusRequest;
import com.optima.api.modules.appointment.dto.request.UpdatePaymentRequest;
import com.optima.api.modules.appointment.dto.response.AppointmentResponse;
import com.optima.api.modules.appointment.model.Appointment;
import com.optima.api.modules.appointment.model.AppointmentStatus;
import com.optima.api.modules.appointment.model.BookedService;
import com.optima.api.modules.appointment.notification.AppointmentEvent;
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
import com.optima.api.modules.business.service.BusinessClock;
import com.optima.api.modules.catalog.model.BusinessService;
import com.optima.api.modules.client.model.Client;
import com.optima.api.modules.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.context.ApplicationEventPublisher;
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
import java.util.Objects;
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
    private final BusinessClock businessClock;
    private final ApplicationEventPublisher events;

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

        LocalDateTime start = request.startDateTime();
        validateNotInPast(business, start);
        List<BusinessService> services = bookableServices.load(businessId, request.serviceIds());
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
        List<BookedService> booked = saveBookedServices(saved, services, Map.of());
        // email de confirmacion al cliente, cuando la transaccion se haya guardado (P6)
        events.publishEvent(new AppointmentEvent(saved.getId(), AppointmentEvent.Type.CREATED));
        return AppointmentResponse.from(saved, booked);
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
        Appointment saved = appointmentRepository.save(appointment);
        if ("CANCELLED".equals(newStatus.getName())) {
            events.publishEvent(new AppointmentEvent(saved.getId(), AppointmentEvent.Type.CANCELLED));
        }
        return toResponse(saved);
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

        boolean scheduleChanges = !start.equals(appointment.getStartDateTime())
                || !end.equals(appointment.getEndDateTime())
                || !membership.getId().equals(appointment.getMembership().getId())
                || !Objects.equals(booth != null ? booth.getId() : null,
                                   appointment.getBooth() != null ? appointment.getBooth().getId() : null)
                || !serviceIdsOf(services).equals(bookedServiceIds(appointment));
        // una cita que ya ha empezado no se mueve ni cambia de servicios (B12)
        if (scheduleChanges && "IN_PROGRESS".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Una cita en curso solo permite cambiar las notas");
        }
        // si cambia la hora, la nueva no puede ser pasada (B12, M14)
        if (!start.equals(appointment.getStartDateTime())) {
            validateNotInPast(business, start);
        }
        List<BookedService> previous = bookedServiceRepository.findAllByAppointmentId(appointment.getId());
        // lo cobrado no se toca (M8)
        if (Boolean.TRUE.equals(appointment.getIsPaid()) && !serviceIdsOf(services).equals(serviceIdsOfBooked(previous))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La cita ya está cobrada: no se pueden cambiar sus servicios");
        }
        // la propia cita no cuenta como ocupada
        validateSlot(business, membership, booth, start, end, appointmentId);

        boolean timeChanges = !start.equals(appointment.getStartDateTime());

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

        // se rehacen los servicios reservados conservando el precio de los que ya estaban (M8):
        // editar una nota o mover la cita no debe cambiar lo que se cobra
        Map<Long, BookedService> previousByService = previous.stream()
                .collect(Collectors.toMap(bs -> bs.getService().getId(), bs -> bs));
        bookedServiceRepository.deleteAllByAppointmentId(saved.getId());
        bookedServiceRepository.flush();
        List<BookedService> booked = saveBookedServices(saved, services, previousByService);
        if (timeChanges) {
            events.publishEvent(new AppointmentEvent(saved.getId(), AppointmentEvent.Type.RESCHEDULED));
        }
        return AppointmentResponse.from(saved, booked);
    }

    /**
     * cobra una cita o deshace el cobro (M7, M8)
     * cualquiera puede cobrar (en un local pequeño cobra quien esta en recepcion);
     * deshacer un cobro solo lo puede hacer un ADMIN. Se guarda quien cobro, cuando y como
     */
    public AppointmentResponse markPayment(Long businessId,
                                           Long appointmentId,
                                           UpdatePaymentRequest request,
                                           AuthPrincipal caller) {
        Appointment appointment = findAppointment(businessId, appointmentId);
        boolean alreadyPaid = Boolean.TRUE.equals(appointment.getIsPaid());

        if (Boolean.TRUE.equals(request.isPaid())) {
            if (alreadyPaid) {
                // repetir el cobro (doble clic) no cambia nada
                return toResponse(appointment);
            }
            String status = appointment.getStatus().getName();
            if ("CANCELLED".equals(status) || "NO_SHOW".equals(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No se puede cobrar una cita cancelada o a la que el cliente no vino");
            }
            Membership cashier = membershipRepository.findByUserIdAndBusinessId(caller.userId(), businessId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No perteneces a este negocio"));
            appointment.setIsPaid(true);
            appointment.setPaidAt(businessClock.now(appointment.getBusiness()));
            appointment.setPaidBy(cashier);
            appointment.setPaymentMethod(request.paymentMethod() != null ? request.paymentMethod() : "OTHER");
        } else {
            if (!alreadyPaid) {
                return toResponse(appointment);
            }
            if (!"ADMIN".equals(caller.role())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Solo un administrador puede deshacer un cobro");
            }
            appointment.setIsPaid(false);
            appointment.setPaidAt(null);
            appointment.setPaidBy(null);
            appointment.setPaymentMethod(null);
        }
        return toResponse(appointmentRepository.save(appointment));
    }

    // pasos comunes de crear y editar

    private static Set<Long> serviceIdsOf(List<BusinessService> services) {
        return services.stream().map(BusinessService::getId).collect(Collectors.toSet());
    }

    private Set<Long> bookedServiceIds(Appointment appointment) {
        return serviceIdsOfBooked(bookedServiceRepository.findAllByAppointmentId(appointment.getId()));
    }

    private static Set<Long> serviceIdsOfBooked(List<BookedService> booked) {
        return booked.stream().map(b -> b.getService().getId()).collect(Collectors.toSet());
    }

    /** una cita no puede empezar antes de la hora actual del negocio (M14) */
    private void validateNotInPast(Business business, LocalDateTime start) {
        if (start.isBefore(businessClock.now(business))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cita no puede ser en el pasado");
        }
    }

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

    /**
     * congela precio e impuesto de cada servicio en el momento de reservar
     * si el servicio ya estaba en la cita (previous) se mantiene el precio que tenia
     */
    private List<BookedService> saveBookedServices(Appointment appointment, List<BusinessService> services,
                                                   Map<Long, BookedService> previous) {
        List<BookedService> booked = services.stream().map(service -> {
            BookedService before = previous.get(service.getId());
            BookedService b = new BookedService();
            b.setAppointment(appointment);
            b.setService(service);
            b.setAppliedPrice(before != null ? before.getAppliedPrice() : service.getPrice());
            b.setAppliedTaxPercentage(before != null ? before.getAppliedTaxPercentage() : service.getTax().getPercentage());
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
