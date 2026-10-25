package com.optima.api.modules.appointment;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.Map;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** comportamiento de crear, editar y cambiar de estado una cita (red de seguridad para el refactor M12) */
class AppointmentIntegrationTest extends IntegrationTest {

    private Escenario e;

    @BeforeEach
    void negocioNuevo() throws Exception {
        e = Escenario.nuevo(mockMvc);
    }

    @Test
    void creaLaCitaConLaDuracionYLosPreciosDeSusServicios() throws Exception {
        e.crearCita(e.cita(en(LUNES, "10:00"), e.cabinaId, e.servicio30, e.servicio45))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusName").value("PENDING"))
                .andExpect(jsonPath("$.endDateTime").value("2030-01-07T11:15:00"))
                .andExpect(jsonPath("$.boothId").value(e.cabinaId))
                .andExpect(jsonPath("$.bookedServices.length()").value(2))
                .andExpect(jsonPath("$.bookedServices[0].appliedPrice").value(15.00))
                .andExpect(jsonPath("$.bookedServices[1].appliedPrice").value(25.50))
                .andExpect(jsonPath("$.bookedServices[0].appliedTaxPercentage").value(21.00));
    }

    @Test
    void elMismoEmpleadoNoPuedeTenerDosCitasSolapadas() throws Exception {
        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio60)).andExpect(status().isCreated());
        e.crearCita(e.cita(en(LUNES, "10:30"), null, e.servicio30)).andExpect(status().isConflict());
        // justo al acabar si se puede
        e.crearCita(e.cita(en(LUNES, "11:00"), null, e.servicio30)).andExpect(status().isCreated());
    }

    @Test
    void laMismaCabinaNoPuedeTenerDosCitasSolapadas() throws Exception {
        long otroEmpleado = otroEmpleadoConHorario();
        e.crearCita(e.cita(en(LUNES, "10:00"), e.cabinaId, e.servicio60)).andExpect(status().isCreated());

        Map<String, Object> otra = e.cita(en(LUNES, "10:30"), e.cabinaId, e.servicio30);
        otra.put("membershipId", otroEmpleado);
        e.crearCita(otra).andExpect(status().isConflict());

        otra.remove("boothId");
        e.crearCita(otra).andExpect(status().isCreated());
    }

    @Test
    void fueraDelHorarioDa400() throws Exception {
        // la pausa de 14 a 16
        e.crearCita(e.cita(en(LUNES, "14:00"), null, e.servicio30)).andExpect(status().isBadRequest());
        // empieza dentro pero acaba en la pausa
        e.crearCita(e.cita(en(LUNES, "13:30"), null, e.servicio60)).andExpect(status().isBadRequest());
        // domingo cerrado
        e.crearCita(e.cita(en(LUNES.plusDays(6), "10:00"), null, e.servicio30)).andExpect(status().isBadRequest());
        // fuera del intervalo de 30 minutos
        e.crearCita(e.cita(en(LUNES, "10:10"), null, e.servicio30)).andExpect(status().isBadRequest());
    }

    @Test
    void servicioRepetidoCuentaUnaSolaVez() throws Exception {
        // la disponibilidad ya los quitaba; crear la cita debe hacer lo mismo (M12)
        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio30, e.servicio30))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endDateTime").value("2030-01-07T10:30:00"))
                .andExpect(jsonPath("$.bookedServices.length()").value(1));
    }

    @Test
    void servicioDeOtroNegocioDa404() throws Exception {
        Escenario otro = Escenario.nuevo(mockMvc);
        e.crearCita(e.cita(en(LUNES, "10:00"), null, otro.servicio30)).andExpect(status().isNotFound());
    }

    @Test
    void reagendarMueveLaCitaYRecalculaElFinal() throws Exception {
        long id = crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));

        e.editarCita(id, e.cita(en(LUNES, "17:00"), e.cabinaId, e.servicio60))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startDateTime").value("2030-01-07T17:00:00"))
                .andExpect(jsonPath("$.endDateTime").value("2030-01-07T18:00:00"))
                .andExpect(jsonPath("$.boothId").value(e.cabinaId));

        // el hueco antiguo queda libre
        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio30)).andExpect(status().isCreated());
    }

    @Test
    void editarNoChocaConsigoMisma() throws Exception {
        long id = crear(e.cita(en(LUNES, "10:00"), e.cabinaId, e.servicio60));
        // alargar la cita sobre su propio hueco
        e.editarCita(id, e.cita(en(LUNES, "10:00"), e.cabinaId, e.servicio60, e.servicio30))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDateTime").value("2030-01-07T11:30:00"));
    }

    @Test
    void cicloDeEstadosHastaCompletadaYDespuesNoSeEdita() throws Exception {
        long id = crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));
        e.cambiarEstado(id, "CONFIRMED").andExpect(status().isOk());
        e.cambiarEstado(id, "IN_PROGRESS").andExpect(status().isOk());
        e.cambiarEstado(id, "COMPLETED").andExpect(status().isOk()).andExpect(jsonPath("$.statusName").value("COMPLETED"));
        e.cambiarEstado(id, "CANCELLED").andExpect(status().isBadRequest());
        e.editarCita(id, e.cita(en(LUNES, "11:00"), null, e.servicio30)).andExpect(status().isBadRequest());
    }

    @Test
    void unaCitaCanceladaLiberaElHuecoYAlReagendarVuelveAPendiente() throws Exception {
        long id = crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));
        e.cambiarEstado(id, "CANCELLED").andExpect(status().isOk());
        e.crearCita(e.cita(en(LUNES, "10:00"), null, e.servicio30)).andExpect(status().isCreated());

        e.editarCita(id, e.cita(en(LUNES, "12:00"), null, e.servicio30))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusName").value("PENDING"));
    }

    @Test
    void estadoInventadoDa400() throws Exception {
        long id = crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));
        e.cambiarEstado(id, "VOLANDO").andExpect(status().isBadRequest());
    }

    @Test
    void buscarCitasPorRangoDeFechas() throws Exception {
        crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));
        crear(e.cita(en(LUNES.plusDays(1), "10:00"), null, e.servicio30));
        JsonNode lunes = json(e.leer("/appointments?from=" + LUNES + "&to=" + LUNES).andReturn());
        assertThat(lunes.path("page").path("totalElements").asLong()).isEqualTo(1);
        JsonNode semana = json(e.leer("/appointments?from=" + LUNES + "&to=" + LUNES.plusDays(6)).andReturn());
        assertThat(semana.path("page").path("totalElements").asLong()).isEqualTo(2);
    }

    @Test
    void buscarCitasDeUnCliente() throws Exception {
        long otroCliente = e.crear("/clients", Map.of("fullName", "Otro"));
        crear(e.cita(en(LUNES, "10:00"), null, e.servicio30));
        Map<String, Object> deOtro = e.cita(en(LUNES, "11:00"), null, e.servicio30);
        deOtro.put("clientId", otroCliente);
        crear(deOtro);
        JsonNode historial = json(e.leer("/appointments?clientId=" + otroCliente).andReturn());
        assertThat(historial.path("page").path("totalElements").asLong()).isEqualTo(1);
        assertThat(historial.path("content").get(0).path("clientId").asLong()).isEqualTo(otroCliente);
    }

    private long crear(Map<String, Object> cita) throws Exception {
        return json(e.crearCita(cita).andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    /** da de alta un segundo empleado con el mismo horario que el admin */
    private long otroEmpleadoConHorario() throws Exception {
        long id = e.crear("/users", Map.of("roleId", 2, "fullName", "Segunda", "email",
                "segunda-" + com.optima.api.support.TestApi.unico() + "@ejemplo.com", "password", "otra-clave-9"));
        e.crear("/users/" + id + "/schedules", Map.of("dayOfWeek", 1, "startTime", "10:00", "endTime", "14:00"));
        return id;
    }
}
