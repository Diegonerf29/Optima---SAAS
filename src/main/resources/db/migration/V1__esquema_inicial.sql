-- Esquema inicial de Optima (equivale a docs/schema_v20.sql sin datos de demo)
-- Base de datos multi-tenant para gestion de citas.
-- Flyway aplica este fichero una sola vez. Los cambios posteriores van en V2, V3...
-- Nunca se edita una migracion ya aplicada: se crea otra nueva.

-- Negocio del sistema, unidad de separacion de datos (tenant)
CREATE TABLE businesses (
id_business BIGINT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	slug VARCHAR(150) NOT NULL UNIQUE,
	email VARCHAR(150)  NOT NULL UNIQUE,
	phone VARCHAR(20),
	address VARCHAR(255),
	city VARCHAR(100),
	state VARCHAR(100),
	country VARCHAR(100),
	postal_code VARCHAR(20),
	latitude DECIMAL(10, 8),
	longitude DECIMAL(11, 8),
	appointment_interval INT NOT NULL DEFAULT 30,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL,
	CONSTRAINT chk_appointment_interval CHECK (appointment_interval IN (15, 30, 45, 60))
) ENGINE=InnoDB;

-- Catalogo fijo de roles del sistema
CREATE TABLE roles (
	id_role BIGINT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- los ids son fijos: el codigo busca los roles por nombre, pero asi todas las bases de datos coinciden
INSERT INTO roles (id_role, name) VALUES (1, 'ADMIN'), (2, 'EMPLOYEE');

-- Usuarios del sistema con credenciales de acceso
CREATE TABLE users (
	id_user BIGINT AUTO_INCREMENT PRIMARY KEY,
	full_name VARCHAR(150) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	phone VARCHAR(20),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL
) ENGINE=InnoDB;



-- Relacion entre usuario, negocio y rol (una persona puede estar en varios negocios)
CREATE TABLE memberships (
	id_membership BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_user BIGINT NOT NULL,
	id_business BIGINT NOT NULL,
	id_role BIGINT NOT NULL,
	is_active BOOLEAN  NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	color VARCHAR(20) NULL,
	CONSTRAINT fk_membership_user FOREIGN KEY (id_user) REFERENCES users(id_user),
	CONSTRAINT fk_membership_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT fk_membership_role FOREIGN KEY (id_role) REFERENCES roles(id_role),
	CONSTRAINT uq_membership_user_business UNIQUE (id_user, id_business)
) ENGINE=InnoDB;


-- Tramos del horario semanal de cada empleado
CREATE TABLE employee_schedules (
	id_schedule BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_membership BIGINT NOT NULL,
	day_of_week INT NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	CONSTRAINT fk_schedule_membership FOREIGN KEY (id_membership) REFERENCES memberships(id_membership),
	CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
	CONSTRAINT chk_schedule_times CHECK (start_time < end_time)
) ENGINE=InnoDB;


-- Impuestos configurados por cada negocio
CREATE TABLE taxes (
	id_tax BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	name VARCHAR(50) NOT NULL,
	percentage DECIMAL(5,2) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL,
	CONSTRAINT fk_tax_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT uq_tax_business_name UNIQUE (id_business, name),
	CONSTRAINT chk_tax_percentage CHECK (percentage >= 0 AND percentage <= 100)
) ENGINE=InnoDB;


-- Clientes registrados dentro de un negocio
CREATE TABLE clients (
	id_client BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	full_name VARCHAR(150) NOT NULL,
	email VARCHAR(150),
	phone VARCHAR(20),
	notes TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL,
	CONSTRAINT fk_client_business FOREIGN KEY (id_business) REFERENCES businesses(id_business)
) ENGINE=InnoDB;


-- Categorias para agrupar los servicios del catalogo
CREATE TABLE service_categories (
	id_category BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	name VARCHAR(100) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL,
	CONSTRAINT fk_category_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT uq_category_business_name UNIQUE (id_business, name)
) ENGINE=InnoDB;


-- Servicios ofrecidos por el negocio con precio y duracion
CREATE TABLE services (
	id_service BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	id_category BIGINT NOT NULL,
	id_tax BIGINT NOT NULL,
	name VARCHAR(150) NOT NULL,
	description TEXT,
	price DECIMAL(10,2) NOT NULL,
	duration_minutes INT NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	deactivated_at DATETIME NULL,
	CONSTRAINT fk_service_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT fk_service_category FOREIGN KEY (id_category) REFERENCES service_categories(id_category),
	CONSTRAINT fk_service_tax FOREIGN KEY (id_tax) REFERENCES taxes(id_tax),
	CONSTRAINT uq_service_business_name UNIQUE (id_business, name),
	CONSTRAINT chk_service_price CHECK (price >= 0),
	CONSTRAINT chk_service_duration CHECK (duration_minutes > 0)
) ENGINE=InnoDB;


-- Cabinas o espacios fisicos donde se realizan los servicios
CREATE TABLE booths (
	id_booth BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	name VARCHAR(80) NOT NULL,
	color VARCHAR(20) NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	deactivated_at DATETIME NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_booth_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT uq_booth_business_name UNIQUE (id_business, name)
) ENGINE=InnoDB;


-- Catalogo fijo de estados de una cita
CREATE TABLE appointment_statuses (
	id_status BIGINT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- IMPORTANTE: los ids 1, 2 y 3 (PENDING, CONFIRMED, IN_PROGRESS) son los estados "activos".
-- Las columnas generadas de appointments (active_slot_key) dependen de estos ids: no cambiarlos.
INSERT INTO appointment_statuses (id_status, name) VALUES
	(1, 'PENDING'), (2, 'CONFIRMED'), (3, 'IN_PROGRESS'),
	(4, 'COMPLETED'), (5, 'CANCELLED'), (6, 'NO_SHOW');


-- Citas del negocio con columnas virtuales para evitar doble reserva
CREATE TABLE appointments (
	id_appointment BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	id_client BIGINT NOT NULL,
	id_membership BIGINT NOT NULL,
	id_booth BIGINT NULL,
	id_status BIGINT NOT NULL,
	is_paid BOOLEAN NOT NULL DEFAULT FALSE,
	start_datetime DATETIME NOT NULL,
	end_datetime DATETIME NOT NULL,
	notes TEXT,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NULL,

	active_slot_key VARCHAR(50) GENERATED ALWAYS AS (
		CASE WHEN id_status IN (1, 2, 3)
			THEN CONCAT(id_membership, '_', start_datetime)
			ELSE NULL END
		) VIRTUAL,
	active_booth_slot_key VARCHAR(50) GENERATED ALWAYS AS (
		CASE WHEN id_booth IS NOT NULL AND id_status IN (1, 2, 3)
			THEN CONCAT(id_booth, '_', start_datetime)
			ELSE NULL END
		) VIRTUAL,
	CONSTRAINT fk_appointment_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT fk_appointment_client FOREIGN KEY (id_client) REFERENCES clients(id_client),
	CONSTRAINT fk_appointment_membership FOREIGN KEY (id_membership) REFERENCES memberships(id_membership),
	CONSTRAINT fk_appointment_booth FOREIGN KEY (id_booth) REFERENCES booths(id_booth),
	CONSTRAINT fk_appointment_status FOREIGN KEY (id_status) REFERENCES appointment_statuses(id_status),
	CONSTRAINT chk_appointment_times CHECK (start_datetime < end_datetime),
	CONSTRAINT uq_appointment_active_slot UNIQUE (active_slot_key),
	CONSTRAINT uq_appointment_active_booth_slot UNIQUE (active_booth_slot_key)
) ENGINE=InnoDB;


-- Servicios contratados en cada cita con precio e impuesto aplicados
CREATE TABLE appointment_services (
	id_appointment_service BIGINT        AUTO_INCREMENT PRIMARY KEY,
	id_appointment         BIGINT        NOT NULL,
	id_service             BIGINT        NOT NULL,
	applied_price          DECIMAL(10,2) NOT NULL,
	applied_tax_percentage DECIMAL(5,2)  NOT NULL,
	CONSTRAINT fk_appsvc_appointment FOREIGN KEY (id_appointment) REFERENCES appointments(id_appointment) ON DELETE CASCADE,
	CONSTRAINT fk_appsvc_service FOREIGN KEY (id_service) REFERENCES services(id_service),
	CONSTRAINT chk_appsvc_applied_price CHECK (applied_price >= 0),
	CONSTRAINT chk_appsvc_applied_tax CHECK (applied_tax_percentage >= 0 AND applied_tax_percentage <= 100)
) ENGINE=InnoDB;


-- Horario de apertura del negocio por dia de la semana
CREATE TABLE business_hours (
	id_business_hour BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	day_of_week INT NOT NULL,
	start_time TIME NULL,
	end_time TIME NULL,
	is_closed BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT fk_business_hours_business FOREIGN KEY (id_business) REFERENCES businesses(id_business) ON DELETE CASCADE,
	CONSTRAINT chk_bh_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
	CONSTRAINT chk_bh_times_logic CHECK ( is_closed = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
) ENGINE=InnoDB;


-- Ausencias puntuales de empleados con rango de fecha y hora
CREATE TABLE employee_absences (
	id_absence BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_membership BIGINT NOT NULL,
	start_datetime DATETIME NOT NULL,
	end_datetime DATETIME NOT NULL,
	reason VARCHAR(255) NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_absence_membership FOREIGN KEY (id_membership) REFERENCES memberships(id_membership) ON DELETE CASCADE,
	CONSTRAINT chk_absence_times CHECK (start_datetime < end_datetime)
) ENGINE=InnoDB;


-- Bloqueos de agenda por dias completos (global, por empleado o por cabina)
CREATE TABLE schedule_blocks (
	id_block BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_business BIGINT NOT NULL,
	id_membership BIGINT NULL,
	id_booth BIGINT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL,
	reason VARCHAR(255) NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_block_business FOREIGN KEY (id_business) REFERENCES businesses(id_business),
	CONSTRAINT fk_block_membership
	FOREIGN KEY (id_membership) REFERENCES memberships(id_membership),
	CONSTRAINT fk_block_booth FOREIGN KEY (id_booth) REFERENCES booths(id_booth),
	CONSTRAINT chk_block_dates CHECK (start_date <= end_date),
	CONSTRAINT chk_block_target CHECK (id_membership IS NULL OR id_booth IS NULL)
) ENGINE=InnoDB;


-- Codigos temporales para recuperacion de contrasena
CREATE TABLE password_resets (
	id_reset BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_user BIGINT NOT NULL,
	token_hash VARCHAR(255) NOT NULL UNIQUE,
	expires_at DATETIME NOT NULL,
	used_at DATETIME NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_reset_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE
) ENGINE=InnoDB;



-- Indices para acelerar las consultas mas frecuentes
CREATE INDEX idx_appt_membership_start ON appointments (id_membership, start_datetime);

CREATE INDEX idx_appt_business_start ON appointments (id_business, start_datetime);

CREATE INDEX idx_appt_booth_start ON appointments (id_booth, start_datetime);

CREATE INDEX idx_schedule_membership_day ON employee_schedules (id_membership, day_of_week);
