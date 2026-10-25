package com.optima.api.modules.appointment;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de M2: todo hueco que ofrece la disponibilidad se puede reservar, con cualquier intervalo */
class AvailabilityIntegrationTest extends IntegrationTest {

    @ParameterizedTest
    @ValueSource(ints = {15, 30, 45, 60})
    void todoHuecoOfrecidoSePuedeReservar(int intervalo) throws Exception {
        Escenario e = Escenario.nuevo(mockMvc, intervalo);
        JsonNode disponibilidad = json(e.leer("/availability?date=" + LUNES + "&serviceIds=" + e.servicio30)
                .andExpect(status().isOk()).andReturn());
        JsonNode huecos = disponibilidad.path("slots");
        assertThat(huecos.size()).isPositive();

        List<String> rechazados = new ArrayList<>();
        for (JsonNode hueco : huecos) {
            String inicio = hueco.path("startTime").asString().substring(0, 5);
            var respuesta = e.crearCita(e.cita(en(LUNES, inicio), null, e.servicio30)).andReturn().getResponse();
            if (respuesta.getStatus() != 201) {
                rechazados.add(inicio + " -> " + respuesta.getContentAsString());
                continue;
            }
            // se cancela para dejar libre el hueco siguiente
            long id = json(respuesta.getContentAsString()).path("id").asLong();
            e.cambiarEstado(id, "CANCELLED").andExpect(status().isOk());
        }
        assertThat(rechazados).as("huecos ofrecidos que luego se rechazan").isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {45})
    void conIntervaloDe45LosHuecosEmpiezanEnLaApertura(int intervalo) throws Exception {
        Escenario e = Escenario.nuevo(mockMvc, intervalo);
        JsonNode huecos = json(e.leer("/availability?date=" + LUNES + "&serviceIds=" + e.servicio30).andReturn()).path("slots");
        List<String> inicios = new ArrayList<>();
        huecos.forEach(h -> inicios.add(h.path("startTime").asString().substring(0, 5)));
        // apertura a las 10:00 y a las 16:00 (turno partido)
        assertThat(inicios).startsWith("10:00", "10:45", "11:30", "12:15", "13:00").contains("16:00", "16:45", "17:30");
        assertThat(inicios).doesNotContain("13:45", "11:00");
    }
}
