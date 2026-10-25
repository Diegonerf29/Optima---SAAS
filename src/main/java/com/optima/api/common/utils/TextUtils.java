package com.optima.api.common.utils;

/** utilidades pequeñas para textos que llegan en las peticiones */
public final class TextUtils {

    private TextUtils() {
    }

    /** quita espacios y convierte el texto vacio en null, para no guardar campos opcionales vacios */
    public static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
