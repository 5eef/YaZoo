import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PropTypes from 'prop-types'

import {
  approveMembershipRequestRequest,
  createCommunityRequest,
  getCommunitiesRequest,
  getMembershipRequestsRequest,
  joinCommunityRequest,
  leaveCommunityRequest,
  rejectMembershipRequestRequest,
  updateCommunityRequest,
} from '../api/communities'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import CollapsiblePanel from '../components/ui/CollapsiblePanel'
import { useI18n } from '../hooks/useI18n'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

const defaultForm = {
  name: '',
  description: '',
  image_file: null,
  image_url: '',
  is_private: false,
}

function CommunitiesPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const [communities, setCommunities] = useState([])
  const [search, setSearch] = useState(queryFromUrl)
  const [form, setForm] = useState(defaultForm)
  const [communityMediaPreview, setCommunityMediaPreview] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedRequestsCommunityId, setExpandedRequestsCommunityId] =
    useState(null)
  const [membershipRequestsByCommunityId, setMembershipRequestsByCommunityId] =
    useState({})
  const [loadingRequestCommunityIds, setLoadingRequestCommunityIds] = useState([])
  const [processingMembershipIds, setProcessingMembershipIds] = useState([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const activeFiltersCount = search.trim() ? 1 : 0

  useEffect(() => {
    return () => {
      if (communityMediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(communityMediaPreview)
      }
    }
  }, [communityMediaPreview])

  const fetchCommunities = async (term = search) => {
    try {
      const response = await getCommunitiesRequest(term ? { q: term } : {})

      setCommunities(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.loadError')),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setSearch(queryFromUrl)

    const loadInitialCommunities = async () => {
      try {
        const response = await getCommunitiesRequest(queryFromUrl ? { q: queryFromUrl } : {})

        if (!cancelled) {
          setCommunities(extractDataArray(response))
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, t('communities.loadError')),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInitialCommunities()

    return () => {
      cancelled = true
    }
  }, [queryFromUrl, t])

  const heroStats = useMemo(() => {
    const safeCommunities = asArray(communities)
    const privateCount = safeCommunities.filter((community) => community.isPrivate).length
    const joinedCount = safeCommunities.filter((community) => community.isMember).length
    const pendingCount = safeCommunities.reduce(
      (sum, community) => sum + (community.pendingRequestsCount ?? 0),
      0,
    )

    return {
      privateCount,
      joinedCount,
      pendingCount,
    }
  }, [communities])

  const handleSearch = async (event) => {
    event.preventDefault()
    if (search.trim()) {
      setSearchParams({ q: search.trim() })
    } else {
      setSearchParams({})
    }
    setIsLoading(true)
    await fetchCommunities(search)
  }

  const handleResetSearch = async () => {
    setSearch('')
    setSearchParams({})
    setIsLoading(true)
    await fetchCommunities('')
  }

  const handleFormChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCommunityMediaChange = (event) => {
    const file = event.target.files?.[0] ?? null

    setForm((current) => ({
      ...current,
      image_file: file,
      image_url: file ? '' : current.image_url,
    }))

    setCommunityMediaPreview(file ? URL.createObjectURL(file) : '')
  }

  const handleClearCommunityMedia = () => {
    setForm((current) => ({
      ...current,
      image_file: null,
      image_url: '',
    }))
    setCommunityMediaPreview('')
  }

  const resetForm = () => {
    setForm(defaultForm)
    setCommunityMediaPreview('')
    setEditingId(null)
  }

  const replaceCommunity = (updatedCommunity) => {
    if (!updatedCommunity?.id) {
      return
    }

    setCommunities((current) =>
      asArray(current).map((community) =>
        community.id === updatedCommunity.id ? updatedCommunity : community,
      ),
    )
  }

  const removeMembershipRequest = (communityId, membershipId) => {
    setMembershipRequestsByCommunityId((current) => ({
      ...current,
      [communityId]: (current[communityId] ?? []).filter(
        (request) => request.id !== membershipId,
      ),
    }))
  }

  const fetchMembershipRequests = async (communityId) => {
    setLoadingRequestCommunityIds((current) => [...current, communityId])

    try {
      const response = await getMembershipRequestsRequest(communityId)

      setMembershipRequestsByCommunityId((current) => ({
        ...current,
        [communityId]: extractDataArray(response),
      }))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.pendingRequestsLoadError')),
      )
    } finally {
      setLoadingRequestCommunityIds((current) =>
        current.filter((id) => id !== communityId),
      )
    }
  }

  const handleToggleMembershipRequests = async (community) => {
    setErrorMessage('')
    setSuccessMessage('')

    if (expandedRequestsCommunityId === community.id) {
      setExpandedRequestsCommunityId(null)
      return
    }

    setExpandedRequestsCommunityId(community.id)

    if (!membershipRequestsByCommunityId[community.id]) {
      await fetchMembershipRequests(community.id)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const payload = buildCommunityPayload(form)

      if (editingId) {
        await updateCommunityRequest(editingId, payload)
        setSuccessMessage(t('communities.form.updateSuccess'))
      } else {
        await createCommunityRequest(payload)
        setSuccessMessage(t('communities.form.createSuccess'))
      }

      resetForm()
      await fetchCommunities()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.form.saveFailed')),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (community) => {
    setEditingId(community.id)
    setForm({
      name: community.name ?? '',
      description: community.description ?? '',
      image_file: null,
      image_url: community.imageUrl ?? '',
      is_private: community.isPrivate ?? false,
    })
    setCommunityMediaPreview(community.imageUrl ?? '')
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleJoin = async (communityId) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await joinCommunityRequest(communityId)
      replaceCommunity(extractDataObject(response, null))
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.detail.joinError')),
      )
    }
  }

  const handleLeave = async (communityId) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await leaveCommunityRequest(communityId)
      replaceCommunity(extractDataObject(response, null))
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.detail.leaveError')),
      )
    }
  }

  const handleApproveMembershipRequest = async (communityId, membershipId) => {
    setProcessingMembershipIds((current) => [...current, membershipId])
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await approveMembershipRequestRequest(
        communityId,
        membershipId,
      )

      replaceCommunity(response.data.community)
      removeMembershipRequest(communityId, extractDataObject(response, null)?.id)
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.requests.approveFailed')),
      )
    } finally {
      setProcessingMembershipIds((current) =>
        current.filter((id) => id !== membershipId),
      )
    }
  }

  const handleRejectMembershipRequest = async (communityId, membershipId) => {
    setProcessingMembershipIds((current) => [...current, membershipId])
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await rejectMembershipRequestRequest(
        communityId,
        membershipId,
      )

      replaceCommunity(response.data.community)
      removeMembershipRequest(communityId, extractDataObject(response, null)?.id)
      setSuccessMessage(response.data.message)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('communities.requests.rejectFailed')),
      )
    } finally {
      setProcessingMembershipIds((current) =>
        current.filter((id) => id !== membershipId),
      )
    }
  }

  const submitLabel = getCommunitySubmitLabel(isSubmitting, editingId, t)
  const safeCommunities = asArray(communities)

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.52),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:rounded-[32px] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div>
            <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              {t('communities.titlePlural')}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              {t('communities.hero.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              {t('communities.hero.subtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStatCard label={t('communities.titlePlural')} value={asArray(communities).length} />
            <HeroStatCard label={t('communities.stats.private')} value={heroStats.privateCount} />
            <HeroStatCard label={t('communities.stats.myGroups')} value={heroStats.joinedCount} />
          </div>
        </div>
      </section>

      <CollapsiblePanel
        kicker={t('communities.search.label')}
        title={t('communities.search.title')}
        description={t('communities.search.placeholder')}
        summary={activeFiltersCount > 0 ? t('communities.search.active') : t('communities.search.noActiveFilter')}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen((current) => !current)}
        actions={
          activeFiltersCount > 0 ? (
            <Button type="button" variant="ghost" onClick={handleResetSearch}>
              {t('communities.search.reset')}
            </Button>
          ) : null
        }
      >
        <form onSubmit={handleSearch}>
          <div className="flex flex-col gap-4 md:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('communities.searchPlaceholder')}
              className="flex-1 rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white"
            />
            <Button type="submit" className="w-full md:w-auto">{t('common.search')}</Button>
          </div>
        </form>
      </CollapsiblePanel>

      {errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <CollapsiblePanel
          kicker={t('communities.creation.label')}
          title={editingId ? t('communities.creation.editTitle') : t('communities.creation.title')}
          description={t('communities.creation.subtitle')}
          summary={editingId ? t('communities.creation.editing') : t('communities.creation.label')}
          isOpen={isCreateOpen || Boolean(editingId)}
          onToggle={() => setIsCreateOpen((current) => !current)}
          showLabel={t('communities.creation.button')}
          hideLabel={t('communities.search.hide')}
        >
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-violet-100 bg-white/60 p-4 dark:border-violet-300/14 dark:bg-white/8 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
                {t('communities.creation.label')}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-950">
                {editingId ? t('communities.creation.editTitle') : t('communities.creation.title')}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {t('communities.creation.subtitle')}
              </p>
            </div>

            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                {t('communities.form.cancel')}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4">
            <Field label={t('communities.form.name')} value={form.name} onChange={handleFormChange('name')} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700">
                {t('communities.form.cover')}
              </span>
              <div className="rounded-[24px] border border-dashed border-violet-200 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] p-3">
                {communityMediaPreview ? (
                  <div className="overflow-hidden rounded-[18px] bg-violet-100/70">
                    {isVideoMedia(form.image_file?.type || communityMediaPreview) ? (
                      <video
                        src={communityMediaPreview}
                        className="h-44 w-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={communityMediaPreview}
                        alt={t('communities.previewAlt')}
                        className="h-44 w-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-[18px] bg-violet-50/80 px-4 text-center text-sm text-violet-700">
                    {t('communities.form.coverHint')}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#c084fc)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(124,58,237,0.24)]">
                    {t('communities.form.uploadCover')}
                    <input
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      type="file"
                      onChange={handleCommunityMediaChange}
                    />
                  </label>
                  {communityMediaPreview ? (
                    <Button type="button" variant="ghost" onClick={handleClearCommunityMedia}>
                      {t('communities.form.removeCover')}
                    </Button>
                  ) : null}
                </div>

                {form.image_file ? (
                  <p className="mt-2 text-xs text-stone-500">
                    {t('communities.form.selectedFile', { name: form.image_file.name })}
                  </p>
                ) : null}
              </div>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-stone-700">
              {t('communities.form.description')}
            </span>
            <textarea
              rows={5}
              value={form.description}
              onChange={handleFormChange('description')}
              className="w-full rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white"
              placeholder={t('communities.descriptionPlaceholder')}
            />
          </label>

          <label className="mt-4 flex items-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-4 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.is_private}
              onChange={handleFormChange('is_private')}
              className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-300"
            />
            {t('communities.form.private')}
          </label>

          <div className="mt-4 flex justify-stretch sm:justify-end">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {submitLabel}
            </Button>
          </div>
        </form>
        </CollapsiblePanel>

        <div className="space-y-4">
          <div className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
                  {t('communities.list.label')}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-stone-950">
                  {t('communities.list.title')}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {t('communities.list.found', {
                    count: safeCommunities.length,
                    pending: heroStats.pendingCount,
                  })}
                </p>
              </div>
              <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:bg-white/8 dark:text-violet-100">
                {t('communities.list.activeGroups')}
              </div>
            </div>
          </div>

          {isLoading ? (
            <StateBox>{t('communities.loading')}</StateBox>
          ) : null}

          {!isLoading && safeCommunities.length === 0 ? (
            <StateBox>{t('communities.emptySearch')}</StateBox>
          ) : null}

          {!isLoading && safeCommunities.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {safeCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isRequestsOpen={expandedRequestsCommunityId === community.id}
                  requests={membershipRequestsByCommunityId[community.id] ?? []}
                  isLoadingRequests={loadingRequestCommunityIds.includes(community.id)}
                  processingMembershipIds={processingMembershipIds}
                  onEdit={handleEdit}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onToggleRequests={handleToggleMembershipRequests}
                  onApproveRequest={handleApproveMembershipRequest}
                  onRejectRequest={handleRejectMembershipRequest}
                  t={t}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function CommunityCard({
  community,
  isRequestsOpen,
  requests,
  isLoadingRequests,
  processingMembershipIds,
  onEdit,
  onJoin,
  onLeave,
  onToggleRequests,
  onApproveRequest,
  onRejectRequest,
  t,
}) {
  const statusLabel = getCommunityStatusLabel(community, t)
  const statusClass = getCommunityStatusClass(community)

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] shadow-[0_18px_42px_rgba(124,58,237,0.08)]">
      <div className="h-40 bg-violet-100/70 sm:h-52 md:h-64 lg:h-72">
        {community.imageUrl ? (
          isVideoMedia(community.imageUrl) ? (
            <video
              src={community.imageUrl}
              className="h-full w-full object-cover"
              controls
            />
          ) : (
            <img
              src={community.imageUrl}
              alt={community.name}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,_rgba(124,58,237,0.14),_rgba(216,180,254,0.22),_rgba(255,255,255,0.92))] text-sm font-medium text-violet-700">
            {t('communities.card.placeholder')}
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">{community.name}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {t('communities.detail.createdAt', { date: formatDate(community.createdAt) })}
            </p>
          </div>

          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-[22px] bg-white/90 px-4 py-3 shadow-sm">
          <Avatar name={community.owner.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900">
              {community.owner.name}
            </p>
            <p className="text-xs text-stone-500">
              {t('communities.detail.membersCount', { count: community.membersCount })}
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-stone-600">
          {community.description || t('communities.detail.noDescription')}
        </p>

        {community.canManageRequests && community.isPrivate ? (
          <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">
                  {t('communities.requests.title')}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {t('communities.requests.pendingCount', {
                    pending: community.pendingRequestsCount,
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => onToggleRequests(community)}
              >
                {isRequestsOpen ? t('communities.requests.close') : t('communities.requests.manage')}
              </Button>
            </div>

            {isRequestsOpen ? (
              <div className="mt-4 space-y-3">
                {isLoadingRequests ? (
                  <div className="rounded-[20px] border border-dashed border-violet-200 bg-white/84 px-4 py-6 text-sm text-stone-500">
                    {t('communities.requests.loading')}
                  </div>
                ) : null}

                {!isLoadingRequests && requests.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-violet-200 bg-white/84 px-4 py-6 text-sm text-stone-500">
                    {t('communities.requests.empty')}
                  </div>
                ) : null}

                {!isLoadingRequests
                  ? requests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-[22px] border border-violet-100 bg-white/90 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar name={request.user.name} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-stone-950">
                                {request.user.name}
                              </p>
                              <p className="text-sm text-stone-500">
                                {request.user.email}
                              </p>
                              <p className="mt-1 text-xs text-stone-400">
                                {t('communities.requests.sentAt', { date: formatDate(request.requestedAt) })}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:flex sm:flex-wrap">
                            <Button
                              type="button"
                              onClick={() =>
                                onApproveRequest(community.id, request.id)
                              }
                              disabled={processingMembershipIds.includes(request.id)}
                              className="w-full sm:w-auto"
                            >
                              {processingMembershipIds.includes(request.id)
                                ? t('common.updating')
                                : t('communities.requests.approve')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                onRejectRequest(community.id, request.id)
                              }
                              disabled={processingMembershipIds.includes(request.id)}
                              className="w-full sm:w-auto"
                            >
                              {t('communities.requests.reject')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <Link
            to={`/communities/${community.id}`}
            className="inline-flex w-full items-center justify-center rounded-full border border-violet-100 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/12 sm:w-auto"
          >
            {t('communities.card.enter')}
          </Link>

          {!community.isMember && community.membershipStatus !== 'pending' ? (
            <Button type="button" onClick={() => onJoin(community.id)} className="w-full sm:w-auto">
              {community.isPrivate ? t('communities.requestAccess') : t('communities.detail.join')}
            </Button>
          ) : null}

          {community.isMember ? (
            <Button type="button" variant="ghost" onClick={() => onLeave(community.id)} className="w-full sm:w-auto">
              {t('communities.detail.leave')}
            </Button>
          ) : null}

          {community.isAdmin ? (
            <Button type="button" variant="secondary" onClick={() => onEdit(community)} className="w-full sm:w-auto">
              {t('communities.form.edit')}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function getCommunitySubmitLabel(isSubmitting, editingId, t) {
  if (isSubmitting) {
    return t('communities.form.saving')
  }

  if (editingId) {
    return t('communities.form.update')
  }

  return t('communities.form.submit')
}

function buildCommunityPayload(form) {
  if (!form.image_file) {
    return {
      name: form.name,
      description: form.description,
      image_url: form.image_url,
      is_private: form.is_private,
    }
  }

  const formData = new FormData()
  formData.append('name', form.name)
  formData.append('description', form.description ?? '')
  formData.append('is_private', form.is_private ? '1' : '0')
  formData.append('image_file', form.image_file)

  return formData
}

function isVideoMedia(value = '') {
  const mediaValue = String(value).toLowerCase()

  return (
    mediaValue.startsWith('video/') ||
    /\.(mp4|webm|mov|quicktime)(\?|#|$)/i.test(mediaValue)
  )
}

function getCommunityStatusLabel(community, t) {
  if (community.membershipStatus === 'pending') {
    return t('communities.detail.pending')
  }

  if (community.isMember) {
    return t('communities.detail.member')
  }

  if (community.isPrivate) {
    return t('communities.form.private')
  }

  return t('communities.form.public')
}

function getCommunityStatusClass(community) {
  if (community.membershipStatus === 'pending') {
    return 'bg-fuchsia-100 text-fuchsia-800'
  }

  if (community.isMember) {
    return 'bg-emerald-100 text-emerald-700'
  }

  return 'bg-violet-50 text-violet-800'
}

function HeroStatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/88 px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  )
}

function StateBox({ children }) {
  return (
    <div className="rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
      {children}
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">
        {label}
      </span>
      <input
        className="w-full rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white"
        {...props}
      />
    </label>
  )
}

CommunityCard.propTypes = {
  community: PropTypes.object,
  isRequestsOpen: PropTypes.bool,
  requests: PropTypes.array,
  isLoadingRequests: PropTypes.bool,
  processingMembershipIds: PropTypes.array,
  onEdit: PropTypes.func,
  onJoin: PropTypes.func,
  onLeave: PropTypes.func,
  onToggleRequests: PropTypes.func,
  onApproveRequest: PropTypes.func,
  onRejectRequest: PropTypes.func,
  t: PropTypes.func,
}

HeroStatCard.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

StateBox.propTypes = {
  children: PropTypes.node,
}

Field.propTypes = {
  label: PropTypes.string,
}

export default CommunitiesPage
