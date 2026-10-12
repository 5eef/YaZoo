import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import StoryComposerModal from './StoryComposerModal'
import { I18nProvider } from '../../contexts/I18nContext'

beforeEach(() => {
  localStorage.setItem('yazoo-locale', 'en')
  URL.createObjectURL = vi.fn(() => 'blob:qa')
  URL.revokeObjectURL = vi.fn()
})

it('prevents duplicate story submissions and preserves media after failure', async () => {
  let reject
  const onSubmit = vi.fn(() => new Promise((_resolve, fail) => { reject = fail }))
  render(<I18nProvider><StoryComposerModal isOpen onClose={vi.fn()} onSubmit={onSubmit} /></I18nProvider>)
  const input = document.querySelector('input[type="file"]')
  const file = new File(['qa'], 'qa.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
  const form = screen.getByRole('dialog')
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(onSubmit.mock.calls[0][0].media_file).toBe(file)
  await act(async () => reject(new Error('validation')))
  fireEvent.submit(form)
  expect(onSubmit).toHaveBeenCalledTimes(2)
  expect(onSubmit.mock.calls[1][0].media_file).toBe(file)
  await act(async () => reject(new Error('validation')))
})
