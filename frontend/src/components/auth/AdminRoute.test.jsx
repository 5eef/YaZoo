import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AuthContext } from '../../contexts/auth-context'
import AdminRoute from './AdminRoute'

function renderRoute(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/feed" element={<p>Fil public</p>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<p>Administration</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AdminRoute', () => {
  it('renders an admin page for an authenticated administrator', () => {
    renderRoute({ isAuthenticated: true, isBootstrapping: false, user: { isAdmin: true } })

    expect(screen.getByText('Administration')).toBeInTheDocument()
  })

  it('redirects a non administrator away from the admin area', () => {
    renderRoute({ isAuthenticated: true, isBootstrapping: false, user: { isAdmin: false } })

    expect(screen.getByText('Fil public')).toBeInTheDocument()
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })
})
