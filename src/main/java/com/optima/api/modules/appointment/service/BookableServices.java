package com.optima.api.modules.appointment.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.catalog.model.BusinessService;
import com.optima.api.modules.catalog.repository.BusinessServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * carga los servicios que se quieren reservar
 * lo usan crear cita, editar cita y disponibilidad, asi los tres aplican la misma regla (M12)
 */
@Component
@RequiredArgsConstructor
public class BookableServices {

    private final BusinessServiceRepository serviceRepository;

    /**
     * devuelve los servicios activos del negocio en el orden pedido y sin repetidos
     * con una sola consulta a la base de datos
     */
    public List<BusinessService> load(Long businessId, List<Long> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe indicar al menos un servicio");
        }
        // un servicio repetido cuenta una sola vez
        Set<Long> uniqueIds = new LinkedHashSet<>(serviceIds);
        Map<Long, BusinessService> found = serviceRepository.findAllByIdInAndBusinessId(uniqueIds, businessId).stream()
                .collect(Collectors.toMap(BusinessService::getId, Function.identity()));

        List<BusinessService> services = new ArrayList<>();
        for (Long id : uniqueIds) {
            BusinessService service = found.get(id);
            if (service == null) {
                throw new NotFoundException("el servicio", id);
            }
            if (!service.getIsActive()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El servicio con ID: " + id + " está desactivado");
            }
            services.add(service);
        }
        return services;
    }

    /** suma la duracion de los servicios en minutos */
    public static int totalMinutes(List<BusinessService> services) {
        return services.stream().mapToInt(BusinessService::getDurationMinutes).sum();
    }
}
