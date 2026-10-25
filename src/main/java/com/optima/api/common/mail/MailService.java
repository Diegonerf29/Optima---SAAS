package com.optima.api.common.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * envia correos simples
 * si falla no rompe la operacion principal
 * el envio va en segundo plano: no hace esperar a quien hace la peticion
 * ni ocupa una conexion de base de datos mientras se habla con el servidor de correo
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    // el remitente sale de la configuracion
    @Value("${app.mail.from}")
    private String from;

    /** envia un correo con asunto y texto, en otro hilo */
    @Async
    public void sendSimpleEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            // se anota el fallo en el log para poder diagnosticarlo
            // no se registra el destinatario: es un dato personal (B19)
            log.warn("No se pudo enviar el correo '{}': {}", subject, ex.getMessage());
        }
    }
}
