package com.optima.api.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * regla comun para contrasenas nuevas
 * minimo 8 caracteres, maximo 72 bytes y al menos una letra y un numero
 */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordValidator.class)
public @interface Password {

    String message() default "La contraseña debe tener al menos 8 caracteres, con letras y números, y como máximo 72 bytes";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
