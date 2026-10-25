import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'

import { ConfirmButton } from './ConfirmButton'

describe('ConfirmButton', () => {
  it('solo ejecuta la accion si se confirma', async () => {
    const usuario = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmButton trigger={<Button>Archivar</Button>} title="¿Archivar?" confirmLabel="Sí, archivar" onConfirm={onConfirm} />)

    // abrir y volver atras no hace nada
    await usuario.click(screen.getByRole('button', { name: 'Archivar' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('¿Archivar?')
    await usuario.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onConfirm).not.toHaveBeenCalled()

    // abrir y confirmar si
    await usuario.click(screen.getByRole('button', { name: 'Archivar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, archivar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
