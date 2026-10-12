import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../contexts/I18nContext'
import { translate } from '../../lib/i18n'
import CreatePost from './CreatePost'

describe('post form mutation', () => {
  it('accepts the Laravel 5000-character limit, trims payload and prevents duplicate requests while retaining failed content', async () => {
    localStorage.setItem('yazoo-locale', 'fr')
    const t = key => translate('fr', key)
    const user = userEvent.setup()
    let rejectRequest
    const create = vi.fn(() => new Promise((resolve, reject) => { rejectRequest = reject }))
    render(<I18nProvider><CreatePost onCreate={create} /></I18nProvider>)
    await user.click(screen.getByRole('button', { name: t('creation.createPost') }))
    const content = screen.getByRole('textbox', { name: t('feed.postContent') })
    expect(content).toHaveAttribute('maxlength', '5000')
    await user.type(content, '  QA post  ')
    const submit = screen.getByRole('button', { name: t('feed.publish') })
    await user.dblClick(submit)
    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ content: 'QA post' }))
    expect(submit).toBeDisabled()
    rejectRequest({ response: { status: 422, data: { errors: { content: ['Contenu refusé.'] } } } })
    expect(await screen.findByText('Contenu refusé.')).toBeInTheDocument()
    await waitFor(() => expect(submit).not.toBeDisabled())
    expect(content).toHaveValue('  QA post  ')
  })
})
