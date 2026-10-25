package com.optima.api.modules.business.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * hora actual en la zona horaria de cada negocio (M14)
 * las citas son hora local del negocio, asi que "ya ha pasado" o "hoy" se calculan aqui
 * y no con LocalDateTime.now(), que usa la zona del servidor
 */
@Component
@RequiredArgsConstructor
public class BusinessClock {

    private final Clock clock;
    private final BusinessRepository businessRepository;

    public ZoneId zone(Business business) {
        return ZoneId.of(business.getTimezone());
    }

    public LocalDateTime now(Business business) {
        return LocalDateTime.now(clock.withZone(zone(business)));
    }

    public LocalDate today(Business business) {
        return LocalDate.now(clock.withZone(zone(business)));
    }

    public LocalDateTime now(Long businessId) {
        return now(businessRepository.findById(businessId)
                .orElseThrow(() -> new NotFoundException("el negocio", businessId)));
    }
}
