package com.optima.api.modules.client.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.common.utils.TextUtils;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.service.BusinessClock;
import com.optima.api.modules.client.dto.request.ClientRequest;
import com.optima.api.modules.client.dto.response.ClientResponse;
import com.optima.api.modules.client.model.Client;
import com.optima.api.modules.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/** se queda la logica de clientes */
@Service
@Transactional
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final BusinessRepository businessRepository;
    private final AppointmentRepository appointmentRepository;
    private final BusinessClock businessClock;

    /** crea el cliente dentro del negocio correspondiente */
    public ClientResponse create(Long businessId, ClientRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new NotFoundException("el negocio", businessId));

        Client c = new Client();
        c.setBusiness(business);
        c.setFullName(request.fullName().trim());
        c.setEmail(TextUtils.blankToNull(request.email()));
        c.setPhone(TextUtils.blankToNull(request.phone()));
        c.setNotes(request.notes());
        c.setIsActive(true);

        return ClientResponse.from(clientRepository.save(c));
    }

    /** lista clientes y cuando corresponde filtra por busqueda */
    @Transactional(readOnly = true)
    public Page<ClientResponse> listByBusiness(Long businessId, boolean active, String search, Pageable pageable) {
        String q = search == null ? "" : search.trim();
        Page<Client> page;
        if (active && !q.isEmpty()) {
            page = clientRepository.searchActiveByBusiness(businessId, escapeLike(q), pageable);
        } else {
            page = active
                    ? clientRepository.findByBusinessIdAndIsActiveTrue(businessId, pageable)
                    : clientRepository.findByBusinessIdAndIsActiveFalse(businessId, pageable);
        }
        return page.map(ClientResponse::from);
    }

    /** obtiene un cliente concreto */
    @Transactional(readOnly = true)
    public ClientResponse getById(Long businessId, Long id) {
        return ClientResponse.from(findOrThrow(businessId, id));
    }

    /** actualiza los datos del cliente si sigue activo */
    public ClientResponse update(Long businessId, Long id, ClientRequest request) {
        Client c = findOrThrow(businessId, id);

        if (!c.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El cliente está desactivado");
        }

        c.setFullName(request.fullName().trim());
        c.setEmail(TextUtils.blankToNull(request.email()));
        c.setPhone(TextUtils.blankToNull(request.phone()));
        c.setNotes(request.notes());

        return ClientResponse.from(clientRepository.save(c));
    }

    /** no se permite archivarlo si aun tiene citas pendientes */
    public void deactivate(Long businessId, Long id) {
        Client c = findOrThrow(businessId, id);
        if (!c.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El cliente ya está desactivado");
        }
        long pendientes = appointmentRepository.countActiveByClientAndBusiness(
                id, businessId, businessClock.now(businessId));
        if (pendientes > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El cliente tiene " + pendientes + " cita(s) pendiente(s); "
                            + "cancélalas o reasígnalas antes de archivar");
        }
        c.setIsActive(false);
        c.setDeactivatedAt(LocalDateTime.now());
        clientRepository.save(c);
    }

    /** reactiva un cliente archivado */
    public ClientResponse reactivate(Long businessId, Long id) {
        Client c = findOrThrow(businessId, id);
        if (c.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El cliente ya está activo");
        }
        c.setIsActive(true);
        c.setDeactivatedAt(null);
        return ClientResponse.from(clientRepository.save(c));
    }

    /** busca el cliente dentro de su negocio */
    private Client findOrThrow(Long businessId, Long id) {
        return clientRepository.findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> new NotFoundException("el cliente", id));
    }


    /**
     * en un LIKE, % y _ son comodines: se escapan con ! para buscarlos como texto (B20)
     * sin esto, buscar "%" devolvia todos los clientes
     */
    static String escapeLike(String text) {
        return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
