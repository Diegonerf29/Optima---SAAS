-- Verificacion del email (P4)
-- email_verified_at vacio = email sin confirmar. Las cuentas que ya existian se dan por verificadas.
ALTER TABLE users
	ADD COLUMN email_verified_at DATETIME NULL;

UPDATE users SET email_verified_at = created_at;

-- Codigos de un solo uso enviados por correo para confirmar el email (se guarda solo su huella)
CREATE TABLE email_verifications (
	id_verification BIGINT AUTO_INCREMENT PRIMARY KEY,
	id_user BIGINT NOT NULL,
	token_hash VARCHAR(255) NOT NULL UNIQUE,
	email VARCHAR(150) NOT NULL,
	expires_at DATETIME NOT NULL,
	used_at DATETIME NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_verification_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE
) ENGINE=InnoDB;
