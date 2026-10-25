package com.optima.api.support;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * negocio nuevo y ya configurado para un test, aislado de los demas tests:
 * horario partido de lunes a sabado (10-14 y 16-20), domingo cerrado,
 * el admin trabaja ese mismo horario, servicios de 30, 45 y 60 minutos,
 * un cliente y una cabina
 */
public final class Escenario {

    /** lunes 7 de enero de 2030: fecha lejana para que siempre sea futura */
    public static final LocalDate LUNES = LocalDate.of(2030, 1, 7);
    public static final String CLAVE = "clave-segura-1";

    private final MockMvc mvc;
    public final String token;
    public final String adminEmail;
    public final long businessId;
    public final long membershipId;
    public long clienteId;
    public long cabinaId;
    public long servicio30;
    public long servicio45;
    public long servicio60;

    private Escenario(MockMvc mvc, String token, String adminEmail, long businessId, long membershipId) {
        this.mvc = mvc;
        this.token = token;
        this.adminEmail = adminEmail;
        this.businessId = businessId;
        this.membershipId = membershipId;
    }

    public static Escenario nuevo(MockMvc mvc) throws Exception {
        return nuevo(mvc, 30);
    }

    public static Escenario nuevo(MockMvc mvc, int intervalo) throws Exception {
        String u = unico();
        String email = "admin-" + u + "@ejemplo.com";
        Map<String, Object> negocio = new HashMap<>(Map.of(
                "name", "Salon " + u, "slug", "salon-" + u, "email", "salon-" + u + "@ejemplo.com",
                "appointmentInterval", intervalo));
        String token = json(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(toJson(Map.of("business", negocio,
                        "admin", Map.of("fullName", "Admin " + u, "email", email, "password", CLAVE)))))
                .andReturn()).path("token").asString();
        JsonNode mio = json(mvc.perform(get("/api/me/businesses").header("Authorization", bearer(token))).andReturn()).get(0);

        Escenario e = new Escenario(mvc, token, email, mio.path("businessId").asLong(), mio.path("membershipId").asLong());
        e.configurar();
        return e;
    }

    private void configurar() throws Exception {
        for (int dia = 1; dia <= 6; dia++) {
            crear("/hours", Map.of("dayOfWeek", dia, "startTime", "10:00", "endTime", "14:00", "isClosed", false));
            crear("/hours", Map.of("dayOfWeek", dia, "startTime", "16:00", "endTime", "20:00", "isClosed", false));
            crear("/users/" + membershipId + "/schedules", Map.of("dayOfWeek", dia, "startTime", "10:00", "endTime", "14:00"));
            crear("/users/" + membershipId + "/schedules", Map.of("dayOfWeek", dia, "startTime", "16:00", "endTime", "20:00"));
        }
        crear("/hours", Map.of("dayOfWeek", 7, "isClosed", true));
        long impuesto = crear("/taxes", Map.of("name", "IVA21", "percentage", 21));
        long categoria = crear("/categories", Map.of("name", "Cortes"));
        servicio30 = crear("/services", servicio(categoria, impuesto, "Corte", "15.00", 30));
        servicio45 = crear("/services", servicio(categoria, impuesto, "Color", "25.50", 45));
        servicio60 = crear("/services", servicio(categoria, impuesto, "Peinado", "40.00", 60));
        clienteId = crear("/clients", Map.of("fullName", "Cliente de prueba", "phone", "600000001"));
        cabinaId = crear("/booths", Map.of("name", "Cabina 1"));
    }

    private static Map<String, Object> servicio(long categoria, long impuesto, String nombre, String precio, int minutos) {
        return Map.of("categoryId", categoria, "taxId", impuesto, "name", nombre,
                "price", precio, "durationMinutes", minutos);
    }

    /** crea un recurso del negocio y devuelve su id (falla si no responde 201) */
    public long crear(String ruta, Object cuerpo) throws Exception {
        MvcResult r = mvc.perform(post(url(ruta)).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(cuerpo))).andReturn();
        if (r.getResponse().getStatus() != 201) {
            throw new AssertionError("POST " + ruta + " -> " + r.getResponse().getStatus() + " " + r.getResponse().getContentAsString());
        }
        return json(r).path("id").asLong();
    }

    /** cuerpo de una cita del admin con el cliente del escenario */
    public Map<String, Object> cita(String inicio, Long cabina, long... servicios) {
        Map<String, Object> c = new HashMap<>();
        c.put("clientId", clienteId);
        c.put("membershipId", membershipId);
        c.put("startDateTime", inicio);
        c.put("serviceIds", servicios);
        if (cabina != null) {
            c.put("boothId", cabina);
        }
        return c;
    }

    public ResultActions crearCita(Map<String, Object> cita) throws Exception {
        return mvc.perform(post(url("/appointments")).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(cita)));
    }

    public ResultActions editarCita(long id, Map<String, Object> cita) throws Exception {
        return mvc.perform(put(url("/appointments/" + id)).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(cita)));
    }

    public ResultActions cambiarEstado(long id, String estado) throws Exception {
        return mvc.perform(patch(url("/appointments/" + id + "/status")).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of("statusName", estado))));
    }

    public ResultActions marcarPago(long id, boolean pagada) throws Exception {
        return mvc.perform(patch(url("/appointments/" + id + "/payment")).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of("isPaid", pagada))));
    }

    /** GET a una ruta del negocio con el token del admin */
    public ResultActions leer(String ruta) throws Exception {
        return mvc.perform(get(url(ruta)).header("Authorization", bearer(token)));
    }

    public String url(String ruta) {
        return "/api/businesses/" + businessId + ruta;
    }

    /** fecha y hora en formato de la API, por ejemplo en("2030-01-07", "10:00") */
    public static String en(LocalDate dia, String hora) {
        return dia + "T" + hora + ":00";
    }
}
