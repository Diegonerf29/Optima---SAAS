import { expect, test } from '@playwright/test'

/*
 * un EMPLOYEE lleva la agenda y los clientes, pero no la configuracion del negocio
 * usa el usuario de los datos de demo (perfil dev)
 */
test('un empleado ve la agenda pero no puede cambiar la configuración ni el catálogo', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('empleado@optima.com')
  await page.getByLabel('Contraseña').fill('12345678')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/app$/)

  // el menu no tiene Configuracion
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await expect(menu.getByRole('link', { name: 'Agenda' })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Configuración' })).toHaveCount(0)

  // y si escribe la direccion a mano tampoco la ve
  await page.goto('/app/settings')
  await expect(page.getByText('Solo para administración')).toBeVisible()

  // el catalogo es solo de lectura
  await page.goto('/app/catalog')
  await expect(page.getByRole('cell', { name: /Corte caballero/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo servicio' })).toHaveCount(0)

  // pero si puede dar citas
  await page.goto('/app/agenda')
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toBeEnabled()
})
