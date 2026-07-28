import PropTypes from 'prop-types'
import { Link } from 'react-router'

import { getMarketplacePublishRoute, PROFESSIONAL_VERIFICATION_ROUTE } from '../../utils/marketplacePublishing'
import AppIcon from '../ui/AppIcon'

function DesktopMarketplacePublishButton({ capability, t }) {
  const target = getMarketplacePublishRoute(capability)
  const isDirectPublishing = target !== PROFESSIONAL_VERIFICATION_ROUTE
  const label = isDirectPublishing
    ? t('marketplace.publishShortcut')
    : t('marketplace.completeProfessionalVerification')

  return (
    <Link
      to={target}
      data-testid="desktop-marketplace-publish"
      className="group relative inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-white/65 bg-[linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(239,229,255,0.9))] text-violet-800 shadow-[0_20px_48px_rgba(76,29,149,0.2)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-950 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 dark:border-violet-300/18 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.96),_rgba(64,31,104,0.92))] dark:text-violet-50 dark:shadow-[0_24px_56px_rgba(0,0,0,0.36)]"
      aria-label={label}
      title={label}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_10px_22px_rgba(124,58,237,0.25)]">
        <AppIcon name="edit" className="h-5 w-5" />
      </span>
    </Link>
  )
}

DesktopMarketplacePublishButton.propTypes = {
  capability: PropTypes.shape({
    canPublish: PropTypes.bool,
    destination: PropTypes.string,
    serviceType: PropTypes.string,
    verificationStatus: PropTypes.string,
  }),
  t: PropTypes.func.isRequired,
}

export default DesktopMarketplacePublishButton
