-- Invitaciones de empleados (hallazgo A3)
-- Si se añade a un negocio un email que ya tiene cuenta en Optima, no se vincula directamente:
-- se crea la membresia como invitacion pendiente (inactiva) hasta que la persona la acepte.
ALTER TABLE memberships
	ADD COLUMN invitation_pending BOOLEAN NOT NULL DEFAULT FALSE,
	ADD COLUMN invited_at DATETIME NULL;
