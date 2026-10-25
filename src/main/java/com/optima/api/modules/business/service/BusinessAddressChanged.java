package com.optima.api.modules.business.service;

/** la direccion de un negocio es nueva o ha cambiado: hay que calcular sus coordenadas */
public record BusinessAddressChanged(Long businessId) {
}
