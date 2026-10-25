package com.optima.api.common;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.optima.api.support.TestApi.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de B17: los listados paginados tienen un orden fijo por defecto */
class PaginationIntegrationTest extends IntegrationTest {

    @Test
    void clientesOrdenadosPorNombreYPaginasSinRepetidos() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        for (String nombre : List.of("Zoe", "Ana", "Marta", "Bea", "Luis")) {
            e.crear("/clients", Map.of("fullName", nombre));
        }
        List<String> todos = new ArrayList<>();
        for (int pagina = 0; pagina < 3; pagina++) {
            JsonNode page = json(e.leer("/clients?size=2&page=" + pagina).andExpect(status().isOk()).andReturn());
            page.path("content").forEach(c -> todos.add(c.path("fullName").asString()));
        }
        assertThat(todos).containsExactly("Ana", "Bea", "Cliente de prueba", "Luis", "Marta", "Zoe");
    }

    @Test
    void losDemasListadosAdmitenSuOrdenPorDefecto() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        for (String ruta : List.of("/users", "/users/invitations", "/booths", "/taxes", "/categories",
                "/services", "/schedule-blocks", "/appointments", "/users/" + e.membershipId + "/absences")) {
            e.leer(ruta).andExpect(status().isOk());
        }
    }
}
