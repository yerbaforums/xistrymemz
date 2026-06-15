'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Breadcrumbs from '@/components/Breadcrumbs'
import ImageUploader from '@/components/ImageUploader'
import HashtagInput from '@/components/HashtagInput'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import LocationPicker from '@/components/LocationPicker'
import AssetPicker from '@/components/AssetPicker'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import { PROJECT_CATEGORIES } from '@/lib/project-categories'
import type { UserAsset } from '@/components/AssetPicker'
import type { DonationAddr } from '@/types/product'

const TEMPLATES = [
  { id: 'community-garden', icon: '🌱', name: 'Community Garden',
    description: 'Start a community garden with planning, planting, and harvest milestones',
    sampleTitle: 'Community Garden Project',
    sampleDesc: 'Building a sustainable community garden for fresh produce and neighborhood connection.',
    sampleCategory: 'ENVIRONMENT',
    sampleCollaborators: true, sampleVolunteers: true,
    sampleGoals: 'Secure land and permits\nOrganize planting schedule\nRecruit volunteers\nHarvest and distribute',
    sampleMileposts: 'Site selection & prep\nSeed planting\nWeekly maintenance\nFirst harvest',
    samplePhases: 'Phase 1: Site Prep — Find land, test soil, prepare beds\nPhase 2: Planting — Sow seeds, set up irrigation\nPhase 3: Maintenance — Weekly watering, weeding, pest control\nPhase 4: Harvest — Pick produce, distribute to community',
    sampleInitialUpdate: 'Just launched our Community Garden project! Looking for volunteers and land donations. 🌱' },
  { id: 'bike-repair', icon: '🔧', name: 'Bike Repair Workshop',
    description: 'Set up a community bike repair shop with tool inventory and service plans',
    sampleTitle: 'Bike Repair Collective',
    sampleDesc: 'A community-run bike repair workshop offering tools, space, and know-how.',
    sampleCategory: 'COMMUNITY',
    sampleCollaborators: true, sampleVolunteers: true,
    sampleGoals: 'Gather tools and parts\nSet up workspace\nCreate repair schedule\nOffer classes',
    sampleMileposts: 'Tool collection\nWorkshop setup\nFirst repair day\nMonthly classes',
    samplePhases: 'Phase 1: Setup — Collect tools, find space\nPhase 2: Launch — First open shop day\nPhase 3: Grow — Add classes, expand hours',
    sampleInitialUpdate: 'Opening a community bike repair workshop! We need tools, volunteers, and space. 🚲🔧' },
  { id: 'neighborhood-watch', icon: '👁️', name: 'Neighborhood Watch',
    description: 'Organize neighborhood safety with check-in routes, alerts, and team coordination',
    sampleTitle: 'Neighborhood Safety Network',
    sampleDesc: 'Keeping our neighborhood safe through community watch, alerts, and quick response.',
    sampleCategory: 'COMMUNITY',
    sampleCollaborators: true, sampleVolunteers: true,
    sampleGoals: 'Recruit block captains\nEstablish communication\nSet up patrol routes\nEmergency plan',
    sampleMileposts: 'Captain recruitment\nCommunication setup\nFirst patrol\nEmergency drill',
    samplePhases: 'Phase 1: Organize — Recruit captains, set up channels\nPhase 2: Launch — First patrol routes\nPhase 3: Sustain — Monthly drills, expand coverage',
    sampleInitialUpdate: 'Starting a Neighborhood Watch! Join us in keeping our community safe. 👁️🤝' },
  { id: 'free-library', icon: '📚', name: 'Free Little Library',
    description: 'Create a free book exchange with multiple locations and community reading events',
    sampleTitle: 'Little Free Library Network',
    sampleDesc: 'Building little free libraries across the neighborhood for book sharing.',
    sampleCategory: 'EDUCATION',
    sampleCollaborators: true, sampleVolunteers: false,
    sampleGoals: 'Build library boxes\nFind host locations\nStock with books\nHost reading events',
    sampleMileposts: 'Box construction\nLocation setup\nBook drive\nFirst story time',
    samplePhases: 'Phase 1: Build — Construct library boxes\nPhase 2: Place — Find host locations\nPhase 3: Stock — Book drive, fill boxes\nPhase 4: Events — Story time, reading groups',
    sampleInitialUpdate: 'Launching a Little Free Library network! Help us build and stock book-sharing boxes. 📚📦' },
  { id: 'tool-lending', icon: '🛠️', name: 'Tool Lending Library',
    description: 'Start a tool sharing program where neighbors borrow and lend equipment',
    sampleTitle: 'Neighborhood Tool Library',
    sampleDesc: 'Borrow and lend tools with your neighbors. From lawn mowers to power drills.',
    sampleCategory: 'COMMUNITY',
    sampleCollaborators: true, sampleVolunteers: false,
    sampleGoals: 'Inventory tools\nSet up checkout system\nRecruit members\nMaintain tools',
    sampleMileposts: 'Tool inventory\nCheckout system\nMember drive\nMaintenance day',
    samplePhases: 'Phase 1: Collect — Inventory tools from donors\nPhase 2: System — Set up checkout process\nPhase 3: Launch — Open for members\nPhase 4: Maintain — Repair days, add tools',
    sampleInitialUpdate: 'Starting a Tool Library! Borrow tools from neighbors — lend yours too. 🛠️🏠' },
  { id: 'custom', icon: '✏️', name: 'Custom Project',
    description: 'Start from scratch with your own project idea',
    sampleTitle: '', sampleDesc: '', sampleCategory: '',
    sampleCollaborators: false, sampleVolunteers: false,
    sampleGoals: '', sampleMileposts: '', samplePhases: '', sampleInitialUpdate: '' },
]

