import PropTypes from 'prop-types'

function UnreadBadge({ children, label }) {
  return (
    <span
      className="absolute -end-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white shadow-[0_8px_18px_rgba(225,29,72,0.28)] ring-2 ring-white dark:ring-[#160d24]"
      aria-label={label}
      dir="ltr"
    >
      {children}
    </span>
  )
}

UnreadBadge.propTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
}

export default UnreadBadge
