package com.optima.api.modules.appointment.notification;

import com.optima.api.common.mail.MailService;
import com.optima.api.modules.appointment.model.Appointment;
import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.appointment.repository.BookedServiceRepository;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.service.BusinessClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * emails a los clientes del negocio (P6): confirmacion, cambio de hora, cancelacion y recordatorio
 * solo si el negocio los tiene activados y el cliente tiene email
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClientNotifier {

    /** el recordatorio se envia entre 24 h y 2 h antes de la cita */
    private static final Duration REMINDER_FROM = Duration.ofHours(24);
    private static final Duration REMINDER_UNTIL = Duration.ofHours(2);

    private static final DateTimeFormatter FECHA =
            DateTimeFormatter.ofPattern("EEEE d 'de' MMMM 'a las' HH:mm", Locale.of("es", "ES"));

    private final AppointmentRepository appointmentRepository;
    private final BookedServiceRepository bookedServiceRepository;
    private final MailService mailService;
    private final BusinessClock businessClock;
    private final Clock clock;

    /** se ejecuta cuando la cita ya esta guardada: si la transaccion falla no se envia nada */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onAppointmentEvent(AppointmentEvent event) {
        appointmentRepository.findWithDetailsById(event.appointmentId())
                .filter(this::shouldEmail)
                .ifPresent(a -> {
                    Business b = a.getBusiness();
                    String fecha = FECHA.format(a.getStartDateTime());
                    switch (event.type()) {
                        case CREATED -> send(a, "Cita confirmada en " + b.getName(),
                                "Tu cita en " + b.getName() + " queda reservada para el " + fecha + ".\n\n" + details(a));
                        case RESCHEDULED -> send(a, "Tu cita en " + b.getName() + " ha cambiado",
                                "Tu cita en " + b.getName() + " ha cambiado. Ahora es el " + fecha + ".\n\n" + details(a));
                        case CANCELLED -> send(a, "Cita cancelada en " + b.getName(),
                                "Tu cita en " + b.getName() + " del " + fecha + " ha sido cancelada.\n");
                    }
                });
    }

    /** cada 15 minutos envia los recordatorios de las citas de las proximas 24 horas */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void sendReminders() {
        // ventana amplia en hora del servidor; cada negocio se filtra despues con su propia zona horaria
        LocalDateTime serverNow = LocalDateTime.now(clock);
        List<Appointment> candidates = appointmentRepository.findPendingReminders(
                serverNow.minusHours(15), serverNow.plusHours(39));
        for (Appointment a : candidates) {
            LocalDateTime now = businessClock.now(a.getBusiness());
            Duration until = Duration.between(now, a.getStartDateTime());
            if (until.compareTo(REMINDER_FROM) > 0 || until.compareTo(REMINDER_UNTIL) < 0) {
                continue;
            }
            send(a, "Recordatorio: tu cita en " + a.getBusiness().getName(),
                    "Te recordamos tu cita en " + a.getBusiness().getName() + " el "
                            + FECHA.format(a.getStartDateTime()) + ".\n\n" + details(a));
            a.setReminderSentAt(now);
        }
    }

    private boolean shouldEmail(Appointment a) {
        return Boolean.TRUE.equals(a.getBusiness().getSendClientEmails())
                && a.getClient().getEmail() != null && !a.getClient().getEmail().isBlank();
    }

    private void send(Appointment a, String subject, String text) {
        Business b = a.getBusiness();
        String body = "Hola " + a.getClient().getFullName() + ",\n\n" + text
                + (b.getPhone() != null ? "\nSi no puedes venir, avísanos en el " + b.getPhone() + " o responde a este correo.\n" : "\nSi no puedes venir, responde a este correo.\n")
                + "\n" + b.getName();
        mailService.sendSimpleEmail(a.getClient().getEmail(), subject, body, b.getEmail());
    }

    /** servicios, profesional y direccion */
    private String details(Appointment a) {
        String servicios = bookedServiceRepository.findAllByAppointmentId(a.getId()).stream()
                .map(bs -> bs.getService().getName())
                .collect(Collectors.joining(", "));
        Business b = a.getBusiness();
        StringBuilder sb = new StringBuilder();
        sb.append("Servicios: ").append(servicios).append('\n');
        sb.append("Te atiende: ").append(a.getMembership().getUser().getFullName()).append('\n');
        if (b.getAddress() != null && !b.getAddress().isBlank()) {
            sb.append("Dirección: ").append(b.getAddress());
            if (b.getCity() != null) {
                sb.append(", ").append(b.getCity());
            }
            sb.append('\n');
        }
        return sb.toString();
    }
}
