package com.optima.api.modules.privacy.dto;

import com.optima.api.modules.appointment.dto.response.AppointmentResponse;
import com.optima.api.modules.business.dto.response.BoothResponse;
import com.optima.api.modules.business.dto.response.BusinessHourResponse;
import com.optima.api.modules.business.dto.response.BusinessResponse;
import com.optima.api.modules.business.dto.response.ScheduleBlockResponse;
import com.optima.api.modules.business.dto.response.TaxResponse;
import com.optima.api.modules.catalog.dto.response.OfferingResponse;
import com.optima.api.modules.catalog.dto.response.ServiceCategoryResponse;
import com.optima.api.modules.client.dto.response.ClientResponse;
import com.optima.api.modules.user.dto.response.EmployeeAbsenceResponse;
import com.optima.api.modules.user.dto.response.EmployeeScheduleResponse;
import com.optima.api.modules.user.dto.response.UserResponse;

import java.time.Instant;
import java.util.List;

/** todos los datos de un negocio, para llevarselos o guardarlos antes de darse de baja (RGPD) */
public record BusinessDataExport(
        Instant exportedAt,
        BusinessResponse business,
        List<UserResponse> team,
        List<EmployeeScheduleResponse> schedules,
        List<EmployeeAbsenceResponse> absences,
        List<BusinessHourResponse> hours,
        List<ScheduleBlockResponse> blocks,
        List<BoothResponse> booths,
        List<TaxResponse> taxes,
        List<ServiceCategoryResponse> categories,
        List<OfferingResponse> services,
        List<ClientResponse> clients,
        List<AppointmentResponse> appointments
) {
}
