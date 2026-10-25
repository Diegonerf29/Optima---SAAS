package com.optima.api.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * recurso que no existe (404) con un mensaje comun
 * ejemplo: new NotFoundException("el cliente", 5) -> "No se encontró el cliente con ID: 5"
 */
public class NotFoundException extends ResponseStatusException {

    public NotFoundException(String what, Long id) {
        super(HttpStatus.NOT_FOUND, "No se encontró " + what + " con ID: " + id);
    }
}
