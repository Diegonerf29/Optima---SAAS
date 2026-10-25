package com.optima.api.modules.user;

import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

import java.util.Map;

import static com.optima.api.support.TestApi.ADMIN_DEMO;
import static com.optima.api.support.TestApi.DEMO_PASSWORD;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.tokenDeNegocio;
import static com.optima.api.support.TestApi.unico;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de A3: dar de alta un email que ya existe crea una invitacion, no vincula la cuenta */
class InvitationIntegrationTest extends IntegrationTest {

    private static final String CLAVE = "clave-segura-1";

    @Test
    void altaConEmailExistenteCreaInvitacionSinDatosPersonales() throws Exception {
        String emailAjeno = registrarNegocio();
        String admin1 = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);

        mockMvc.perform(post("/api/businesses/1/users")
                        .header("Authorization", bearer(admin1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(altaEmpleado(emailAjeno, "Nombre inventado")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INVITED"))
                .andExpect(jsonPath("$.email").value(emailAjeno))
                // ni el nombre real ni el telefono de la cuenta ajena
                .andExpect(jsonPath("$.fullName").doesNotExist())
                .andExpect(jsonPath("$.phone").doesNotExist())
                .andExpect(jsonPath("$.isActive").value(false));

        // aparece en invitaciones y no en la lista de empleados activos
        JsonNode invitaciones = json(mockMvc.perform(get("/api/businesses/1/users/invitations")
                .header("Authorization", bearer(admin1))).andReturn());
        assertThat(invitaciones.path("content").toString()).contains(emailAjeno);
        JsonNode activos = json(mockMvc.perform(get("/api/businesses/1/users?size=100")
                .header("Authorization", bearer(admin1))).andReturn());
        assertThat(activos.path("content").toString()).doesNotContain(emailAjeno);

        // invitar otra vez da 409
        mockMvc.perform(post("/api/businesses/1/users")
                        .header("Authorization", bearer(admin1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(altaEmpleado(emailAjeno, "Otra vez")))
                .andExpect(status().isConflict());
    }

    @Test
    void laPersonaInvitadaAceptaYPasaATenerDosNegocios() throws Exception {
        String email = registrarNegocio();
        String admin1 = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(post("/api/businesses/1/users")
                .header("Authorization", bearer(admin1))
                .contentType(MediaType.APPLICATION_JSON)
                .content(altaEmpleado(email, "x"))).andExpect(status().isCreated());

        // al iniciar sesion se le avisa de que tiene una invitacion
        JsonNode login = login(email);
        assertThat(login.path("tokenType").asString()).isEqualTo("tenant");
        assertThat(login.path("pendingInvitations").asLong()).isEqualTo(1);
        String token = login.path("token").asString();

        JsonNode mias = json(mockMvc.perform(get("/api/me/invitations")
                .header("Authorization", bearer(token))).andReturn());
        assertThat(mias.size()).isEqualTo(1);
        long membershipId = mias.get(0).path("membershipId").asLong();

        mockMvc.perform(post("/api/me/invitations/" + membershipId + "/accept")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessId").value(1));

        JsonNode despues = login(email);
        assertThat(despues.path("tokenType").asString()).isEqualTo("identity");
        assertThat(despues.path("businesses").size()).isEqualTo(2);
        assertThat(despues.path("pendingInvitations").asLong()).isZero();
    }

    @Test
    void rechazarBorraLaInvitacion() throws Exception {
        String email = registrarNegocio();
        String admin1 = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(post("/api/businesses/1/users")
                .header("Authorization", bearer(admin1))
                .contentType(MediaType.APPLICATION_JSON)
                .content(altaEmpleado(email, "x"))).andExpect(status().isCreated());
        String token = login(email).path("token").asString();
        long membershipId = json(mockMvc.perform(get("/api/me/invitations")
                .header("Authorization", bearer(token))).andReturn()).get(0).path("membershipId").asLong();

        mockMvc.perform(delete("/api/me/invitations/" + membershipId).header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());

        assertThat(login(email).path("pendingInvitations").asLong()).isZero();
    }

    @Test
    void nadieMasPuedeAceptarUnaInvitacionAjena() throws Exception {
        String invitado = registrarNegocio();
        String otro = registrarNegocio();
        String admin1 = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(post("/api/businesses/1/users")
                .header("Authorization", bearer(admin1))
                .contentType(MediaType.APPLICATION_JSON)
                .content(altaEmpleado(invitado, "x"))).andExpect(status().isCreated());
        long membershipId = json(mockMvc.perform(get("/api/me/invitations")
                .header("Authorization", bearer(login(invitado).path("token").asString())))
                .andReturn()).get(0).path("membershipId").asLong();

        String tokenOtro = login(otro).path("token").asString();
        mockMvc.perform(post("/api/me/invitations/" + membershipId + "/accept")
                        .header("Authorization", bearer(tokenOtro)))
                .andExpect(status().isNotFound());
    }

    @Test
    void elAdminPuedeCancelarUnaInvitacion() throws Exception {
        String email = registrarNegocio();
        String admin1 = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        long membershipId = json(mockMvc.perform(post("/api/businesses/1/users")
                .header("Authorization", bearer(admin1))
                .contentType(MediaType.APPLICATION_JSON)
                .content(altaEmpleado(email, "x"))).andReturn()).path("id").asLong();

        mockMvc.perform(delete("/api/businesses/1/users/" + membershipId).header("Authorization", bearer(admin1)))
                .andExpect(status().isNoContent());

        assertThat(login(email).path("pendingInvitations").asLong()).isZero();
    }

    /** registra un negocio nuevo y devuelve el email de su admin (una cuenta que ya existe) */
    private String registrarNegocio() throws Exception {
        String u = unico();
        String email = "persona-" + u + "@ejemplo.com";
        Map<String, Object> body = Map.of(
                "business", Map.of("name", "Negocio " + u, "slug", "negocio-" + u, "email", "n-" + u + "@ejemplo.com"),
                "admin", Map.of("fullName", "Nombre Real " + u, "email", email, "password", CLAVE, "phone", "600000000"));
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(toJson(body)))
                .andExpect(status().isCreated());
        return email;
    }

    private JsonNode login(String email) throws Exception {
        return json(mockMvc.perform(post("/api/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", CLAVE))))
                .andExpect(status().isOk())
                .andReturn());
    }

    private static String altaEmpleado(String email, String nombre) {
        return toJson(Map.of("roleId", 2, "fullName", nombre, "email", email, "password", "otra-clave-9"));
    }
}
