-- Registro de cobros de citas (hallazgo M8)
-- Quien cobro, cuando y como. Al deshacer un cobro (solo ADMIN) se vacian.
ALTER TABLE appointments
	ADD COLUMN paid_at DATETIME NULL,
	ADD COLUMN paid_by_membership_id BIGINT NULL,
	ADD COLUMN payment_method VARCHAR(20) NULL,
	ADD CONSTRAINT fk_appointment_paid_by FOREIGN KEY (paid_by_membership_id) REFERENCES memberships(id_membership),
	ADD CONSTRAINT chk_payment_method CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'CARD', 'BIZUM', 'OTHER'));
