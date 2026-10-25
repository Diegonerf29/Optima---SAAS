package com.optima.api.modules.privacy.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.appointment.dto.response.AppointmentResponse;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.appointment.service.AppointmentService;
import com.optima.api.modules.billing.model.SubscriptionStatuses;
import com.optima.api.modules.business.dto.response.BoothResponse;
import com.optima.api.modules.business.dto.response.BusinessHourResponse;
import com.optima.api.modules.business.dto.response.BusinessResponse;
import com.optima.api.modules.business.dto.response.ScheduleBlockResponse;
import com.optima.api.modules.business.dto.response.TaxResponse;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BoothRepository;
import com.optima.api.modules.business.repository.BusinessHourRepository;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.repository.MembershipRepository;
import com.optima.api.modules.business.repository.ScheduleBlockRepository;
import com.optima.api.modules.business.repository.TaxRepository;
import com.optima.api.modules.business.service.BusinessClock;
import com.optima.api.modules.catalog.dto.response.OfferingResponse;
import com.optima.api.modules.catalog.dto.response.ServiceCategoryResponse;
import com.optima.api.modules.catalog.repository.OfferingRepository;
import com.optima.api.modules.catalog.repository.ServiceCategoryRepository;
import com.optima.api.modules.client.dto.response.ClientResponse;
import com.optima.api.modules.client.model.Client;
import com.optima.api.modules.client.repository.ClientRepository;
import com.optima.api.modules.privacy.dto.BusinessDataExport;
import com.optima.api.modules.privacy.dto.ClientDataExport;
import com.optima.api.modules.user.dto.response.EmployeeAbsenceResponse;
import com.optima.api.modules.user.dto.response.EmployeeScheduleResponse;
import com.optima.api.modules.user.dto.response.UserResponse;
import com.optima.api.modules.user.model.User;
import com.optima.api.modules.user.repository.EmployeeAbsenceRepository;
import com.optima.api.modules.user.repository.EmployeeScheduleRepository;
import com.optima.api.modules.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * derechos del RGPD (paso 10.2): descargar los datos y borrarlos de verdad
 * - cliente: se descargan su ficha y sus citas; al borrarlo se quitan sus datos personales
 *   pero las citas se conservan sin ellos (los cobros pueden tener que guardarse por ley)
 * - negocio: se descargan todos sus datos; el borrado elimina el negocio y todo lo suyo
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PrivacyService {

    /** nombre que queda en las citas de un cliente borrado */
    public static final String ERASED_CLIENT_NAME = "Cliente borrado";

    // las citas se exportan por bloques para no cargar miles de golpe
    private static final int EXPORT_PAGE_SIZE = 500;

    // tablas que se vacian al borrar un negocio, en un orden que respeta las claves foraneas
    // (los servicios de cada cita se borran solos con la cita: ON DELETE CASCADE)
    private static final List<String> ERASE_STATEMENTS = List.of(
            "DELETE FROM appointments WHERE id_business = :id",
            "DELETE FROM schedule_blocks WHERE id_business = :id",
            "DELETE FROM employee_absences WHERE id_membership IN (SELECT id_membership FROM memberships WHERE id_business = :id)",
            "DELETE FROM employee_schedules WHERE id_membership IN (SELECT id_membership FROM memberships WHERE id_business = :id)",
            "DELETE FROM clients WHERE id_business = :id",
            "DELETE FROM services WHERE id_business = :id",
            "DELETE FROM service_categories WHERE id_business = :id",
            "DELETE FROM taxes WHERE id_business = :id",
            "DELETE FROM booths WHERE id_business = :id",
            "DELETE FROM business_hours WHERE id_business = :id",
            "DELETE FROM memberships WHERE id_business = :id",
            "DELETE FROM businesses WHERE id_business = :id");

    // con una suscripcion de Stripe en estos estados todavia se le cobraria
    private static final Set<String> BILLABLE = Set.of(
            SubscriptionStatuses.ACTIVE, SubscriptionStatuses.PAST_DUE, SubscriptionStatuses.TRIALING);

    private final ClientRepository clientRepository;
    private final AppointmentRepository appointmentRepository;
    private final AppointmentService appointmentService;
    private final BusinessRepository businessRepository;
    private final MembershipRepository membershipRepository;
    private final EmployeeScheduleRepository scheduleRepository;
    private final EmployeeAbsenceRepository absenceRepository;
    private final BusinessHourRepository businessHourRepository;
    private final ScheduleBlockRepository scheduleBlockRepository;
    private final BoothRepository boothRepository;
    private final TaxRepository taxRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final OfferingRepository offeringRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BusinessClock businessClock;
    private final EntityManager entityManager;

    // --- cliente ---

    @Transactional(readOnly = true)
    public ClientDataExport exportClient(Long businessId, Long clientId) {
        Client c = findClient(businessId, clientId);
        return new ClientDataExport(Instant.now(), ClientResponse.from(c), allAppointments(businessId, clientId));
    }

    /**
     * borra los datos personales de un cliente (derecho de supresion)
     * no se puede deshacer: el nombre pasa a "Cliente borrado" y se quitan email, telefono y notas
     */
    public ClientResponse anonymizeClient(Long businessId, Long clientId) {
        Client c = findClient(businessId, clientId);
        long pending = appointmentRepository.countActiveByClientAndBusiness(
                clientId, businessId, businessClock.now(businessId));
        if (pending > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El cliente tiene " + pending + " cita(s) pendiente(s); cancélalas antes de borrar sus datos");
        }
        c.setFullName(ERASED_CLIENT_NAME);
        c.setEmail(null);
        c.setPhone(null);
        c.setNotes(null);
        c.setIsActive(false);
        if (c.getDeactivatedAt() == null) {
            c.setDeactivatedAt(LocalDateTime.now());
        }
        appointmentRepository.clearNotesOfClient(clientId, businessId);
        log.info("Datos personales borrados: cliente {} del negocio {}", clientId, businessId);
        return ClientResponse.from(c);
    }

    // --- negocio ---

    @Transactional(readOnly = true)
    public BusinessDataExport exportBusiness(Long businessId) {
        Business b = findBusiness(businessId);
        return new BusinessDataExport(
                Instant.now(),
                BusinessResponse.from(b),
                membershipRepository.findAllByBusinessIdOrderById(businessId).stream().map(UserResponse::from).toList(),
                scheduleRepository.findAllByMembershipBusinessIdOrderById(businessId).stream().map(EmployeeScheduleResponse::from).toList(),
                absenceRepository.findAllByMembershipBusinessIdOrderByStartDateTimeAsc(businessId).stream().map(EmployeeAbsenceResponse::from).toList(),
                businessHourRepository.findAllByBusinessIdOrderByDayOfWeekAscStartTimeAsc(businessId).stream().map(BusinessHourResponse::from).toList(),
                scheduleBlockRepository.findAllByBusinessIdOrderByStartDateAsc(businessId).stream().map(ScheduleBlockResponse::from).toList(),
                boothRepository.findAllByBusinessIdOrderById(businessId).stream().map(BoothResponse::from).toList(),
                taxRepository.findAllByBusinessIdOrderById(businessId).stream().map(TaxResponse::from).toList(),
                categoryRepository.findAllByBusinessIdOrderById(businessId).stream().map(ServiceCategoryResponse::from).toList(),
                offeringRepository.findAllByBusinessIdOrderById(businessId).stream().map(OfferingResponse::from).toList(),
                clientRepository.findAllByBusinessIdOrderById(businessId).stream().map(ClientResponse::from).toList(),
                allAppointments(businessId, null));
    }

    /**
     * borra el negocio y todo lo suyo, sin vuelta atras
     * tres seguros: la contraseña de quien lo pide, el negocio desactivado antes
     * y ninguna suscripcion de Stripe que se siga cobrando
     */
    public void eraseBusiness(Long businessId, Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("el usuario", userId));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña no es correcta");
        }
        Business b = findBusiness(businessId);
        if (Boolean.TRUE.equals(b.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Antes de borrarlo hay que desactivar el negocio");
        }
        if (b.getStripeSubscriptionId() != null && BILLABLE.contains(b.getSubscriptionStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La suscripción sigue en marcha: cancélala antes en \"Pagos y facturas\"");
        }

        // las entidades cargadas en memoria dejan de existir: se vacia el contexto antes y despues
        entityManager.flush();
        entityManager.clear();
        for (String sql : ERASE_STATEMENTS) {
            entityManager.createNativeQuery(sql).setParameter("id", businessId).executeUpdate();
        }
        entityManager.clear();
        log.info("Negocio {} borrado definitivamente a peticion del usuario {}", businessId, userId);
    }

    // --- ayudas ---

    /** todas las citas del negocio (o de un cliente), por bloques */
    private List<AppointmentResponse> allAppointments(Long businessId, Long clientId) {
        List<AppointmentResponse> all = new ArrayList<>();
        Sort order = Sort.by("startDateTime", "id");
        for (int page = 0; ; page++) {
            Page<AppointmentResponse> chunk = appointmentService.searchAppointments(
                    businessId, null, null, null, clientId, PageRequest.of(page, EXPORT_PAGE_SIZE, order));
            all.addAll(chunk.getContent());
            if (!chunk.hasNext()) {
                return all;
            }
        }
    }

    private Client findClient(Long businessId, Long clientId) {
        return clientRepository.findByIdAndBusinessId(clientId, businessId)
                .orElseThrow(() -> new NotFoundException("el cliente", clientId));
    }

    private Business findBusiness(Long businessId) {
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new NotFoundException("el negocio", businessId));
    }
}
