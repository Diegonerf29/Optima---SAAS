package com.optima.api.modules.client;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** regresion de B20: % y _ se buscan como texto, no como comodines */
class ClientSearchIntegrationTest extends IntegrationTest {

    @Test
    void porcentajeYGuionBajoSeBuscanLiteralmente() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        e.crear("/clients", Map.of("fullName", "Tienda 100% natural"));
        e.crear("/clients", Map.of("fullName", "Ana_Lopez"));
        e.crear("/clients", Map.of("fullName", "AnaXLopez"));
        e.crear("/clients", Map.of("fullName", "Exclamacion!"));

        assertThat(buscar(e, "%")).containsExactly("Tienda 100% natural");
        assertThat(buscar(e, "Ana_")).containsExactly("Ana_Lopez");
        assertThat(buscar(e, "!")).containsExactly("Exclamacion!");
        assertThat(buscar(e, "lopez")).containsExactlyInAnyOrder("Ana_Lopez", "AnaXLopez");
    }

    private List<String> buscar(Escenario e, String texto) throws Exception {
        JsonNode page = json(mockMvc.perform(get(e.url("/clients")).param("search", texto)
                .header("Authorization", bearer(e.token))).andReturn());
        List<String> nombres = new ArrayList<>();
        page.path("content").forEach(c -> nombres.add(c.path("fullName").asString()));
        return nombres;
    }
}
