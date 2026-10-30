package com.optima.api.common;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.net.URI;
import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.toJson;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * regresion de A5: escribir la ruta de otra forma no salta el control de negocio
 * en una URL "%62" es la letra "b" y "%61" la "a": Spring MVC lee /api/businesses/{id}/...
 * se usa URI.create para que la ruta llegue tal cual, sin volver a codificarla
 */
class EncodedPathIntegrationTest extends IntegrationTest {

    @Test
    void otroNegocioConLaRutaCodificadaDa403() throws Exception {
        Escenario victima = Escenario.nuevo(mockMvc);
        Escenario atacante = Escenario.nuevo(mockMvc);
        String ruta = "/api/%62usinesses/" + victima.businessId;
        String auth = bearer(atacante.token);

        // leer sus clientes, su equipo y la descarga completa de sus datos
        mockMvc.perform(get(URI.create(ruta + "/clients")).header("Authorization", auth))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(URI.create(ruta + "/users")).header("Authorization", auth))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(URI.create("/%61pi/businesses/" + victima.businessId + "/export")).header("Authorization", auth))
                .andExpect(status().isForbidden());

        // crear datos en el otro negocio
        mockMvc.perform(post(URI.create(ruta + "/clients")).header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("fullName", "Intruso", "phone", "600000009"))))
                .andExpect(status().isForbidden());

        // desactivarlo y borrarlo con la contraseña del atacante
        mockMvc.perform(delete(URI.create(ruta)).header("Authorization", auth))
                .andExpect(status().isForbidden());
        mockMvc.perform(post(URI.create(ruta + "/erase")).header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("password", Escenario.CLAVE))))
                .andExpect(status().isForbidden());

        // el negocio de la victima sigue igual
        victima.leer("").andExpect(status().isOk()).andExpect(jsonPath("$.isActive").value(true));
        victima.leer("/clients").andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void elPropioNegocioConLaRutaCodificadaSigueFuncionando() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);

        mockMvc.perform(get(URI.create("/api/%62usinesses/" + e.businessId + "/clients"))
                        .header("Authorization", bearer(e.token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }
}
