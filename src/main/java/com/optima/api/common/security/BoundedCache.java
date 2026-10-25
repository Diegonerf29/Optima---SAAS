package com.optima.api.common.security;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * mapa con tamaño maximo: al llenarse olvida la entrada usada hace mas tiempo
 * sirve para guardar contadores por ip o por email sin agotar la memoria
 * (antes se vaciaba entero y un atacante podia borrar los limites de todos)
 */
public class BoundedCache<K, V> extends LinkedHashMap<K, V> {

    private final int maxEntries;

    public BoundedCache(int maxEntries) {
        // true = orden por ultimo acceso (LRU)
        super(16, 0.75f, true);
        this.maxEntries = maxEntries;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxEntries;
    }
}
