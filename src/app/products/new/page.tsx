'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { extractHashtags } from '@/lib/hashtags'
import Breadcrumbs from '@/components/Breadcrumbs'
import FormWizard, { useWizard } from '@/components/FormWizard'
import ImageUploader from '@/components/ImageUploader'
import type { DonationAddr } from '@/types/product'
import styles from './page.module.css'

const steps = [
  { key: 'basics', label: 'Basics' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'media', label: 'Media & Location' },
  { key: 'review', label: 'Review & List' },
]

const conditions = ['', 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR']

export default function NewProductPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { warning, error, success } = useToast()
  const { settings } = useSiteSettings()
  const wizard = useWizard(steps)

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [userDonationAddrs, setUserDonationAddrs] = useState<DonationAddr[]>([])
  const [shop, setShop] = useState<{ shopName: string; shopSlug: string } | null>(null)
  const [listingMode, setListingMode] = useState<'shop' | 'standalone' | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    type: 'PRODUCT',
    category: '',
    condition: '',
    location: '',
    locationDetails: '',
    isGlobal: false,
    imageUrl: '',
    paymentMethods: [] as string[],
    paymentType: 'BOTH',
    acceptsOffers: true,
    acceptsRequests: false,
    acceptsDonations: false,
    donationAddress: '',
    donationCurrency: 'ETH',
    sellerPayoutAddress: '',
    sellerCryptoCurrency: 'ETH',
    rentalDaily: '',
    rentalWeekly: '',
    rentalMonthly: '',
    rentalDeposit: '',
    rentalMinDays: 1,
    rentalMaxDays: '',
    rentalAvailable: true,
    createGroup: false,
    tagsInput: '',
    shareToFeed: false,
    acceptsAppointments: false,
    appointmentDuration: '60',
    appointmentLeadTime: '24',
    appointmentLocation: '',
    appointmentMeetingLink: '',
    appointmentFormFields: [] as { label: string; type: string; required: boolean }[],
  })

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/login')
      return
    }
    fetch('/api/shop')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.shopSlug) {
          setShop({ shopName: data.shopName, shopSlug: data.shopSlug })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    if (session?.user) {
      fetch('/api/users/donations')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.addresses) setUserDonationAddrs(data.addresses) })
        .catch(() => {})
    }
  }, [session])

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const extractedTags = useCallback(() => {
    const fromDesc = extractHashtags(form.description)
    const fromInput = form.tagsInput
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').toLowerCase().trim())
      .filter(Boolean)
    return [...new Set([...fromDesc, ...fromInput])]
  }, [form.description, form.tagsInput])

  const handleSubmit = async () => {
    setCreating(true)
    const tags = extractedTags()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: form.price || null,
          type: form.type,
          category: form.category || null,
          condition: form.condition || null,
          location: form.isGlobal ? 'GLOBAL' : (form.location || null),
          locationDetails: form.locationDetails || null,
          isGlobal: form.isGlobal,
          imageUrl: form.imageUrl || null,
          paymentMethods: form.paymentMethods.join(','),
          paymentType: settings.enableCheckout && settings.enableWallet ? form.paymentType : 'BOTH',
          acceptsOffers: form.acceptsOffers,
          acceptsRequests: form.acceptsRequests,
          acceptsDonations: form.acceptsDonations,
          donationAddress: form.acceptsDonations ? (form.donationAddress || null) : null,
          donationCurrency: form.acceptsDonations ? (form.donationCurrency || 'ETH') : null,
          sellerPayoutAddress: settings.enableCheckout ? (form.sellerPayoutAddress || null) : null,
          sellerCryptoCurrency: settings.enableCheckout ? (form.sellerCryptoCurrency || 'ETH') : null,
          rentalDaily: form.type === 'RENTAL' ? (form.rentalDaily || null) : null,
          rentalWeekly: form.type === 'RENTAL' ? (form.rentalWeekly || null) : null,
          rentalMonthly: form.type === 'RENTAL' ? (form.rentalMonthly || null) : null,
          rentalDeposit: form.type === 'RENTAL' ? (form.rentalDeposit || null) : null,
          rentalMinDays: form.type === 'RENTAL' ? form.rentalMinDays : 1,
          rentalMaxDays: form.type === 'RENTAL' ? (form.rentalMaxDays || null) : null,
          rentalAvailable: form.type === 'RENTAL' ? form.rentalAvailable : true,
          published: true,
          createGroup: form.createGroup,
          hashtags: tags,
          acceptsAppointments: form.acceptsAppointments,
          appointmentDuration: form.acceptsAppointments ? parseInt(form.appointmentDuration) : null,
          appointmentLeadTime: form.acceptsAppointments ? parseInt(form.appointmentLeadTime) : null,
          appointmentLocation: form.acceptsAppointments ? (form.appointmentLocation || null) : null,
          appointmentMeetingLink: form.acceptsAppointments ? (form.appointmentMeetingLink || null) : null,
          appointmentFormFields: form.acceptsAppointments ? form.appointmentFormFields : [],
        }),
      })
      if (res.ok) {
        const product = await res.json()
        if (form.shareToFeed) {
          await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `Just listed: ${form.title}`,
              context: session?.user && (session.user as any).shopSlug ? 'SHOP' : 'PROFILE',
              referenceType: 'PRODUCT',
              referenceId: product.id,
              referenceTitle: form.title
            })
          }).catch(() => {})
        }
        success('Product listed successfully!')
        router.push('/products')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create product')
      }
    } catch {
      error('Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Getting ready...</p>
      </div>
    )
  }

  if (!listingMode) {
    return (
      <div className={styles.page}>
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Marketplace', href: '/products' },
          { label: 'New Listing' }
        ]} />

        <div className={styles.welcomeScreen}>
          <h1 className={styles.welcomeTitle}>✨ Create a New Listing</h1>
          <p className={styles.welcomeSub}>How would you like to list your item?</p>

          <div className={styles.welcomeCards}>
            {shop && (
              <button
                className={styles.welcomeCard}
                onClick={() => setListingMode('shop')}
              >
                <span className={styles.welcomeCardIcon}>🏪</span>
                <span className={styles.welcomeCardTitle}>List in Your Shop</span>
                <span className={styles.welcomeCardDesc}>
                  Showcase this item in <strong>{shop.shopName}</strong> — your customers can find it alongside your other listings
                </span>
              </button>
            )}

            <button
              className={styles.welcomeCard}
              onClick={() => setListingMode('standalone')}
            >
              <span className={styles.welcomeCardIcon}>📦</span>
              <span className={styles.welcomeCardTitle}>List as Standalone</span>
              <span className={styles.welcomeCardDesc}>
                No shop needed! Your item will appear in the marketplace where everyone can see, message, and make offers
              </span>
            </button>

            {!shop && (
              <button
                className={`${styles.welcomeCard} ${styles.welcomeCardSecondary}`}
                onClick={() => router.push('/shop/setup')}
              >
                <span className={styles.welcomeCardIcon}>✨</span>
                <span className={styles.welcomeCardTitle}>Set Up a New Shop</span>
                <span className={styles.welcomeCardDesc}>
                  Create your own shop to build a brand, organize listings, and grow your presence
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const basicsValid = form.title.trim().length > 0
  const canContinue = (step: string) => {
    if (step === 'basics') return basicsValid
    return true
  }

  const handleNext = () => {
    if (canContinue(wizard.currentStep)) wizard.goNext()
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Marketplace', href: '/products' },
        { label: 'New Listing' }
      ]} />

      <h1 className={styles.pageTitle}>List a New Item</h1>
      {shop && listingMode === 'shop' && (
        <p className={styles.pageSub}>Adding to <strong>{shop.shopName}</strong></p>
      )}
      {listingMode === 'standalone' && (
        <p className={styles.pageSub}>Listing as a standalone item</p>
      )}

      <FormWizard
        steps={steps}
        currentStep={wizard.currentStep}
        onStepChange={wizard.setCurrentStep}
        onNext={handleNext}
        onBack={wizard.goBack}
        onSubmit={handleSubmit}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        loading={creating}
        submitLabel="List Item"
      >
        {wizard.currentStep === 'basics' && (
          <div className={styles.stepContent}>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="What are you listing?" required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your item... Use #hashtags to make it discoverable" rows={5} />
            </div>
            <div className={styles.row}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => update('type', e.target.value)}>
                  <option value="PRODUCT">Product</option>
                  <option value="SERVICE">Service</option>
                  <option value="RENTAL">Rental</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" value={form.category} onChange={e => update('category', e.target.value)} placeholder="e.g. Electronics" />
              </div>
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select value={form.condition} onChange={e => update('condition', e.target.value)}>
                {conditions.map(c => (
                  <option key={c} value={c}>{c ? c.replace('_', ' ') : 'Select...'}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {wizard.currentStep === 'pricing' && (
          <div className={styles.stepContent}>
            {form.type !== 'RENTAL' ? (
              <div className="form-group">
                <label>Price ($)</label>
                <input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="0.00" step="0.01" min="0" />
              </div>
            ) : (
              <div className={styles.rentalSection}>
                <h3>Rental Pricing</h3>
                <div className={styles.row}>
                  <div className="form-group">
                    <label>Daily Rate ($)</label>
                    <input type="number" value={form.rentalDaily} onChange={e => update('rentalDaily', e.target.value)} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Weekly Rate ($)</label>
                    <input type="number" value={form.rentalWeekly} onChange={e => update('rentalWeekly', e.target.value)} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Monthly Rate ($)</label>
                    <input type="number" value={form.rentalMonthly} onChange={e => update('rentalMonthly', e.target.value)} placeholder="0.00" step="0.01" />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className="form-group">
                    <label>Deposit ($)</label>
                    <input type="number" value={form.rentalDeposit} onChange={e => update('rentalDeposit', e.target.value)} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Min Days</label>
                    <input type="number" value={form.rentalMinDays} onChange={e => update('rentalMinDays', parseInt(e.target.value) || 1)} min="1" />
                  </div>
                  <div className="form-group">
                    <label>Max Days</label>
                    <input type="number" value={form.rentalMaxDays} onChange={e => update('rentalMaxDays', e.target.value)} placeholder="Unlimited" min="1" />
                  </div>
                </div>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.rentalAvailable} onChange={e => update('rentalAvailable', e.target.checked)} />
                  Available for Rent
                </label>
              </div>
            )}

            <div className="form-group">
              <label>Payment Methods</label>
              <div className={styles.pillGroup}>
                {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                  <label key={method} className={`${styles.pill} ${form.paymentMethods.includes(method) ? styles.pillActive : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.paymentMethods.includes(method)}
                      onChange={e => {
                        if (e.target.checked) {
                          update('paymentMethods', [...form.paymentMethods, method])
                        } else {
                          update('paymentMethods', form.paymentMethods.filter(m => m !== method))
                        }
                      }}
                      className={styles.pillCheckbox}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            {settings.enableCheckout && settings.enableWallet && (
              <>
                <div className="form-group">
                  <label>Payment Type</label>
                  <select value={form.paymentType} onChange={e => update('paymentType', e.target.value)}>
                    <option value="BOTH">Both (Escrow + Direct)</option>
                    <option value="ESCROW">Escrow Only (Protected)</option>
                    <option value="DIRECT">Direct Payment Only</option>
                  </select>
                  <small className={styles.hint}>
                    {form.paymentType === 'ESCROW' && `Buyers pay with escrow protection (${settings.platformFeePercent || 10}% fee)`}
                    {form.paymentType === 'DIRECT' && `Buyers pay directly to your wallet (${Math.round((settings.platformFeePercent || 10) / 2)}% fee)`}
                    {form.paymentType === 'BOTH' && 'Buyers can choose their preferred payment method'}
                  </small>
                </div>

                {(form.paymentType === 'DIRECT' || form.paymentType === 'BOTH') && (
                  <div className="form-group">
                    <label>Donation Address for Payments</label>
                    {userDonationAddrs.length === 0 ? (
                      <p className={styles.noAddrs}>
                        No donation addresses saved.{' '}
                        <a href="/profile/edit" style={{ color: 'var(--accent-primary)' }}>Add one in your profile settings</a>
                      </p>
                    ) : (
                      <div className={styles.chipGroup}>
                        {userDonationAddrs.map(da => {
                          const selected = form.sellerPayoutAddress === da.address && form.sellerCryptoCurrency === da.currency
                          const shortAddr = da.address.length > 12 ? da.address.slice(0, 4) + '...' + da.address.slice(-4) : da.address
                          return (
                            <button
                              key={da.id}
                              type="button"
                              onClick={() => {
                                update('sellerPayoutAddress', da.address)
                                update('sellerCryptoCurrency', da.currency)
                              }}
                              className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                              title={`${da.label || da.currency}: ${da.address}`}
                            >
                              <span className={styles.chipCurrency}>{da.currency}</span>
                              <span>{shortAddr}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <details className={styles.listingSettings}>
              <summary className={styles.settingsSummary}>⚙️ Listing Settings</summary>
              <div className={styles.settingsBody}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.acceptsOffers} onChange={e => update('acceptsOffers', e.target.checked)} />
                  Accept Offers / Barter
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.acceptsRequests} onChange={e => update('acceptsRequests', e.target.checked)} />
                  Allow adding to Plans
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.acceptsDonations} onChange={e => update('acceptsDonations', e.target.checked)} />
                  Accept Donations
                </label>
                {form.acceptsDonations && (
                  <div className={styles.donationFields}>
                    <div className="form-group">
                      <label>Donation Address</label>
                      {userDonationAddrs.length === 0 ? (
                        <p className={styles.noAddrs}>
                          No donation addresses saved.{' '}
                          <a href="/profile/edit" style={{ color: 'var(--accent-primary)' }}>Add one in your profile settings</a>
                        </p>
                      ) : (
                        <div className={styles.chipGroup}>
                          {userDonationAddrs.map(da => {
                            const selected = form.donationAddress === da.address && form.donationCurrency === da.currency
                            const shortAddr = da.address.length > 12 ? da.address.slice(0, 4) + '...' + da.address.slice(-4) : da.address
                            return (
                              <button
                                key={da.id}
                                type="button"
                                onClick={() => {
                                  update('donationAddress', da.address)
                                  update('donationCurrency', da.currency)
                                }}
                                className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                                title={`${da.label || da.currency}: ${da.address}`}
                              >
                                <span className={styles.chipCurrency}>{da.currency}</span>
                                <span>{shortAddr}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.acceptsAppointments} onChange={e => update('acceptsAppointments', e.target.checked)} />
                  Accept Appointments / Booking
                </label>
                {form.acceptsAppointments && (
                  <div className={styles.donationFields}>
                    <div className="form-group">
                      <label>Duration (minutes)</label>
                      <input type="number" value={form.appointmentDuration} onChange={e => update('appointmentDuration', e.target.value)} min={5} step={5} />
                    </div>
                    <div className="form-group">
                      <label>Lead Time (hours notice required)</label>
                      <input type="number" value={form.appointmentLeadTime} onChange={e => update('appointmentLeadTime', e.target.value)} min={0} />
                    </div>
                    <div className="form-group">
                      <label>Location (optional)</label>
                      <input type="text" value={form.appointmentLocation} onChange={e => update('appointmentLocation', e.target.value)} placeholder="Address or meeting point" />
                    </div>
                    <div className="form-group">
                      <label>Meeting Link (optional)</label>
                      <input type="url" value={form.appointmentMeetingLink} onChange={e => update('appointmentMeetingLink', e.target.value)} placeholder="https://meet.google.com/..." />
                    </div>
                    <div className="form-group">
                      <label>Custom Form Fields (buyers answer when booking)</label>
                      {form.appointmentFormFields.map((field, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <input type="text" value={field.label} onChange={e => {
                            const fields = [...form.appointmentFormFields]
                            fields[i] = { ...fields[i], label: e.target.value }
                            setForm({ ...form, appointmentFormFields: fields })
                          }} placeholder="Question label" style={{ flex: 1 }} />
                          <select value={field.type} onChange={e => {
                            const fields = [...form.appointmentFormFields]
                            fields[i] = { ...fields[i], type: e.target.value }
                            setForm({ ...form, appointmentFormFields: fields })
                          }}>
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                          </select>
                          <label style={{ whiteSpace: 'nowrap', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="checkbox" checked={field.required} onChange={e => {
                              const fields = [...form.appointmentFormFields]
                              fields[i] = { ...fields[i], required: e.target.checked }
                              setForm({ ...form, appointmentFormFields: fields })
                            }} /> Required
                          </label>
                          <button type="button" onClick={() => setForm({ ...form, appointmentFormFields: form.appointmentFormFields.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 18 }} title="Remove field">×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm({ ...form, appointmentFormFields: [...form.appointmentFormFields, { label: '', type: 'text', required: false }] })} className="btn-ghost" style={{ fontSize: 13 }}>+ Add Field</button>
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {wizard.currentStep === 'media' && (
          <div className={styles.stepContent}>
            <div className="form-group">
              <label>Image</label>
              <ImageUploader images={form.imageUrl ? [form.imageUrl] : []} onChange={urls => update('imageUrl', urls[0] || '')} maxImages={1} />
            </div>
            <div className="form-group">
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.isGlobal} onChange={e => update('isGlobal', e.target.checked)} />
                Available Globally (no location required)
              </label>
            </div>
            {!form.isGlobal && (
              <>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={form.location} onChange={e => update('location', e.target.value)} placeholder="City, State or full address" />
                </div>
                <div className="form-group">
                  <label>Location Details</label>
                  <input type="text" value={form.locationDetails} onChange={e => update('locationDetails', e.target.value)} placeholder="Additional details (optional)" />
                </div>
              </>
            )}
            <div className="form-group">
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.createGroup} onChange={e => update('createGroup', e.target.checked)} />
                Create a discussion group for this listing
              </label>
            </div>
          </div>
        )}

        {wizard.currentStep === 'review' && (
          <div className={styles.stepContent}>
            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                value={form.tagsInput}
                onChange={e => update('tagsInput', e.target.value)}
                placeholder="Add tags: #electronics #vintage (space or comma separated)"
              />
              <div className={styles.tagPreview}>
                {extractedTags().map(tag => (
                  <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
                {extractedTags().length === 0 && (
                  <span className={styles.hint}>Tags will be extracted from your description and this field</span>
                )}
              </div>
            </div>

            <div className={styles.reviewCard}>
              <h3>Review Your Listing</h3>
              <div className={styles.reviewGrid}>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Title</span>
                  <span>{form.title}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Type</span>
                  <span className={styles.typeBadge}>{form.type}</span>
                </div>
                {form.category && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Category</span>
                    <span>{form.category}</span>
                  </div>
                )}
                {form.condition && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Condition</span>
                    <span>{form.condition.replace('_', ' ')}</span>
                  </div>
                )}
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Price</span>
                  <span className={styles.reviewPrice}>
                    {form.type === 'RENTAL'
                      ? form.rentalDaily ? `$${form.rentalDaily}/day` : 'Contact for pricing'
                      : form.price ? `$${form.price}` : 'Free'}
                  </span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Location</span>
                  <span>{form.isGlobal ? '🌍 Global' : form.location || 'Not specified'}</span>
                </div>
                {form.paymentMethods.length > 0 && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Payment</span>
                    <span>{form.paymentMethods.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8, cursor: 'pointer', marginTop: 12 }}>
              <input type="checkbox" checked={form.shareToFeed} onChange={e => setForm({ ...form, shareToFeed: e.target.checked })} />
              <span style={{ fontSize: '0.9rem' }}>Also share to my feed</span>
            </label>
          </div>
        )}
      </FormWizard>
    </div>
  )
}
