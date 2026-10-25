package com.optima.api.common.exception;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;

/**
 * escribe un error en formato comun desde los filtros
 * los filtros van antes de los controladores y no pasan por GlobalExceptionHandler
 */
@Component
@RequiredArgsConstructor
public class ErrorWriter {

    private final ObjectMapper objectMapper;

    /** escribe el error con su codigo y mensaje */
    public void write(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ErrorResponse body = new ErrorResponse(status.value(), status.getReasonPhrase(), message, Instant.now().toString());
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
