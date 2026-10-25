package com.optima.api.modules.user;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** B8: ausencias y horarios aplican la misma regla de solape al crear y al editar */
class EmployeeAgendaIntegrationTest extends IntegrationTest {

    @Test
    void sinHorarioPropioTrabajaTodoElHorarioDelNegocio() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        long nuevo = e.crear("/users", Map.of("roleId", 2, "fullName", "Sin Horario",
                "email", "sin-horario-" + unico() + "@ejemplo.com", "password", "clave-segura-1"));

        // tiene los huecos del horario del negocio (10-14 y 16-20)
        assertThat(huecos(e, LUNES.toString(), nuevo))
                .contains("10:00", "13:30", "16:00", "19:30")
                .doesNotContain("14:00", "15:30");
        e.crearCita(citaDe(e, nuevo, "16:00")).andExpect(status().isCreated());
        // fuera del horario del negocio se sigue rechazando
        e.crearCita(citaDe(e, nuevo, "14:00")).andExpect(status().isBadRequest());

        // en cuanto tiene un tramo propio, solo trabaja en sus tramos
        e.crear("/users/" + nuevo + "/schedules", Map.of("dayOfWeek", 1, "startTime", "10:00", "endTime", "12:00"));
        assertThat(huecos(e, LUNES.toString(), nuevo)).contains("10:00", "11:30").doesNotContain("12:00", "17:00");
        assertThat(huecos(e, LUNES.plusDays(1).toString(), nuevo)).isEmpty();
        e.crearCita(citaDe(e, nuevo, "17:00")).andExpect(status().isBadRequest());
    }

    private List<String> huecos(Escenario e, String dia, long membershipId) throws Exception {
        JsonNode r = json(e.leer("/availability?date=" + dia + "&serviceIds=" + e.servicio30 + "&membershipId=" + membershipId)
                .andExpect(status().isOk()).andReturn());
        List<String> horas = new ArrayList<>();
        for (JsonNode hueco : r.path("slots")) {
            horas.add(hueco.path("startTime").asString().substring(0, 5));
        }
        return horas;
    }

    private Map<String, Object> citaDe(Escenario e, long membershipId, String hora) {
        Map<String, Object> cita = e.cita(en(LUNES, hora), null, e.servicio30);
        cita.put("membershipId", membershipId);
        return cita;
    }

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
