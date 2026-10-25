package com.optima.api.support;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * atajos para los tests de integracion: iniciar sesion y leer JSON
 * los usuarios de demo vienen de docs/schema_v20.sql (contraseña 12345678)
 */
public final class TestApi {

    public static final String DEMO_PASSWORD = "12345678";
    /** admin del negocio 1 y empleado del negocio 2 */
    public static final String ADMIN_DEMO = "admin@optima.com";
    /** empleado del negocio 1 */
    public static final String EMPLEADO_DEMO = "empleado@optima.com";

    private static final JsonMapper JSON = new JsonMapper();

    private TestApi() {
    }

    /** inicia sesion y, si hace falta, elige el negocio indicado; devuelve el token de negocio */
    public static String tokenDeNegocio(MockMvc mvc, String email, String password, long businessId) throws Exception {
        JsonNode login = json(mvc.perform(post("/api/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andReturn());
        String token = login.path("token").asString();
        if ("tenant".equals(login.path("tokenType").asString())) {
            return token;
        }
        return json(mvc.perform(post("/api/auth/select-business/" + businessId)
                        .header("Authorization", "Bearer " + token))
                .andReturn()).path("token").asString();
    }

    public static JsonNode json(MvcResult result) throws Exception {
        return JSON.readTree(result.getResponse().getContentAsString());
    }

    public static String toJson(Object value) {
        return JSON.writeValueAsString(value);
    }

    /** texto unico para emails y slugs, asi los tests no chocan entre si */
    public static String unico() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    public static String bearer(String token) {
        return "Bearer " + token;
    }
}
