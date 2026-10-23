import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../contexts/I18nContext'
import OwnerListingActions from './OwnerListingActions'

describe('owner listing actions', () => {
  it('requires confirmation and locks deletion without losing a server error', async () => {
    localStorage.setItem('yazoo-locale', 'fr')
    const user = userEvent.setup()
    const edit = vi.fn()
    let rejectRequest
    const remove = vi.fn(() => new Promise((resolve, reject) => { rejectRequest = reject }))
    render(<I18nProvider><OwnerListingActions onEdit={edit} onDelete={remove} /></I18nProvider>)
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(edit).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(remove).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Confirmer' })
    await user.dblClick(confirm)
    expect(remove).toHaveBeenCalledOnce()
    expect(confirm).toBeDisabled()
    rejectRequest({ response: { status: 403, data: { message: 'Permission refusée.' } } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Permission refusée.')
    await waitFor(() => expect(confirm).not.toBeDisabled())
  })
})
