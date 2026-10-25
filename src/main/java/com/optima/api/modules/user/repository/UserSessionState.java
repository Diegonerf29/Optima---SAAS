package com.optima.api.modules.user.repository;

/** lo minimo que hace falta de un usuario para validar su token en cada peticion */
public record UserSessionState(Integer tokenVersion, Boolean isActive) {
}
