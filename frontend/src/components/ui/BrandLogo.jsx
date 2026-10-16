import { useContext } from 'react'
import PropTypes from 'prop-types'
import { ThemeContext } from '../../contexts/theme-context'
import { brand } from '../../lib/brand'

export default function BrandLogo({ variant = 'symbol', alt = 'YaZoo', className = '', ...props }) {
  const theme = useContext(ThemeContext)
  const full = variant === 'full'
  const dark = theme?.resolvedTheme === 'dark'
  return <img {...props} src={full ? (dark ? brand.loginDark : brand.loginLight) : brand.logo}
    alt={alt} width={2000} height={2000} decoding="async"
    className={`shrink-0 object-contain ${className}`} data-brand-logo={variant} />
}

BrandLogo.propTypes = {
  variant: PropTypes.oneOf(['symbol', 'full']),
  alt: PropTypes.string,
  className: PropTypes.string,
}

