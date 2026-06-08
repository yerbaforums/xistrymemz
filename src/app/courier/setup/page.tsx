'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import FormWizard, { useWizard, type WizardStep } from '@/components/FormWizard'
import Skeleton from '@/components/Skeleton'
import { businessTemplates, getTemplateById, type BusinessTemplate } from '@/lib/templates'
import Button from '@/components/ui/Button'

interface CourierService {
  id: string
  name: string
  description: string | null
  serviceType: string
  basePrice: number
  pricePerMile: number
  maxDistance: number
  availableAreas: string | null
  isActive: boolean
}

const steps: WizardStep[] = [
  { key: 'template', label: 'Choose Template', icon: '📋' },
  { key: 'details', label: 'Service Details', icon: '🚚' },
  { key: 'coverage', label: 'Coverage Areas', icon: '📍' },
  { key: 'pricing', label: 'Pricing', icon: '💰' },
  { key: 'review', label: 'Review & Activate', icon: '✅' }
]

export default function CourierSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  
  const templateId = searchParams.get('template')
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null)
  
  const [services, setServices] = useState<CourierService[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<CourierService | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceType: 'DELIVERY',
    basePrice: '',
    pricePerMile: '0',
    maxDistance: '50',
    availableAreas: '',
    isActive: true
  })

  const wizard = useWizard(steps)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchServices()
    }
  }, [session])

  useEffect(() => {
    if (templateId) {
      const template = getTemplateById(templateId)
      if (template) {
        setSelectedTemplate(template)
        setFormData({
          name: template.data.serviceName || '',
          description: template.data.serviceDescription || '',
          serviceType: template.data.serviceType || 'DELIVERY',
          basePrice: template.data.basePrice?.toString() || '',
          pricePerMile: template.data.pricePerMile?.toString() || '0',
          maxDistance: template.data.maxDistance?.toString() || '50',
          availableAreas: template.data.availableAreas || '',
          isActive: true
        })
      }
    }
  }, [templateId])

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/courier?userId=${session?.user?.id}`)
      if (res.ok) {
        const data = await res.json()
        setServices(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingService ? `/api/courier/${editingService.id}` : '/api/courier'
      const method = editingService ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: parseFloat(formData.basePrice),
          pricePerMile: parseFloat(formData.pricePerMile),
          maxDistance: parseFloat(formData.maxDistance),
          availableAreas: formData.availableAreas || null
        })
      })

      if (res.ok) {
        setShowForm(false)
        setEditingService(null)
        setFormData({
          name: '', description: '', serviceType: 'DELIVERY',
          basePrice: '', pricePerMile: '0', maxDistance: '50',
          availableAreas: '', isActive: true
        })
        fetchServices()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save service')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (service: CourierService) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      serviceType: service.serviceType,
      basePrice: service.basePrice.toString(),
      pricePerMile: service.pricePerMile.toString(),
      maxDistance: service.maxDistance.toString(),
      availableAreas: service.availableAreas || '',
      isActive: service.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this courier service?')) return
    try {
      const res = await fetch(`/api/courier/${id}`, { method: 'DELETE' })
      if (res.ok) fetchServices()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleActive = async (service: CourierService) => {
    try {
      const res = await fetch(`/api/courier/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive })
      })
      if (res.ok) fetchServices()
    } catch (err) {
      console.error(err)
    }
  }

  const handleNext = () => {
    if (wizard.currentStep === 'details' && !editingService) {
      handleSubmit(new Event('submit') as any)
    } else {
      wizard.goNext()
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>🚚 Courier Services</h1>
        <p className={styles.subtitle}>Offer delivery services to marketplace buyers</p>
      </div>

      {services.length === 0 && !showForm ? (
        <>
          <FormWizard
            steps={steps}
            currentStep={wizard.currentStep}
            onStepChange={wizard.setCurrentStep}
            onNext={wizard.currentStep === 'details' ? () => setShowForm(true) : wizard.goNext}
            onBack={wizard.goBack}
            onSubmit={() => {
              if (!editingService) {
                setShowForm(true)
              }
            }}
            isFirstStep={wizard.isFirstStep}
            isLastStep={wizard.isLastStep}
            loading={saving}
            submitLabel="Create Service"
          >
            {wizard.currentStep === 'template' && (
              <div className={styles.stepContent}>
                <h2>Choose a Template</h2>
                <p>Start with a pre-built template or create a blank service</p>
                
                <div className={styles.templateGrid}>
                  <div 
                    className={`${styles.templateCard} ${!selectedTemplate ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedTemplate(null)
                      setFormData({
                        name: '', description: '', serviceType: 'DELIVERY',
                        basePrice: '', pricePerMile: '0', maxDistance: '50',
                        availableAreas: '', isActive: true
                      })
                    }}
                  >
                    <div className={styles.templateIcon}>🚚</div>
                    <div>
                      <h3>Blank Service</h3>
                      <p>Start from scratch</p>
                    </div>
                  </div>
                  
                  {businessTemplates
                    .filter(t => t.type === 'COURIER')
                    .map(template => (
                      <div
                        key={template.id}
                        className={`${styles.templateCard} ${selectedTemplate?.id === template.id ? styles.selected : ''}`}
                        onClick={() => {
                          setSelectedTemplate(template)
                          setFormData({
                            name: template.data.serviceName || '',
                            description: template.data.serviceDescription || '',
                            serviceType: template.data.serviceType || 'DELIVERY',
                            basePrice: template.data.basePrice?.toString() || '',
                            pricePerMile: template.data.pricePerMile?.toString() || '0',
                            maxDistance: template.data.maxDistance?.toString() || '50',
                            availableAreas: template.data.availableAreas || '',
                            isActive: true
                          })
                        }}
                      >
                        <div className={styles.templateIcon}>{template.icon}</div>
                        <div>
                          <h3>{template.name}</h3>
                          <span className={styles.category}>{template.category}</span>
                          <p>{template.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {wizard.currentStep === 'details' && (
              <div className={styles.stepContent}>
                <h2>Service Details</h2>
                <p>Define your service name and type</p>
                
                <div className={styles.formPreview}>
                  <div className="form-group">
                    <label>Service Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Standard Delivery"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe your delivery service..."
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Type</label>
                    <select
                      value={formData.serviceType}
                      onChange={e => setFormData({...formData, serviceType: e.target.value})}
                    >
                      <option value="DELIVERY">Delivery</option>
                      <option value="PICKUP">Pickup</option>
                      <option value="EXPRESS">Express</option>
                      <option value="INTERNATIONAL">International</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {wizard.currentStep === 'coverage' && (
              <div className={styles.stepContent}>
                <h2>Coverage Areas</h2>
                <p>Define where you can deliver</p>
                
                <div className={styles.formPreview}>
                  <div className="form-group">
                    <label>Service Areas (zip codes or cities, comma separated)</label>
                    <input
                      type="text"
                      value={formData.availableAreas}
                      onChange={e => setFormData({...formData, availableAreas: e.target.value})}
                      placeholder="e.g., 90210, Beverly Hills, Los Angeles"
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Distance (miles)</label>
                    <input
                      type="number"
                      value={formData.maxDistance}
                      onChange={e => setFormData({...formData, maxDistance: e.target.value})}
                      placeholder="50"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}

            {wizard.currentStep === 'pricing' && (
              <div className={styles.stepContent}>
                <h2>Pricing</h2>
                <p>Set your rates</p>
                
                <div className={styles.formPreview}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Base Price ($) *</label>
                      <input
                        type="number"
                        value={formData.basePrice}
                        onChange={e => setFormData({...formData, basePrice: e.target.value})}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Price Per Mile ($)</label>
                      <input
                        type="number"
                        value={formData.pricePerMile}
                        onChange={e => setFormData({...formData, pricePerMile: e.target.value})}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizard.currentStep === 'review' && (
              <div className={styles.stepContent}>
                <h2>Review & Create</h2>
                <p>Review your service details before creating</p>
                
                <div className={styles.reviewSection}>
                  <h3>Service Details</h3>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Type:</strong> {formData.serviceType}</p>
                  <p><strong>Description:</strong> {formData.description || 'N/A'}</p>
                </div>
                
                <div className={styles.reviewSection}>
                  <h3>Pricing</h3>
                  <p><strong>Base Price:</strong> ${formData.basePrice || '0'}</p>
                  <p><strong>Per Mile:</strong> ${formData.pricePerMile || '0'}</p>
                  <p><strong>Max Distance:</strong> {formData.maxDistance} miles</p>
                </div>
                
                <div className={styles.reviewSection}>
                  <h3>Coverage</h3>
                  <p><strong>Areas:</strong> {formData.availableAreas || 'Not specified'}</p>
                </div>
              </div>
            )}
          </FormWizard>
        </>
      ) : (
        <>
          <div className={styles.headerActions}>
            <Button onClick={() => { 
              setShowForm(true)
              setEditingService(null)
              setFormData({
                name: '', description: '', serviceType: 'DELIVERY',
                basePrice: '', pricePerMile: '0', maxDistance: '50',
                availableAreas: '', isActive: true
              })
            }} className={styles.addBtn}>
              + New Service
            </Button>
          </div>

          <div className={styles.servicesGrid}>
            {services.map(service => (
              <div key={service.id} className={`${styles.serviceCard} ${!service.isActive ? styles.inactive : ''}`}>
                <div className={styles.serviceHeader}>
                  <span className={`badge badge-${service.serviceType.toLowerCase()}`}>
                    {service.serviceType}
                  </span>
                  <Button 
                    onClick={() => handleToggleActive(service)}
                    className={service.isActive ? styles.activeBtn : styles.inactiveBtn}
                  >
                    {service.isActive ? 'Active' : 'Paused'}
                  </Button>
                </div>
                <h3>{service.name}</h3>
                {service.description && <p className={styles.serviceDesc}>{service.description}</p>}
                <div className={styles.servicePricing}>
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Base Price</span>
                    <span className={styles.priceValue}>${service.basePrice.toFixed(2)}</span>
                  </div>
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Per Mile</span>
                    <span className={styles.priceValue}>${service.pricePerMile.toFixed(2)}</span>
                  </div>
                  <div className={styles.priceItem}>
                    <span className={styles.priceLabel}>Max Distance</span>
                    <span className={styles.priceValue}>{service.maxDistance} mi</span>
                  </div>
                </div>
                {service.availableAreas && (
                  <p className={styles.serviceAreas}>
                    📍 Areas: {service.availableAreas}
                  </p>
                )}
                <div className={styles.serviceActions}>
                  <Button onClick={() => handleEdit(service)} className={styles.editBtn}>Edit</Button>
                  <Button onClick={() => handleDelete(service.id)} className={styles.deleteBtn}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingService ? 'Edit Courier Service' : 'Create Courier Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Standard Delivery, Express Delivery"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your delivery service..."
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({...formData, serviceType: e.target.value})}
                  >
                    <option value="DELIVERY">Delivery</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="EXPRESS">Express</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base Price ($) *</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={e => setFormData({...formData, basePrice: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price Per Mile ($)</label>
                  <input
                    type="number"
                    value={formData.pricePerMile}
                    onChange={e => setFormData({...formData, pricePerMile: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Max Distance (miles)</label>
                  <input
                    type="number"
                    value={formData.maxDistance}
                    onChange={e => setFormData({...formData, maxDistance: e.target.value})}
                    placeholder="50"
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Service Areas (zip codes or cities, comma separated)</label>
                <input
                  type="text"
                  value={formData.availableAreas}
                  onChange={e => setFormData({...formData, availableAreas: e.target.value})}
                  placeholder="e.g., 90210, Beverly Hills, Los Angeles"
                />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Service is active and available
                </label>
              </div>
              <div className={styles.formActions}>
                <Button type="button" onClick={() => setShowForm(false)} variant="ghost">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
