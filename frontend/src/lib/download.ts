/** guarda unos datos como fichero .json en el ordenador (exportaciones del RGPD) */
export function descargarJson(nombre: string, datos: unknown) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}
