package com.optima.api.modules.appointment.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.appointment.dto.response.AppointmentStatusResponse;
import com.optima.api.modules.appointment.model.AppointmentStatus;
import com.optima.api.modules.appointment.repository.AppointmentStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** logica del catalogo de estados de cita */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AppointmentStatusService {

    private final AppointmentStatusRepository statusRepository;

    /** devuelve todos los estados de cita disponibles */
    public List<AppointmentStatusResponse> listAll() {
        return statusRepository.findAll()
                .stream()
                .map(AppointmentStatusResponse::from)
                .toList();
    }

    /** busca un estado por id */
    public AppointmentStatusResponse getStatusById(Long id) {
        AppointmentStatus status = statusRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("el estado", id));

        return AppointmentStatusResponse.from(status);
    }
}
