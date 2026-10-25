-- Zona horaria de cada negocio (hallazgo M14)
-- Las citas se guardan en hora local del negocio; "ahora" y "hoy" se calculan con esta zona
-- y no con la del servidor (que en Docker suele ser UTC).
ALTER TABLE businesses
	ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid';
