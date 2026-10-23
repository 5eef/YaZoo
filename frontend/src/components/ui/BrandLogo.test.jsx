import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { useTheme } from '../../hooks/useTheme'
import BrandLogo from './BrandLogo'
function Harness() {
  const { setTheme } = useTheme()
  return <><button onClick={() => setTheme('dark')}>dark</button><button onClick={() => setTheme('light')}>light</button><BrandLogo variant="full" /><BrandLogo alt="" className="h-12 w-12" /></>
}
describe('BrandLogo', () => {
  it('switches official full artwork with the existing theme provider and preserves the transparent symbol', () => {
    render(<ThemeProvider><Harness /></ThemeProvider>)
    fireEvent.click(screen.getByText('dark'))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/login-dark-2026.png')
    fireEvent.click(screen.getByText('light'))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/login-light-2026.png')
    expect(document.querySelector('[data-brand-logo="symbol"]')).toHaveAttribute('src', '/brand/yazoo-inapp-2026.png')
    expect(screen.getByRole('img')).toHaveClass('object-contain')
  })
})
