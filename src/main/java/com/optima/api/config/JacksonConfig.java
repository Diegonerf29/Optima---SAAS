package com.optima.api.config;

import com.optima.api.common.json.StrictLocalDateTimeDeserializer;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.module.SimpleModule;

import java.time.LocalDateTime;

/** Ajusta las fechas del servicio */
@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer strictLocalDateTimeCustomizer() {
        // registra el deserializador de fechas sin zona
        SimpleModule module = new SimpleModule("fechas-sin-zona");
        module.addDeserializer(LocalDateTime.class, new StrictLocalDateTimeDeserializer());
        return builder -> builder.addModule(module);
    }
}
