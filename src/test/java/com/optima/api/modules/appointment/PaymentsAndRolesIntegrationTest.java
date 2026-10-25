package com.optima.api.modules.appointment;

import com.optima.api.support.Escenario;
import com.optima.api.support.Escenario.Empleado;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

import java.util.Map;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de M7 (permisos de EMPLOYEE) y M8 (cobros) */
class PaymentsAndRolesIntegrationTest extends IntegrationTest {

    private Escenario e;
    private Empleado ana;

    @BeforeEach
    void negocio() throws Exception {
        e = Escenario.nuevo(mockMvc);
        ana = e.empleado("Ana Recepcion");
    }

    @Test
    void elEmpleadoCobraYQuedaRegistradoQuienCuandoYComo() throws Exception {
        long id = cita("10:00", e.servicio30, e.servicio45);

        cobrar(ana.token(), id, true, "CARD")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPaid").value(true))
                .andExpect(jsonPath("$.paidByName").value("Ana Recepcion"))
                .andExpect(jsonPath("$.paymentMethod").value("CARD"))
                .andExpect(jsonPath("$.paidAt").exists())
                // 15,00 + 25,50 con IVA incluido; IVA dentro = 7,03; base = 33,47
                .andExpect(jsonPath("$.total").value(40.50))
                .andExpect(jsonPath("$.taxAmount").value(7.03))
                .andExpect(jsonPath("$.subtotal").value(33.47));
    }

    @Test
    void soloElAdminPuedeDeshacerUnCobro() throws Exception {
        long id = cita("10:00", e.servicio30);
        cobrar(ana.token(), id, true, "CASH").andExpect(status().isOk());

        cobrar(ana.token(), id, false, null).andExpect(status().isForbidden());
        cobrar(e.token, id, false, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPaid").value(false))
                .andExpect(jsonPath("$.paidByName").doesNotExist())
                .andExpect(jsonPath("$.paymentMethod").doesNotExist());
    }

    @Test
    void noSeCobranCitasCanceladas() throws Exception {
        long id = cita("10:00", e.servicio30);
        e.cambiarEstado(id, "CANCELLED").andExpect(status().isOk());
        cobrar(ana.token(), id, true, "CASH").andExpect(status().isBadRequest());
    }

    @Test
    void unaCitaCobradaNoCambiaDeServiciosPeroSePuedeMover() throws Exception {
        long id = cita("10:00", e.servicio30);
        cobrar(ana.token(), id, true, "CASH").andExpect(status().isOk());

        e.editarCita(id, e.cita(en(LUNES, "10:00"), null, e.servicio30, e.servicio45)).andExpect(status().isBadRequest());
        e.editarCita(id, e.cita(en(LUNES, "12:00"), null, e.servicio30))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(15.00));
    }

    @Test
    void editarNoRecalculaElPrecioDeLosServiciosQueYaEstaban() throws Exception {
        long id = cita("10:00", e.servicio30);
        // el catalogo sube el precio despues de reservar
        mockMvc.perform(put(e.url("/services/" + e.servicio30)).header("Authorization", bearer(e.token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("categoryId", e.categoriaId, "taxId", e.impuestoId, "name", "Corte",
                                "price", "18.00", "durationMinutes", 30))))
                .andExpect(status().isOk());

        Map<String, Object> conNota = e.cita(en(LUNES, "10:00"), null, e.servicio30, e.servicio45);
        conNota.put("notes", "Añade color");
        JsonNode editada = json(e.editarCita(id, conNota).andExpect(status().isOk()).andReturn());
        // el corte mantiene los 15,00 de la reserva; el color nuevo entra con su precio actual
        assertThat(editada.path("bookedServices").get(0).path("appliedPrice").decimalValue()).isEqualByComparingTo("15.00");
        assertThat(editada.path("total").decimalValue()).isEqualByComparingTo("40.50");
    }

    @Test
    void soloElAdminArchivaYReactivaClientes() throws Exception {
        mockMvc.perform(delete(e.url("/clients/" + e.clienteId)).header("Authorization", bearer(ana.token())))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete(e.url("/clients/" + e.clienteId)).header("Authorization", bearer(e.token)))
                .andExpect(status().isNoContent());
        mockMvc.perform(patch(e.url("/clients/" + e.clienteId + "/reactivate")).header("Authorization", bearer(ana.token())))
                .andExpect(status().isForbidden());
    }

    @Test
    void elEmpleadoNoVeElContactoDeSusCompaneros() throws Exception {
        JsonNode vistaEmpleado = json(mockMvc.perform(get(e.url("/users")).header("Authorization", bearer(ana.token()))).andReturn());
        for (JsonNode u : vistaEmpleado.path("content")) {
            boolean esElla = u.path("id").asLong() == ana.membershipId();
            assertThat(u.path("fullName").isNull()).isFalse();
            assertThat(u.path("email").isNull()).isEqualTo(!esElla);
            assertThat(u.path("phone").isNull()).isEqualTo(!esElla);
        }
        mockMvc.perform(get(e.url("/users/" + e.membershipId)).header("Authorization", bearer(ana.token())))
                .andExpect(jsonPath("$.email").doesNotExist());
        mockMvc.perform(get(e.url("/users/" + ana.membershipId())).header("Authorization", bearer(e.token)))
                .andExpect(jsonPath("$.email").value(ana.email()));
    }

    private long cita(String hora, long... servicios) throws Exception {
        return json(e.crearCita(e.cita(en(LUNES, hora), null, servicios)).andExpect(status().isCreated()).andReturn())
                .path("id").asLong();
    }

    private org.springframework.test.web.servlet.ResultActions cobrar(String token, long id, boolean pagada, String forma) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("isPaid", pagada);
        if (forma != null) {
            body.put("paymentMethod", forma);
        }
        return mockMvc.perform(patch(e.url("/appointments/" + id + "/payment")).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(body)));
    }
}
