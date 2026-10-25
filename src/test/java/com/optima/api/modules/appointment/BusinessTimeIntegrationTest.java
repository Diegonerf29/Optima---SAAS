package com.optima.api.modules.appointment;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * regresion de M14 y B12: "ahora" es la hora del negocio, no la del servidor
 * reloj fijo: lunes 7/1/2030 a las 09:30 UTC = 10:30 en Madrid = 09:30 en Canarias
 */
class BusinessTimeIntegrationTest extends IntegrationTest {

    @TestConfiguration
    static class RelojFijo {
        @Bean
        @Primary
        Clock relojDeTest() {
            return Clock.fixed(Instant.parse("2030-01-07T09:30:00Z"), ZoneOffset.UTC);
        }
    }

    @Test
    void enMadridNoSeOfrecenNiAceptanHuecosQueYaHanPasado() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);

        List<String> inicios = huecos(e);
        assertThat(inicios).doesNotContain("10:00").startsWith("10:30");

        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio30)).andExpect(status().isBadRequest());
        e.crearCita(e.cita(en(LUNES, "10:30"), null, e.servicio30)).andExpect(status().isCreated());
    }

    @Test
    void enCanariasEsUnaHoraMenosYLas10AunNoHanPasado() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        cambiarZona(e, "Atlantic/Canary");

        assertThat(huecos(e)).startsWith("10:00");
        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio30)).andExpect(status().isCreated());
    }

    @Test
    void ayerNoSePuedeConsultarNiReservar() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        e.leer("/availability?date=" + LUNES.minusDays(1) + "&serviceIds=" + e.servicio30)
                .andExpect(status().isBadRequest());
    }

    @Test
    void noSePuedeMoverUnaCitaAlPasado() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        long id = json(e.crearCita(e.cita(en(LUNES, "12:00"), null, e.servicio30))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();

        e.editarCita(id, e.cita(en(LUNES, "10:00"), null, e.servicio30)).andExpect(status().isBadRequest());
        e.editarCita(id, e.cita(en(LUNES, "13:00"), null, e.servicio30)).andExpect(status().isOk());
    }

    @Test
    void unaCitaEnCursoSoloPermiteCambiarLasNotas() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        long id = json(e.crearCita(e.cita(en(LUNES, "12:00"), null, e.servicio30))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        e.cambiarEstado(id, "CONFIRMED").andExpect(status().isOk());
        e.cambiarEstado(id, "IN_PROGRESS").andExpect(status().isOk());

        e.editarCita(id, e.cita(en(LUNES, "13:00"), null, e.servicio30)).andExpect(status().isBadRequest());
        e.editarCita(id, e.cita(en(LUNES, "12:00"), null, e.servicio30, e.servicio45)).andExpect(status().isBadRequest());

        Map<String, Object> soloNotas = e.cita(en(LUNES, "12:00"), null, e.servicio30);
        soloNotas.put("notes", "Le ha gustado el color");
        e.editarCita(id, soloNotas).andExpect(status().isOk()).andExpect(jsonPath("$.notes").value("Le ha gustado el color"));
    }

    @Test
    void zonaHorariaInventadaDa400() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        mockMvc.perform(put(e.url("")).header("Authorization", bearer(e.token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Salon", "email", "s-" + e.businessId + "@ejemplo.com", "timezone", "Marte/Olympus"))))
                .andExpect(status().isBadRequest());
    }

    private List<String> huecos(Escenario e) throws Exception {
        JsonNode slots = json(e.leer("/availability?date=" + LUNES + "&serviceIds=" + e.servicio30)
                .andExpect(status().isOk()).andReturn()).path("slots");
        List<String> inicios = new ArrayList<>();
        slots.forEach(h -> inicios.add(h.path("startTime").asString().substring(0, 5)));
        return inicios;
    }

    private void cambiarZona(Escenario e, String zona) throws Exception {
        mockMvc.perform(put(e.url("")).header("Authorization", bearer(e.token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Salon", "email", "s-" + e.businessId + "@ejemplo.com", "timezone", zona))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value(zona));
    }
}
