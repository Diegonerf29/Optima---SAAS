package com.optima.api.modules.business.service;

import com.optima.api.common.geocoding.GeocodingService;
import com.optima.api.modules.business.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * calcula las coordenadas del negocio despues de guardarlo y en segundo plano (B19)
 * antes se llamaba a Nominatim dentro de la transaccion y la conexion a la BD quedaba ocupada
 * hasta 5 segundos esperando la respuesta
 */
@Component
@RequiredArgsConstructor
public class BusinessGeocoder {

    private final BusinessRepository businessRepository;
    private final GeocodingService geocodingService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAddressChanged(BusinessAddressChanged event) {
        businessRepository.findById(event.businessId()).ifPresent(b ->
                geocodingService.geocode(b.getAddress(), b.getCity(), b.getPostalCode(), b.getCountry())
                        .ifPresent(coords -> {
                            b.setLatitude(coords.latitude());
                            b.setLongitude(coords.longitude());
                        }));
    }
}
