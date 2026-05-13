'use client'

import { useState } from 'react'
import styles from './support.module.css'
import type { PlanContribution, PlanJoiner } from '@/lib/plan-utils'

interface PlanSupportProps {
  planId: string
  currentFunding: number | null
  goalAmount: number | null
  donationAddress: string | null
  donationCurrency: string
  donationDescription: string | null
  acceptsDonations: boolean
  needsVolunteers: boolean
  volunteerRoles: string | null
  volunteerDescription: string | null
  joiners: PlanJoiner[]
  contributions: PlanContribution[]
  userId: string
  isOwner: boolean
}

export default function PlanSupport({
  planId,
  currentFunding,
  goalAmount,
  donationAddress,
  donationCurrency,
  donationDescription,
  acceptsDonations,
  needsVolunteers,
  volunteerRoles,
  volunteerDescription,
  joiners,
  contributions,
  userId,
  isOwner
}: PlanSupportProps) {
  const [contributeAmount, setContributeAmount] = useState(goalAmount ? Math.min(goalAmount - (currentFunding || 0), goalAmount * 0.1) : 10)
  const [contributeMessage, setContributeMessage] = useState('')
  const [showContributeForm, setShowContributeForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const funding = currentFunding || 0
  const goal = goalAmount || 0
  const progressPercent = goal > 0 ? Math.min(Math.round((funding / goal) * 100), 100) : 0
  const remaining = goal > 0 ? Math.max(goal - funding, 0) : 0

  const parsedVolunteerRoles: string[] = volunteerRoles
    ? (() => { try { const p = JSON.parse(volunteerRoles); return Array.isArray(p) ? p : [] } catch { return [] } })()
    : []

  const volunteers = joiners.filter(j => j.role === 'VOLUNTEER')
  const isVolunteer = volunteers.some(v => v.userId === userId)
  const currentUser = joiners.find(j => j.userId === userId)

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributeAmount || contributeAmount <= 0) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/plans/${planId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: contributeAmount, message: contributeMessage || null })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to contribute')
      }
      setSuccess(`Contributed ${contributeAmount} ${donationCurrency}!`)
      setContributeAmount(goal > 0 ? Math.min(remaining - contributeAmount, goal * 0.1) : 10)
      setContributeMessage('')
      setShowContributeForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to contribute')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinVolunteer = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/plans/${planId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'VOLUNTEER' })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to join as volunteer')
      }
      setSuccess('Joined as volunteer!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveVolunteer = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/plans/${planId}/join?role=VOLUNTEER`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to leave')
      }
      setSuccess('Left volunteer role')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave')
    } finally {
      setLoading(false)
    }
  }

  const sliderValue = contributeAmount
  const maxSlider = goal > 0 ? remaining : 10000
  const displayGoal = goal > 0 ? `${funding} / ${goal} ${donationCurrency}` : `${funding} ${donationCurrency} raised`

  return (
    <div className={styles.supportPage}>
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError('')} className={styles.errorClose}>✕</button>
        </div>
      )}
      {success && (
        <div className={styles.successBanner}>
          {success}
          <button onClick={() => setSuccess('')} className={styles.errorClose}>✕</button>
        </div>
      )}

      {/* Donation Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>💰</span> Support This Project
        </h2>

        {acceptsDonations ? (
          <div className={styles.donationContent}>
            {/* Goal Progress */}
            {goal > 0 && (
              <div className={styles.goalSection}>
                <div className={styles.goalHeader}>
                  <span className={styles.goalLabel}>Funding Goal</span>
                  <span className={styles.goalAmount}>{displayGoal}</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                </div>
                <div className={styles.goalStats}>
                  <span>{progressPercent}% funded</span>
                  <span>{remaining} {donationCurrency} remaining</span>
                </div>
              </div>
            )}

            {donationDescription && (
              <p className={styles.donationDesc}>{donationDescription}</p>
            )}

            {donationAddress && (
              <div className={styles.addressBox}>
                <span className={styles.addressLabel}>Donation Address ({donationCurrency})</span>
                <code className={styles.addressValue}>{donationAddress}</code>
              </div>
            )}

            {/* Contribute Form */}
            {userId && !isOwner && (
              <div className={styles.contributeSection}>
                {!showContributeForm ? (
                  <button onClick={() => setShowContributeForm(true)} className={styles.contributeBtn} disabled={loading}>
                    💸 Contribute
                  </button>
                ) : (
                  <form onSubmit={handleContribute} className={styles.contributeForm}>
                    <div className={styles.sliderRow}>
                      <label className={styles.contributeLabel}>
                        Amount ({donationCurrency}): <strong>{contributeAmount}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={maxSlider}
                        step={1}
                        value={sliderValue}
                        onChange={e => setContributeAmount(parseFloat(e.target.value))}
                        className={styles.amountSlider}
                      />
                      <div className={styles.sliderLabels}>
                        <span>1</span>
                        <span>{maxSlider}</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={maxSlider}
                      value={contributeAmount}
                      onChange={e => setContributeAmount(parseFloat(e.target.value) || 0)}
                      className={styles.amountInput}
                      placeholder="Amount"
                    />
                    <input
                      type="text"
                      value={contributeMessage}
                      onChange={e => setContributeMessage(e.target.value)}
                      className={styles.messageInput}
                      placeholder="Leave a message (optional)"
                      maxLength={500}
                    />
                    <div className={styles.contributeActions}>
                      <button type="button" onClick={() => setShowContributeForm(false)} className={styles.cancelBtn} disabled={loading}>Cancel</button>
                      <button type="submit" className={styles.submitBtn} disabled={loading || !contributeAmount || contributeAmount <= 0}>
                        {loading ? 'Processing...' : `Send ${contributeAmount} ${donationCurrency}`}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {isOwner && (
              <p className={styles.ownerNote}>You are the owner of this plan. Others can contribute.</p>
            )}

            {/* Contributions List */}
            {contributions.length > 0 && (
              <div className={styles.contributionsList}>
                <h3 className={styles.contributionsTitle}>Contributions ({contributions.length})</h3>
                {contributions.map(c => (
                  <div key={c.id} className={styles.contributionItem}>
                    <div className={styles.contributionHeader}>
                      <span className={styles.contributionUser}>{c.user.name || c.user.email}</span>
                      <span className={styles.contributionAmount}>+{c.amount} {donationCurrency}</span>
                    </div>
                    {c.message && <p className={styles.contributionMessage}>{c.message}</p>}
                    <span className={styles.contributionDate}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className={styles.noDonations}>This project is not currently accepting donations.</p>
        )}
      </div>

      {/* Volunteer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🤝</span> Volunteer
        </h2>

        {needsVolunteers ? (
          <div className={styles.volunteerContent}>
            {volunteerDescription && <p className={styles.volunteerDesc}>{volunteerDescription}</p>}

            {parsedVolunteerRoles.length > 0 && (
              <div className={styles.rolesList}>
                <h3 className={styles.rolesTitle}>Roles Needed</h3>
                {parsedVolunteerRoles.map((role, i) => (
                  <div key={i} className={styles.roleItem}>
                    <span className={styles.roleIcon}>🔹</span>
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            )}

            {volunteers.length > 0 && (
              <div className={styles.volunteersList}>
                <h3 className={styles.volunteersTitle}>Current Volunteers ({volunteers.length})</h3>
                <div className={styles.volunteerNames}>
                  {volunteers.map(v => (
                    <span key={v.id} className={styles.volunteerName}>{v.user.name || v.user.email}</span>
                  ))}
                </div>
              </div>
            )}

            {userId && !isOwner && (
              <div className={styles.volunteerActions}>
                {isVolunteer ? (
                  <button onClick={handleLeaveVolunteer} className={styles.leaveBtn} disabled={loading}>
                    Leave Volunteer
                  </button>
                ) : (
                  <button onClick={handleJoinVolunteer} className={styles.joinBtn} disabled={loading}>
                    🤝 Join as Volunteer
                  </button>
                )}
              </div>
            )}

            {isOwner && (
              <p className={styles.ownerNote}>Manage volunteer settings in plan settings.</p>
            )}
          </div>
        ) : (
          <p className={styles.noVolunteers}>This project is not currently looking for volunteers.</p>
        )}
      </div>
    </div>
  )
}