const STEPS = [
  { label: 'Basics', icon: '📋' },
  { label: 'Team & Funding', icon: '🤝' },
  { label: 'Media & Details', icon: '📸' },
  { label: 'Review & Publish', icon: '✅' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const userDonationAddrs = useDonationAddresses()

  const [step, setStep] = useState(0)
  const [template, setTemplate] = useState('')

  // Step 1: Basics
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('IDEA')
  const [coverImage, setCoverImage] = useState<string[]>([])

  // Step 2: Team & Funding
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false)
  const [needsVolunteers, setNeedsVolunteers] = useState(false)
  const [volunteerRoles, setVolunteerRoles] = useState('')
  const [volunteerDescription, setVolunteerDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [acceptsDonations, setAcceptsDonations] = useState(false)
  const [selectedDonationAddrs, setSelectedDonationAddrs] = useState<DonationAddr[]>([])
  const [donationDescription, setDonationDescription] = useState('')
  const [phases, setPhases] = useState<string[]>([])

  // Step 3: Media & Details
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [location, setLocation] = useState<{ text: string; latitude: number | null; longitude: number | null }>({ text: '', latitude: null, longitude: null })
  const [goals, setGoals] = useState('')
  const [mileposts, setMileposts] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [linkedAsset, setLinkedAsset] = useState<UserAsset | null>(null)

  // Step 4: Review extras
  const [postUpdate, setPostUpdate] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [shareToFeed, setShareToFeed] = useState(false)
  const [published, setPublished] = useState(true)

  const [saving, setSaving] = useState(false)

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTemplate(tpl.id)
    setTitle(tpl.sampleTitle)
    setDescription(tpl.sampleDesc)
    setCategory(tpl.sampleCategory)
    setLookingForCollaborators(tpl.sampleCollaborators)
    setNeedsVolunteers(tpl.sampleVolunteers)
    setGoals(tpl.sampleGoals)
    setMileposts(tpl.sampleMileposts)
    setPhases(tpl.samplePhases ? tpl.samplePhases.split('\n').filter(Boolean) : [])
    setUpdateText(tpl.sampleInitialUpdate || '')
    setPostUpdate(!!tpl.sampleInitialUpdate)
    setStep(1)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description,
        category: category || undefined,
        status,
        imageUrl: coverImage[0] || null,
        images: images.length > 0 ? JSON.stringify(images) : null,
        videoUrl: videoUrl || null,
        location: location.text || undefined,
        latitude: location.latitude ?? undefined,
        longitude: location.longitude ?? undefined,
        lookingForCollaborators,
        needsVolunteers,
        volunteerRoles: volunteerRoles || null,
        volunteerDescription: volunteerDescription || null,
        goalAmount: goalAmount ? parseFloat(goalAmount) : null,
        acceptsDonations,
        donationAddress: selectedDonationAddrs[0]?.address || null,
        donationCurrency: selectedDonationAddrs[0]?.currency || 'ETH',
        donationDescription: donationDescription || null,
        donationAddresses: selectedDonationAddrs.length > 0 ? JSON.stringify(selectedDonationAddrs) : null,
        goals: goals || null,
        mileposts: mileposts || null,
        phases: phases.length > 0 ? JSON.stringify(phases) : null,
        hashtags,
        published,
        postUpdate: postUpdate ? (updateText || null) : null,
        shareToFeed,
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const data = await res.json()
      success('Project created!')
      router.push(`/projects/${data.data.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project'
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  const addPhase = () => setPhases([...phases, ''])
  const removePhase = (i: number) => setPhases(phases.filter((_, idx) => idx !== i))
  const updatePhase = (i: number, val: string) => {
    const next = [...phases]; next[i] = val; setPhases(next)
  }

  const categoryLabel = (v: string) => PROJECT_CATEGORIES.find(c => c.value === v)

  const selectedTemplate = TEMPLATES.find(t => t.id === template)

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: 'Create Project' },
      ]} />
      <div className={styles.header}>
        <Link href="/dashboard/projects" className={styles.backLink}>← Back to Projects</Link>
        <h1>New Project</h1>
        <p>Start with a template or create from scratch</p>
      </div>

      {!template && (
        <div className={styles.templateGrid}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} className={styles.templateCard} onClick={() => applyTemplate(tpl)}>
              <span className={styles.templateIcon}>{tpl.icon}</span>
              <strong className={styles.templateName}>{tpl.name}</strong>
              <span className={styles.templateDesc}>{tpl.description}</span>
            </button>
          ))}
        </div>
      )}

      {template && (
        <div className={styles.form}>
          {template !== 'custom' && selectedTemplate && (
            <div className={styles.banner}>
              <span>{selectedTemplate.icon}</span>
              <span>{selectedTemplate.name} template applied</span>
              <button className={styles.changeBtn} onClick={() => {
                setTemplate(''); setTitle(''); setDescription(''); setCategory('')
                setLookingForCollaborators(false); setNeedsVolunteers(false)
                setGoals(''); setMileposts(''); setPhases([]); setUpdateText(''); setPostUpdate(false)
                setStep(0)
              }}>
                Change
              </button>
            </div>
          )}

          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={s.label}
                className={`${styles.step} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
                <div className={styles.stepNumber}>{i < step ? '✓' : s.icon}</div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: BASICS */}
          {step === 0 && (
            <>
              <div className={styles.field}>
                <label>Project Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Name your project" />
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What is this project about?" rows={4} />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Select a category...</option>
                    {PROJECT_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="IDEA">💡 Idea</option>
                    <option value="IN_PROGRESS">🔨 In Progress</option>
                    <option value="COMPLETED">✅ Completed</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Cover Image</label>
                <ImageUploader images={coverImage} onChange={setCoverImage} maxImages={1} />
              </div>
              <div className={styles.actions}>
                <button className={styles.createBtn} onClick={() => setStep(1)} disabled={!title.trim()}>
                  Next: Team & Funding →
                </button>
              </div>
            </>
          )}

          {/* STEP 2: TEAM & FUNDING */}
          {step === 1 && (
            <>
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle}>🤝 Collaborate</div>
                <label className={styles.checkField}>
                  <input type="checkbox" checked={lookingForCollaborators}
                    onChange={e => setLookingForCollaborators(e.target.checked)} />
                  <span>Looking for collaborators</span>
                </label>
                <label className={styles.checkField}>
                  <input type="checkbox" checked={needsVolunteers}
                    onChange={e => setNeedsVolunteers(e.target.checked)} />
                  <span>Needs volunteers</span>
                </label>
                {needsVolunteers && (
                  <div className={styles.nestedFields}>
                    <div className={styles.field}>
                      <label>Volunteer Roles (comma separated)</label>
                      <input type="text" value={volunteerRoles}
                        onChange={e => setVolunteerRoles(e.target.value)}
                        placeholder="e.g. Setup, Photography, Cleanup" />
                    </div>
                    <div className={styles.field}>
                      <label>Volunteer Description</label>
                      <textarea value={volunteerDescription}
                        onChange={e => setVolunteerDescription(e.target.value)}
                        placeholder="Describe what volunteers will do..." rows={2} />
                    </div>
                  </div>
                )}
              </div>

              <details className={styles.sectionDetails}>
                <summary className={styles.sectionSummary}>💰 Funding & Donations</summary>
                <div className={styles.sectionContent}>
                  <div className={styles.field}>
                    <label>Funding Goal ($)</label>
                    <input type="number" value={goalAmount}
                      onChange={e => setGoalAmount(e.target.value)}
                      placeholder="0.00" step="0.01" min="0" />
                  </div>
                  <label className={styles.checkField}>
                    <input type="checkbox" checked={acceptsDonations}
                      onChange={e => setAcceptsDonations(e.target.checked)} />
                    <span>Accept crypto donations</span>
                  </label>
                  {acceptsDonations && (
                    <>
                      <DonationAddressPicker
                        savedAddresses={userDonationAddrs}
                        selectedAddresses={selectedDonationAddrs}
                        onAddressesChange={setSelectedDonationAddrs}
                      />
                      <div className={styles.field}>
                        <label>Donation Description</label>
                        <textarea value={donationDescription}
                          onChange={e => setDonationDescription(e.target.value)}
                          placeholder="What will donations fund?" rows={2} />
                      </div>
                    </>
                  )}
                </div>
              </details>

              <details className={styles.sectionDetails}>
                <summary className={styles.sectionSummary}>📋 Planning Stages</summary>
                <div className={styles.sectionContent}>
                  <p className={styles.sectionHint}>Define the phases of your project. Each phase can have a name and description.</p>
                  {phases.map((p, i) => (
                    <div key={i} className={styles.phaseRow}>
                      <input type="text" value={p} onChange={e => updatePhase(i, e.target.value)}
                        placeholder={`Phase ${i + 1}: Name — Description`} className={styles.phaseInput} />
                      <button type="button" onClick={() => removePhase(i)} className={styles.removeBtn}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addPhase} className={styles.addBtn}>+ Add Phase</button>
                </div>
              </details>

              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={() => setStep(0)}>← Basics</button>
                <button className={styles.createBtn} onClick={() => setStep(2)}>Next: Media & Details →</button>
              </div>
            </>
          )}

          {/* STEP 3: MEDIA & DETAILS */}
          {step === 2 && (
            <>
              <details className={styles.sectionDetails} open>
                <summary className={styles.sectionSummary}>📸 Media</summary>
                <div className={styles.sectionContent}>
                  <div className={styles.field}>
                    <label>Images</label>
                    <ImageUploader images={images} onChange={setImages} maxImages={10} />
                  </div>
                  <div className={styles.field}>
                    <label>Video URL</label>
                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..." />
                  </div>
                </div>
              </details>

              <details className={styles.sectionDetails}>
                <summary className={styles.sectionSummary}>📍 Location</summary>
                <div className={styles.sectionContent}>
                  <LocationPicker
                    value={location}
                    onChange={setLocation}
                  />
                </div>
              </details>

              <details className={styles.sectionDetails}>
                <summary className={styles.sectionSummary}>🎯 Goals & Milestones</summary>
                <div className={styles.sectionContent}>
                  <div className={styles.field}>
                    <label>Goals (one per line)</label>
                    <textarea value={goals} onChange={e => setGoals(e.target.value)}
                      placeholder="What do you want to achieve?" rows={4} />
                  </div>
                  <div className={styles.field}>
                    <label>Milestones (one per line)</label>
                    <textarea value={mileposts} onChange={e => setMileposts(e.target.value)}
                      placeholder="Key milestones or phases" rows={4} />
                  </div>
                </div>
              </details>

              <details className={styles.sectionDetails}>
                <summary className={styles.sectionSummary}>🔗 Tags & Links</summary>
                <div className={styles.sectionContent}>
                  <div className={styles.field}>
                    <label>Hashtags</label>
                    <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
                  </div>
                  <div className={styles.field}>
                    <label>Linked Entity</label>
                    <AssetPicker
                      filterTypes={['SCHOOL', 'SHOP']}
                      selectedAsset={linkedAsset}
                      onSelect={setLinkedAsset}
                      label="Link to a school or shop"
                    />
                  </div>
                </div>
              </details>

              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={() => setStep(1)}>← Team & Funding</button>
                <button className={styles.createBtn} onClick={() => setStep(3)}>Next: Review →</button>
              </div>
            </>
          )}

          {/* STEP 4: REVIEW & PUBLISH */}
          {step === 3 && (
            <>
              <div className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <h3>{title || 'Untitled Project'}</h3>
                  {category && (() => {
                    const cat = categoryLabel(category)
                    return cat ? <span className={styles.reviewTag} style={{ borderColor: cat.color, color: cat.color }}>{cat.icon} {cat.label}</span> : null
                  })()}
                  <span className={styles.reviewTag}>{status === 'IDEA' ? '💡 Idea' : status === 'IN_PROGRESS' ? '🔨 In Progress' : '✅ Completed'}</span>
                </div>
                {coverImage[0] && (
                  <img src={coverImage[0]} alt="" className={styles.reviewImage} />
                )}
                <p>{description || 'No description'}</p>

                <div className={styles.reviewSections}>
                  {(lookingForCollaborators || needsVolunteers) && (
                    <div className={styles.reviewSection}>
                      <strong>🤝 Collaboration</strong>
                      {lookingForCollaborators && <span>Looking for collaborators</span>}
                      {needsVolunteers && <span>Volunteers wanted{volunteerRoles ? `: ${volunteerRoles}` : ''}</span>}
                    </div>
                  )}

                  {(goalAmount || acceptsDonations) && (
                    <div className={styles.reviewSection}>
                      <strong>💰 Funding</strong>
                      {goalAmount && <span>Goal: ${parseFloat(goalAmount).toFixed(2)}</span>}
                      {acceptsDonations && <span>Accepts crypto donations</span>}
                    </div>
                  )}

                  {phases.length > 0 && phases.some(Boolean) && (
                    <div className={styles.reviewSection}>
                      <strong>📋 Planning Stages</strong>
                      {phases.filter(Boolean).map((p, i) => <span key={i}>{p}</span>)}
                    </div>
                  )}

                  {location.text && (
                    <div className={styles.reviewSection}>
                      <strong>📍 Location</strong>
                      <span>{location.text}</span>
                    </div>
                  )}

                  {goals && (
                    <div className={styles.reviewSection}>
                      <strong>🎯 Goals</strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{goals}</span>
                    </div>
                  )}

                  {mileposts && (
                    <div className={styles.reviewSection}>
                      <strong>🏁 Milestones</strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{mileposts}</span>
                    </div>
                  )}

                  {hashtags.length > 0 && (
                    <div className={styles.reviewSection}>
                      <strong>🏷️ Tags</strong>
                      <span>{hashtags.map(h => `#${h}`).join(' ')}</span>
                    </div>
                  )}

                  {linkedAsset && (
                    <div className={styles.reviewSection}>
                      <strong>🔗 Linked</strong>
                      <span>{linkedAsset.title} ({linkedAsset.type})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.reviewOptions}>
                <label className={styles.checkField}>
                  <input type="checkbox" checked={postUpdate} onChange={e => setPostUpdate(e.target.checked)} />
                  <span>✏️ Post initial update</span>
                </label>
                {postUpdate && (
                  <textarea value={updateText} onChange={e => setUpdateText(e.target.value)}
                    placeholder="Share what you're launching..." rows={2} className={styles.updateInput} />
                )}
                <label className={styles.checkField}>
                  <input type="checkbox" checked={shareToFeed} onChange={e => setShareToFeed(e.target.checked)} />
                  <span>📢 Share to my feed</span>
                </label>
                <label className={styles.checkField}>
                  <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
                  <span>🌍 Published (visible to everyone)</span>
                </label>
              </div>

              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={() => setStep(2)}>← Media & Details</button>
                <button className={styles.createBtn} onClick={handleCreate} disabled={saving || !title.trim()}>
                  {saving ? 'Creating...' : '🚀 Create Project'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
