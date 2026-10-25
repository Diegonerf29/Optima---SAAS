package com.optima.api.modules.billing;

import com.optima.api.modules.billing.service.StripeGateway;
import com.optima.api.modules.billing.service.StripeGateway.SubscriptionInfo;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.support.Escenario;
import com.optima.api.support.Escenario.Empleado;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.notNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** suscripciones (fase 9): prueba gratis, bloqueo al acabar, pago con Stripe y avisos firmados */
class BillingIntegrationTest extends IntegrationTest {

    // el mismo secreto que application-test.properties
    private static final String WEBHOOK_SECRET = "whsec_secreto_de_los_tests";

    @MockitoBean
    private StripeGateway stripe;

    @Autowired
    private BusinessRepository businessRepository;

    @Test
    void unNegocioNuevoEmpiezaConCatorceDiasDePrueba() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        JsonNode billing = json(e.leer("/billing").andExpect(status().isOk()).andReturn());

        assertThat(billing.path("enabled").asBoolean()).isTrue();
        assertThat(billing.path("status").asString()).isEqualTo("TRIALING");
        assertThat(billing.path("hasAccess").asBoolean()).isTrue();
        Instant finPrueba = Instant.parse(billing.path("trialEndsAt").asString());
        assertThat(Duration.between(Instant.now(), finPrueba).toDays()).isBetween(13L, 14L);
    }

    @Test
    void alAcabarLaPruebaSoloSePuedeVerElNegocioYPagar() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        Empleado ana = e.empleado("Ana");
        terminarPrueba(e.businessId);

        e.leer("/clients").andExpect(status().isPaymentRequired());
        mockMvc.perform(get(e.url("/clients")).header("Authorization", bearer(ana.token())))
                .andExpect(status().isPaymentRequired());
        // el negocio y el estado de la suscripcion si se ven, tambien el empleado
        mockMvc.perform(get("/api/businesses/" + e.businessId).header("Authorization", bearer(e.token)))
                .andExpect(status().isOk());
        mockMvc.perform(get(e.url("/billing")).header("Authorization", bearer(ana.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasAccess").value(false));
    }

    @Test
    void elAdminPagaConStripeCheckoutYSeRespetaLaPruebaQueQueda() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        when(stripe.createCustomer(any())).thenReturn("cus_" + e.businessId);
        when(stripe.createCheckoutUrl(eq("cus_" + e.businessId), eq(e.businessId), any()))
                .thenReturn("https://checkout.stripe.com/c/pay/prueba");

        pedir(e, "/billing/checkout")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://checkout.stripe.com/c/pay/prueba"));
        // quedan 14 dias de prueba: se pasan a Stripe para que el primer cobro llegue al final
        verify(stripe).createCheckoutUrl(eq("cus_" + e.businessId), eq(e.businessId), notNull());
        e.leer("/billing").andExpect(jsonPath("$.hasPaymentAccount").value(true));

        // la segunda vez se reutiliza el mismo cliente de Stripe
        pedir(e, "/billing/checkout").andExpect(status().isOk());
        verify(stripe, times(1)).createCustomer(any());
    }

    @Test
    void conLaPruebaTerminadaElPagoEmpiezaYa() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        terminarPrueba(e.businessId);
        when(stripe.createCustomer(any())).thenReturn("cus_t" + e.businessId);
        when(stripe.createCheckoutUrl(any(), any(), any())).thenReturn("https://checkout.stripe.com/x");

        pedir(e, "/billing/checkout").andExpect(status().isOk());
        verify(stripe).createCheckoutUrl(eq("cus_t" + e.businessId), eq(e.businessId), isNull());
    }

    @Test
    void unEmpleadoNoPuedePagarNiAbrirElPortal() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        Empleado ana = e.empleado("Ana");
        for (String ruta : new String[]{"/billing/checkout", "/billing/portal"}) {
            mockMvc.perform(post(e.url(ruta)).header("Authorization", bearer(ana.token())))
                    .andExpect(status().isForbidden());
        }
        verify(stripe, never()).createCustomer(any());
    }

    @Test
    void elPortalNecesitaHaberPasadoPorElPago() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        pedir(e, "/billing/portal").andExpect(status().isConflict());

        conCliente(e.businessId, "cus_p" + e.businessId);
        when(stripe.createPortalUrl("cus_p" + e.businessId)).thenReturn("https://billing.stripe.com/p/session/x");
        pedir(e, "/billing/portal").andExpect(jsonPath("$.url").value("https://billing.stripe.com/p/session/x"));
    }

    @Test
    void unAvisoFirmadoDeStripeActivaLaSuscripcionUnaSolaVez() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        String cliente = "cus_w" + e.businessId;
        String suscripcion = "sub_w" + e.businessId;
        conCliente(e.businessId, cliente);
        terminarPrueba(e.businessId);
        Instant finPeriodo = Instant.now().plus(Duration.ofDays(30));
        when(stripe.getSubscription(suscripcion))
                .thenReturn(new SubscriptionInfo(suscripcion, cliente, "active", null, finPeriodo));

        String aviso = aviso("evt_a" + e.businessId, "customer.subscription.updated", suscripcion);
        enviarAviso(aviso, firma(aviso)).andExpect(status().isOk());

        e.leer("/billing")
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.hasAccess").value(true))
                .andExpect(jsonPath("$.hasSubscription").value(true));
        e.leer("/clients").andExpect(status().isOk());

        // Stripe repite el aviso: no se vuelve a procesar
        enviarAviso(aviso, firma(aviso)).andExpect(status().isOk());
        verify(stripe, times(1)).getSubscription(suscripcion);
    }

    @Test
    void alCancelarseLaSuscripcionSeBloquea() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        String cliente = "cus_c" + e.businessId;
        String suscripcion = "sub_c" + e.businessId;
        conCliente(e.businessId, cliente);
        terminarPrueba(e.businessId);
        when(stripe.getSubscription(suscripcion))
                .thenReturn(new SubscriptionInfo(suscripcion, cliente, "canceled", null, null));

        String aviso = aviso("evt_c" + e.businessId, "customer.subscription.deleted", suscripcion);
        enviarAviso(aviso, firma(aviso)).andExpect(status().isOk());

        e.leer("/billing").andExpect(jsonPath("$.status").value("CANCELED"));
        e.leer("/clients").andExpect(status().isPaymentRequired());
    }

    @Test
    void unAvisoSinFirmaValidaSeRechaza() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        String aviso = aviso("evt_f" + e.businessId, "customer.subscription.updated", "sub_falsa");

        enviarAviso(aviso, "t=" + Instant.now().getEpochSecond() + ",v1=" + "0".repeat(64))
                .andExpect(status().isBadRequest());
        // firmado con otro secreto (por ejemplo, alguien que se lo inventa)
        enviarAviso(aviso, firma(aviso, "whsec_otro")).andExpect(status().isBadRequest());
        // sin cabecera de firma
        mockMvc.perform(post("/api/webhooks/stripe").contentType(MediaType.APPLICATION_JSON).content(aviso))
                .andExpect(status().isBadRequest());
        verify(stripe, never()).getSubscription(any());
    }

    // --- ayudas ---

    private ResultActions pedir(Escenario e, String ruta) throws Exception {
        return mockMvc.perform(post(e.url(ruta)).header("Authorization", bearer(e.token)));
    }

    private void terminarPrueba(long businessId) {
        Business b = businessRepository.findById(businessId).orElseThrow();
        b.setTrialEndsAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));
        businessRepository.save(b);
    }

    private void conCliente(long businessId, String customerId) {
        Business b = businessRepository.findById(businessId).orElseThrow();
        b.setStripeCustomerId(customerId);
        businessRepository.save(b);
    }

    private ResultActions enviarAviso(String cuerpo, String firma) throws Exception {
        return mockMvc.perform(post("/api/webhooks/stripe")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", firma)
                .content(cuerpo));
    }

    /** un aviso de Stripe con lo minimo que hace falta */
    private static String aviso(String id, String tipo, String suscripcion) {
        return """
                {"id": "%s", "object": "event", "type": "%s", "created": %d,
                 "data": {"object": {"id": "%s", "object": "subscription"}}}
                """.formatted(id, tipo, Instant.now().getEpochSecond(), suscripcion);
    }

    private static String firma(String cuerpo) throws Exception {
        return firma(cuerpo, WEBHOOK_SECRET);
    }

    /**
     * la misma firma que pone Stripe en la cabecera Stripe-Signature:
     * t=<segundos>,v1=<HMAC-SHA256 de "segundos.cuerpo" con el secreto del webhook>
     */
    private static String firma(String cuerpo, String secreto) throws Exception {
        long t = Instant.now().getEpochSecond();
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hmac = mac.doFinal((t + "." + cuerpo).getBytes(StandardCharsets.UTF_8));
        return "t=" + t + ",v1=" + HexFormat.of().formatHex(hmac);
    }
}
