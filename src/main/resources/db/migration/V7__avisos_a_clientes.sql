-- Avisos por email a los clientes (P6)
-- Cada negocio decide si se envian; el recordatorio se marca para no repetirlo.
ALTER TABLE businesses
	ADD COLUMN send_client_emails BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE appointments
	ADD COLUMN reminder_sent_at DATETIME NULL;

-- el recordatorio busca citas activas sin recordatorio por fecha de inicio
CREATE INDEX idx_appt_reminder ON appointments (reminder_sent_at, start_datetime);
