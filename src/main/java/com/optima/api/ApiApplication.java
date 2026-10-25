package com.optima.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * clase principal del servidor
 * EnableAsync: los correos se envian en segundo plano
 * EnableScheduling: tareas nocturnas de limpieza
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class ApiApplication {

	/**
	 * arranca la aplicacion del servidor
	 */
	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}

}
