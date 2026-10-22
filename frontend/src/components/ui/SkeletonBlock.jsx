import PropTypes from 'prop-types'

function SkeletonBlock({ count = 3, label = 'Loading', variant = 'card' }) {
  const rows = Array.from({ length: count })

  return (
    <div role="status" className="grid gap-4 lg:grid-cols-2" aria-label={label} aria-busy="true">
      {rows.map((_, index) => (
        <div
          key={`skeleton-${variant}-${index}`}
          className="animate-pulse rounded-[28px] border border-violet-100 bg-white/84 p-4 shadow-[0_18px_38px_rgba(124,58,237,0.06)] dark:border-violet-300/16 dark:bg-white/10"
        >
          <div className="aspect-[4/3] rounded-[22px] bg-violet-100/80 dark:bg-white/14" />
          <div className="mt-4 h-4 w-2/3 rounded-full bg-violet-100 dark:bg-white/16" />
          <div className="mt-3 h-3 w-full rounded-full bg-violet-50 dark:bg-white/10" />
          <div className="mt-2 h-3 w-4/5 rounded-full bg-violet-50 dark:bg-white/10" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 flex-1 rounded-full bg-violet-100 dark:bg-white/14" />
            <div className="h-8 w-20 rounded-full bg-violet-50 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

SkeletonBlock.propTypes = {
  count: PropTypes.number,
  label: PropTypes.string,
  variant: PropTypes.string,
}

export default SkeletonBlock
