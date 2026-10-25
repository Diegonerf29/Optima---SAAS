package com.optima.api.modules.user;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.toJson;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** B8: ausencias y horarios aplican la misma regla de solape al crear y al editar */
class EmployeeAgendaIntegrationTest extends IntegrationTest {

    @Test
    void ausenciasNoSePisanPeroUnaSePuedeEditarSobreSiMisma() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        String ruta = "/users/" + e.membershipId + "/absences";
        long id = e.crear(ruta, Map.of("startDateTime", "2030-02-01T10:00:00", "endDateTime", "2030-02-01T14:00:00", "reason", "  Medico  "));

        enviar(e, post(e.url(ruta)), Map.of("startDateTime", "2030-02-01T13:00:00", "endDateTime", "2030-02-01T15:00:00"))
                .andExpect(status().isConflict());
        enviar(e, put(e.url(ruta + "/" + id)), Map.of("startDateTime", "2030-02-01T09:00:00", "endDateTime", "2030-02-01T14:00:00", "reason", "  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").doesNotExist());
        enviar(e, post(e.url(ruta)), Map.of("startDateTime", "2030-02-01T10:00:00", "endDateTime", "2030-02-01T09:00:00"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void tramosDeHorarioNoSePisanElMismoDia() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        String ruta = "/users/" + e.membershipId + "/schedules";
        // el escenario ya tiene 10-14 y 16-20 de lunes a sabado
        enviar(e, post(e.url(ruta)), Map.of("dayOfWeek", 1, "startTime", "13:00", "endTime", "15:00"))
                .andExpect(status().isConflict());
        enviar(e, post(e.url(ruta)), Map.of("dayOfWeek", 7, "startTime", "10:00", "endTime", "12:00"))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions enviar(Escenario e,
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder peticion, Object cuerpo) throws Exception {
        return mockMvc.perform(peticion.header("Authorization", bearer(e.token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(cuerpo)));
    }
}
