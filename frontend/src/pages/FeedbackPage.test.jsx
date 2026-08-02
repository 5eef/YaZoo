import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '../api/client'
import { I18nProvider } from '../contexts/I18nContext'
import FeedbackPage from './FeedbackPage'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <FeedbackPage />
      </I18nProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nom'), 'Sara')
  await user.type(screen.getByLabelText('Email'), 'sara@example.com')
  await user.type(screen.getByLabelText('Message'), 'Une suggestion utile')
  await user.click(screen.getByRole('button', { name: 'Envoyer le feedback' }))
}

describe('FeedbackPage', () => {
  beforeEach(() => {
    localStorage.setItem('yazoo-locale', 'fr')
    api.get.mockResolvedValue({ data: {} })
  })

  it('affiche le succes et efface le formulaire apres une reponse 2xx', async () => {
    api.post.mockResolvedValue({ status: 202 })
    renderPage()

    await fillAndSubmit()

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/contact', {
        nom: 'Sara',
        email: 'sara@example.com',
        objet: 'Feedback',
        message: 'Une suggestion utile',
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Merci, votre feedback a ete envoye.')
    expect(screen.getByLabelText('Message')).toHaveValue('')
  })

  it('affiche l erreur API et conserve la saisie en cas d echec', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Service indisponible.' } } })
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveValue('Une suggestion utile')
  })
})
