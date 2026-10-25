package com.optima.api.modules.business;

import com.optima.api.support.Escenario;
import com.optima.api.support.Escenario.Empleado;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.toJson;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de B13 (ultimo ADMIN) y B11 (impuesto en uso) */
class BusinessRulesIntegrationTest extends IntegrationTest {

    @Test
    void elUltimoAdminNoPuedeQuitarseElRol() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        cambiarRol(e, e.token, e.membershipId, 2).andExpect(status().isConflict());

        // con otro ADMIN si puede
        Empleado ana = e.empleado("Ana");
        cambiarRol(e, e.token, ana.membershipId(), 1).andExpect(status().isOk());
        cambiarRol(e, e.token, e.membershipId, 2).andExpect(status().isOk());
    }

    @Test
    void noSeArchivaUnImpuestoQueUsanServiciosActivos() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        mockMvc.perform(delete(e.url("/taxes/" + e.impuestoId)).header("Authorization", bearer(e.token)))
                .andExpect(status().isConflict());

        long sinUso = e.crear("/taxes", Map.of("name", "IVA10", "percentage", 10));
        mockMvc.perform(delete(e.url("/taxes/" + sinUso)).header("Authorization", bearer(e.token)))
                .andExpect(status().isNoContent());
    }

    @Test
    void nombreDeImpuestoConEspaciosCuentaComoRepetido() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        mockMvc.perform(post(e.url("/taxes")).header("Authorization", bearer(e.token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "  IVA21 ", "percentage", 21))))
                .andExpect(status().isConflict());
    }

    private org.springframework.test.web.servlet.ResultActions cambiarRol(Escenario e, String token, long membershipId, int rol) throws Exception {
        return mockMvc.perform(put(e.url("/users/" + membershipId)).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of("roleId", rol, "color", "cyan"))));
    }
}
