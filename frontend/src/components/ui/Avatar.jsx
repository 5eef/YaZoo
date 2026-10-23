import { useState } from 'react'
import PropTypes from 'prop-types'
import { safeMediaSource } from '../../utils/media'

function Avatar({ name, src = '', size = 'md', className = '' }) {
  const [failedSrc, setFailedSrc] = useState('')
  const dimensions = {
    sm: 'h-9 w-9 text-xs rounded-2xl',
    md: 'h-11 w-11 text-sm rounded-[20px]',
    lg: 'h-20 w-20 text-xl rounded-[28px]',
    xl: 'h-24 w-24 text-2xl rounded-[32px]',
  }[size] ?? 'h-11 w-11 text-sm rounded-[20px]'

  const safeName = String(name ?? 'YaZoo')
  const initials = safeName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (src && failedSrc !== src) {
    return (
      <img
        src={safeMediaSource(src)}
        alt={safeName}
        onError={() => setFailedSrc(src)}
        className={`${dimensions} object-cover border border-white/90 bg-[linear-gradient(135deg,#e9d5ff,#ddd6fe,#ffffff)] shadow-[0_14px_32px_rgba(124,58,237,0.14)] ring-2 ring-white/70 ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex ${dimensions} items-center justify-center bg-[linear-gradient(135deg,#c4b5fd,#d8b4fe,#f5d0fe)] font-semibold text-violet-950 shadow-[0_12px_28px_rgba(124,58,237,0.14)] ${className}`}
      aria-hidden="true"
    >
      {initials || 'YZ'}
    </div>
  )
}

Avatar.propTypes = {
  name: PropTypes.string,
  src: PropTypes.string,
  size: PropTypes.string,
  className: PropTypes.string,
}

export default Avatar
