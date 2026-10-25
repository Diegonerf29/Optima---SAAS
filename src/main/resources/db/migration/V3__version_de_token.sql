-- Revocacion de sesiones (hallazgo M5)
-- Cada token lleva la version del usuario. Al cambiar o restablecer la contraseña, o al cerrar
-- sesion en todos los dispositivos, la version sube y los tokens anteriores dejan de valer.
ALTER TABLE users
	ADD COLUMN token_version INT NOT NULL DEFAULT 0;
