package com.optima.api.modules.privacy;

import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.client.repository.ClientRepository;
import com.optima.api.support.Escenario;
import com.optima.api.support.Escenario.Empleado;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static com.optima.api.support.Escenario.CLAVE;
import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RGPD (paso 10.2): descargar y borrar los datos de un cliente y de un negocio */
class PrivacyIntegrationTest extends IntegrationTest {

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Test
    void seDescarganLaFichaYLasCitasDeUnCliente() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        crearCitaConNotas(e, "10:00", "Alergia al tinte");

        e.leer("/clients/" + e.clienteId + "/export")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.client.fullName").value("Cliente de prueba"))
                .andExpect(jsonPath("$.appointments.length()").value(1))
                .andExpect(jsonPath("$.appointments[0].notes").value("Alergia al tinte"));
    }

    @Test
    void borrarUnClienteQuitaSusDatosPeroConservaLasCitas() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        long cita = crearCitaConNotas(e, "10:00", "Alergia al tinte");

        // con una cita pendiente no se puede
        pedir(e, post(e.url("/clients/" + e.clienteId + "/anonymize"))).andExpect(status().isConflict());

        e.cambiarEstado(cita, "CANCELLED").andExpect(status().isOk());
        pedir(e, post(e.url("/clients/" + e.clienteId + "/anonymize")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Cliente borrado"))
                .andExpect(jsonPath("$.phone").isEmpty())
                .andExpect(jsonPath("$.isActive").value(false));

        // la cita sigue (cuenta para la caja y las estadisticas) pero sin datos personales
        e.leer("/appointments/" + cita)
                .andExpect(jsonPath("$.clientName").value("Cliente borrado"))
                .andExpect(jsonPath("$.notes").isEmpty());
    }

    @Test
    void unEmpleadoNoPuedeDescargarNiBorrarDatos() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        Empleado ana = e.empleado("Ana");
        for (var peticion : new org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder[]{
                get(e.url("/clients/" + e.clienteId + "/export")),
                post(e.url("/clients/" + e.clienteId + "/anonymize")),
                get(e.url("/export"))}) {
            mockMvc.perform(peticion.header("Authorization", bearer(ana.token()))).andExpect(status().isForbidden());
        }
    }

    @Test
    void seDescarganTodosLosDatosDelNegocio() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        crearCitaConNotas(e, "10:00", "Primera visita");

        JsonNode datos = json(e.leer("/export").andExpect(status().isOk()).andReturn());
        assertThat(datos.path("business").path("id").asLong()).isEqualTo(e.businessId);
        assertThat(datos.path("team")).hasSize(1);
        assertThat(datos.path("clients")).hasSize(1);
        assertThat(datos.path("appointments")).hasSize(1);
        assertThat(datos.path("services")).hasSize(3);
        // el IVA y la categoria que trae el registro, mas los del escenario
        assertThat(datos.path("taxes")).hasSize(2);
        assertThat(datos.path("hours")).hasSize(13);
    }

    @Test
    void borrarElNegocioExigeDesactivarloYLaContrasena() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        crearCitaConNotas(e, "10:00", "Primera visita");

        // activo no se puede
        borrar(e, CLAVE).andExpect(status().isConflict());

        pedir(e, delete("/api/businesses/" + e.businessId)).andExpect(status().isNoContent());
        // desactivado se pueden descargar los datos
        e.leer("/export").andExpect(status().isOk());
        // con otra contraseña no
        borrar(e, "otra-clave-1").andExpect(status().isBadRequest());

        borrar(e, CLAVE).andExpect(status().isNoContent());
        assertThat(businessRepository.existsById(e.businessId)).isFalse();
        assertThat(clientRepository.findAllByBusinessIdOrderById(e.businessId)).isEmpty();
        // el token del negocio ya no sirve
        pedir(e, get("/api/businesses/" + e.businessId)).andExpect(status().isUnauthorized());
        // los demas negocios no se tocan
        assertThat(clientRepository.findAllByBusinessIdOrderById(1L)).isNotEmpty();
    }

    @Test
    void conLaSuscripcionEnMarchaNoSeBorra() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        Business b = businessRepository.findById(e.businessId).orElseThrow();
        b.setStripeSubscriptionId("sub_" + e.businessId);
        b.setSubscriptionStatus("ACTIVE");
        b.setIsActive(false);
        businessRepository.save(b);

        borrar(e, CLAVE).andExpect(status().isConflict());
    }

    @Test
    void sinPagarSePuedenDescargarLosDatos() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        Business b = businessRepository.findById(e.businessId).orElseThrow();
        b.setTrialEndsAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));
        businessRepository.save(b);

        e.leer("/clients").andExpect(status().isPaymentRequired());
        e.leer("/export").andExpect(status().isOk());
    }

    // --- ayudas ---

    private long crearCitaConNotas(Escenario e, String hora, String notas) throws Exception {
        Map<String, Object> cita = e.cita(en(LUNES, hora), null, e.servicio30);
        cita.put("notes", notas);
        return json(e.crearCita(cita).andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    private ResultActions pedir(Escenario e,
                                org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder peticion) throws Exception {
        return mockMvc.perform(peticion.header("Authorization", bearer(e.token)));
    }

    private ResultActions borrar(Escenario e, String clave) throws Exception {
        return mockMvc.perform(post(e.url("/erase")).header("Authorization", bearer(e.token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of("password", clave))));
    }
}
