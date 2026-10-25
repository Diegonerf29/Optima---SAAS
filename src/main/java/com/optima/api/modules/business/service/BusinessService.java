package com.optima.api.modules.business.service;

import com.optima.api.modules.business.dto.response.BusinessResponse;
import com.optima.api.modules.business.dto.request.CreateBusinessRequest;
import com.optima.api.modules.business.dto.request.UpdateBusinessRequest;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.List;

/** logica del modulo de negocios */
@Service
@Transactional
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final ApplicationEventPublisher events;

    /** crea el negocio y devuelve la entidad para usarla dentro del registro */
    public Business createEntity(CreateBusinessRequest request) {
        String slug = request.slug().trim().toLowerCase();
        String email = request.email().trim().toLowerCase();

        if (!slug.matches("^[a-z0-9-]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El slug solo puede contener letras minúsculas, números y guiones");
        }
        if (businessRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un negocio con ese slug");
        }
        if (businessRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un negocio con ese email");
        }

        int interval = request.appointmentInterval() != null ? request.appointmentInterval() : 30;
        if (!List.of(15, 30, 45, 60).contains(interval)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El intervalo de cita debe ser 15, 30, 45 o 60 minutos");
        }

        Business b = new Business();
        b.setName(request.name().trim());
        b.setSlug(slug);
        b.setEmail(email);
        b.setPhone(request.phone());
        b.setAddress(request.address());
        b.setCity(request.city());
        b.setState(request.state());
        b.setCountry(request.country());
        b.setPostalCode(request.postalCode());
        b.setAppointmentInterval(interval);
        b.setTimezone(validTimezone(request.timezone(), "Europe/Madrid"));
        b.setIsActive(true);

        Business saved = businessRepository.save(b);
        // las coordenadas se calculan despues de guardar, fuera de la transaccion (B19)
        events.publishEvent(new BusinessAddressChanged(saved.getId()));
        return saved;
    }

    /** devuelve un negocio aunque este desactivado */
    @Transactional(readOnly = true)
    public BusinessResponse getById(Long id) {
        return BusinessResponse.from(findOrThrow(id));
    }

    /** actualiza los datos del negocio y vuelve a calcular coordenadas */
    public BusinessResponse update(Long id, UpdateBusinessRequest request) {
        Business b = findOrThrow(id);
        String email = request.email().trim().toLowerCase();

        if (!b.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El negocio está desactivado");
        }
        if (!b.getEmail().equalsIgnoreCase(email) && businessRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un negocio con ese email");
        }
        if (request.appointmentInterval() != null && !List.of(15, 30, 45, 60).contains(request.appointmentInterval())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El intervalo de cita debe ser 15, 30, 45 o 60 minutos");
        }

        boolean addressChanges = !Objects.equals(b.getAddress(), request.address())
                || !Objects.equals(b.getCity(), request.city())
                || !Objects.equals(b.getPostalCode(), request.postalCode())
                || !Objects.equals(b.getCountry(), request.country());

        b.setName(request.name().trim());
        b.setEmail(email);
        b.setPhone(request.phone());
        b.setAddress(request.address());
        b.setCity(request.city());
        b.setState(request.state());
        b.setCountry(request.country());
        b.setPostalCode(request.postalCode());
        if (request.appointmentInterval() != null) {
            b.setAppointmentInterval(request.appointmentInterval());
        }
        b.setTimezone(validTimezone(request.timezone(), b.getTimezone()));
        if (request.sendClientEmails() != null) {
            b.setSendClientEmails(request.sendClientEmails());
        }

        // solo se vuelve a geocodificar si ha cambiado la direccion
        if (addressChanges) {
            events.publishEvent(new BusinessAddressChanged(b.getId()));
        }
        return BusinessResponse.from(businessRepository.save(b));
    }

    /** archiva el negocio sin borrarlo fisicamente */
    public void deactivate(Long id) {
        Business b = findOrThrow(id);
        if (!b.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El negocio ya está desactivado");
        }
        b.setIsActive(false);
        b.setDeactivatedAt(LocalDateTime.now());
        businessRepository.save(b);
    }

    /** reactiva un negocio archivado */
    public BusinessResponse reactivate(Long id) {
        Business b = findOrThrow(id);
        if (b.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El negocio ya está activo");
        }
        b.setIsActive(true);
        b.setDeactivatedAt(null);
        return BusinessResponse.from(businessRepository.save(b));
    }

    /** busca un negocio por id o lanza 404 */
    private Business findOrThrow(Long id) {
        return businessRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "No se encontró el negocio con ID: " + id));
    }

    /** comprueba que la zona horaria exista; si viene vacia se deja la que habia */
    private static String validTimezone(String timezone, String current) {
        if (timezone == null || timezone.isBlank()) {
            return current;
        }
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (DateTimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La zona horaria '" + timezone + "' no es válida. Ejemplo: Europe/Madrid");
        }
    }
}
