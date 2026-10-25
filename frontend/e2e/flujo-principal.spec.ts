import { expect, test } from '@playwright/test'

/*
 * el dia a dia de un local nuevo: registrarse, poner el horario, crear un servicio,
 * dar una cita a un cliente nuevo, confirmarla y cobrarla
 */
test('un negocio nuevo da su primera cita y la cobra', async ({ page }) => {
  const u = Date.now().toString(36)

  // registro
  await page.goto('/register')
  await page.getByLabel('Nombre del negocio').fill(`Peluquería E2E ${u}`)
  await page.getByLabel('Email del negocio').fill(`negocio-${u}@ejemplo.com`)
  await page.getByLabel('Tu nombre').fill('Laura Gómez')
  await page.getByLabel('Tu email').fill(`laura-${u}@ejemplo.com`)
  await page.getByLabel('Contraseña').fill('clave-segura-1')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear negocio' }).click()

  // tras registrarse se llega a la configuracion, en la pestaña del horario
  await expect(page).toHaveURL(/\/app\/settings\?bienvenida=1/)
  await expect(page.getByText('¡Bienvenido a Optima!')).toBeVisible()

  // horario de lunes a sabado, de 10 a 20
  await page.getByRole('combobox', { name: 'Días' }).click()
  await page.getByRole('option', { name: 'De lunes a sábado' }).click()
  await page.getByLabel('Abre').fill('10:00')
  await page.getByLabel('Cierra').fill('20:00')
  await page.getByRole('button', { name: 'Añadir tramo' }).click()
  await expect(page.getByText('10:00–20:00')).toHaveCount(6)

  // un servicio (el IVA y la categoria General ya vienen creados)
  await page.getByRole('link', { name: 'Catálogo' }).click()
  await page.getByRole('button', { name: 'Nuevo servicio' }).click()
  await page.getByLabel('Nombre').fill('Corte de pelo')
  await page.getByLabel('Duración (minutos)').fill('30')
  await page.getByLabel('Precio (€, IVA incluido)').fill('18.50')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('cell', { name: 'Corte de pelo' })).toBeVisible()

  // cita para el proximo dia laborable con un cliente nuevo
  await page.getByRole('link', { name: 'Agenda' }).click()
  await page.getByRole('button', { name: 'Nueva cita' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('combobox', { name: 'Buscar cliente' }).click()
  await page.getByRole('button', { name: /Nuevo cliente/ }).click()
  await page.getByPlaceholder('Nombre y apellidos').fill('Marta Ruiz')
  await page.getByPlaceholder('Teléfono').fill('600123456')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()
  await dialogo.getByText('Corte de pelo').click()

  const dia = new Date()
  dia.setDate(dia.getDate() + (dia.getDay() === 6 ? 2 : 1)) // el domingo esta cerrado
  const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
  await dialogo.getByLabel('Día').fill(iso)
  await dialogo.getByRole('button', { name: '10:30' }).click()
  await dialogo.getByRole('button', { name: 'Crear cita' }).click()
  await expect(page.getByText('Cita creada')).toBeVisible()

  // en la ficha del cliente aparece la cita: se confirma y se cobra
  await page.getByRole('link', { name: 'Clientes' }).click()
  await page.getByRole('cell', { name: 'Marta Ruiz' }).click()
  await page.getByRole('button', { name: /Corte de pelo/ }).click()
  const detalle = page.getByRole('dialog')
  await detalle.getByRole('button', { name: 'Confirmar' }).click()
  await expect(detalle.getByText('Confirmada', { exact: true })).toBeVisible()
  await detalle.getByRole('button', { name: /^Cobrar/ }).click()
  await expect(detalle.getByText(/Cobrada con tarjeta por Laura Gómez/)).toBeVisible()
  await expect(detalle.getByText('18,50 €').last()).toBeVisible()
})
