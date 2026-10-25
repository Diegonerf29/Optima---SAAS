-- Suscripcion de cada negocio a Optima con Stripe (fase 9)
-- Las fechas de la suscripcion van en UTC (las de Stripe llegan asi).
ALTER TABLE businesses
	ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'TRIALING',
	ADD COLUMN trial_ends_at DATETIME NULL,
	ADD COLUMN current_period_end DATETIME NULL,
	ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
	ADD COLUMN stripe_subscription_id VARCHAR(255) NULL,
	ADD CONSTRAINT uq_business_stripe_customer UNIQUE (stripe_customer_id);

-- los negocios que ya existian empiezan ahora sus 14 dias de prueba
UPDATE businesses SET trial_ends_at = UTC_TIMESTAMP() + INTERVAL 14 DAY;

-- avisos de Stripe ya procesados: Stripe puede mandar el mismo aviso mas de una vez
CREATE TABLE stripe_events (
	id VARCHAR(255) NOT NULL,
	type VARCHAR(100) NOT NULL,
	received_at DATETIME NOT NULL,
	PRIMARY KEY (id)
) ENGINE=InnoDB;
