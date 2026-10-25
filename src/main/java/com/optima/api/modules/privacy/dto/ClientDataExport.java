package com.optima.api.modules.privacy.dto;

import com.optima.api.modules.appointment.dto.response.AppointmentResponse;
import com.optima.api.modules.client.dto.response.ClientResponse;

import java.time.Instant;
import java.util.List;

/** todo lo que Optima guarda de un cliente (derecho de acceso y portabilidad del RGPD) */
public record ClientDataExport(
        Instant exportedAt,
        ClientResponse client,
        List<AppointmentResponse> appointments
) {
}
