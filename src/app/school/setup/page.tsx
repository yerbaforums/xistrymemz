'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import FormWizard, { useWizard, type WizardStep } from '@/components/FormWizard'
import { businessTemplates, getTemplateById, type BusinessTemplate } from '@/lib/templates'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/Skeleton'

const steps: WizardStep[] = [
  { key: 'template', label: 'Choose Template', icon: '📋' },
  { key: 'profile', label: 'School Profile', icon: '🎓' },
  { key: 'content', label: 'Add Content', icon: '📚' },
  { key: 'pricing', label: 'Pricing Setup', icon: '💰' },
  { key: 'review', label: 'Review & Publish', icon: '✅' }
]

function SchoolSetupContent() {
  const { success, error } = useToast()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')
  
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [schoolAbout, setSchoolAbout] = useState('')
  const [schoolImage, setSchoolImage] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSchool, setHasSchool] = useState(false)

  const wizard = useWizard(steps)

  useEffect(() => {
    fetch('/api/school')
      .then(res => res.json())
      .then(data => {
        if (data.schoolName) {
          setSchoolName(data.schoolName || '')
          setSchoolAbout(data.schoolAbout || '')
          setSchoolImage(data.schoolImage || '')
          setSchoolSlug(data.schoolSlug || '')
          setHasSchool(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (templateId) {
      const template = getTemplateById(templateId)
      if (template) {
        setSelectedTemplate(template)
        setSchoolName(template.data.schoolName || '')
        setSchoolAbout(template.data.schoolAbout || '')
        setSchoolImage(template.data.schoolImage || '')
      }
    }
  }, [templateId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, schoolAbout, schoolImage })
      })

      if (res.ok) {
        const data = await res.json()
        setSchoolSlug(data.schoolSlug)
        setHasSchool(true)
        success('School saved successfully!')
        wizard.goNext()
      } else {
        error('Failed to save school')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSampleContent = async () => {
    if (!selectedTemplate?.sampleContent) return
    setSaving(true)
    try {
      for (const content of selectedTemplate.sampleContent) {
        await fetch('/api/school-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        })
      }
      success(`Added ${selectedTemplate.sampleContent.length} sample content items!`)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    success('School is ready!')
    setTimeout(() => {
      window.location.href = `/school/${schoolSlug || 'new'}`
    }, 1000)
  }

  if (loading) {
    return <Skeleton width="100%" height="2rem" />
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>{hasSchool ? 'Edit School' : 'Start a School'}</h1>
        <p className={styles.subtitle}>
          Create a school to share knowledge and content
        </p>
      </div>

      <FormWizard
        steps={steps}
        currentStep={wizard.currentStep}
        onStepChange={wizard.setCurrentStep}
        onNext={wizard.goNext}
        onBack={wizard.goBack}
        onSubmit={handleSubmit}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        loading={saving}
        submitLabel="Publish School"
      >
        {wizard.currentStep === 'template' && (
          <div className={styles.stepContent}>
            <h2>Choose a Template</h2>
            <p>Start with a pre-built template or create a blank school</p>
            
            <div className={styles.templateGrid}>
              <div 
                className={`${styles.templateCard} ${!selectedTemplate ? styles.selected : ''}`}
                onClick={() => setSelectedTemplate(null)}
              >
                <div className={styles.templateIcon}>🎓</div>
                <div>
                  <h3>Blank School</h3>
                  <p>Start from scratch with a blank school</p>
                </div>
              </div>
              
              {businessTemplates
                .filter(t => t.type === 'SCHOOL')
                .map(template => (
                  <div
                    key={template.id}
                    className={`${styles.templateCard} ${selectedTemplate?.id === template.id ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setSchoolName(template.data.schoolName || '')
                      setSchoolAbout(template.data.schoolAbout || '')
                      setSchoolImage(template.data.schoolImage || '')
                    }}
                  >
                    <div className={styles.templateIcon}>{template.icon}</div>
                    <div>
                      <h3>{template.name}</h3>
                      <span className={styles.category}>{template.category}</span>
                      <p>{template.description}</p>
                      {template.sampleContent && (
                        <span className={styles.meta}>📚 {template.sampleContent.length} sample content</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {wizard.currentStep === 'profile' && (
          <div className={styles.stepContent}>
            <h2>School Profile</h2>
            <p>Tell students about your school</p>
            
            <form onSubmit={handleSave} className={styles.form}>
              <div className="form-group">
                <label>School Name *</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g., Web Development Academy"
                  required
                />
              </div>
              <div className="form-group">
                <label>About Your School</label>
                <textarea
                  value={schoolAbout}
                  onChange={e => setSchoolAbout(e.target.value)}
                  placeholder="Describe what your school is about..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Cover Image URL</label>
                <input
                  type="url"
                  value={schoolImage}
                  onChange={e => setSchoolImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {schoolImage && (
                  <div className={styles.imagePreview}>
                    <img src={schoolImage} alt="Preview" />
                  </div>
                )}
              </div>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </form>
          </div>
        )}

        {wizard.currentStep === 'content' && (
          <div className={styles.stepContent}>
            <h2>Add Content</h2>
            <p>Add courses, resources, and materials for your students</p>
            
            {selectedTemplate && !hasSchool && (
              <div className={styles.templatePrompt}>
                <p>This template includes sample content. Add them now?</p>
                <Button onClick={handleAddSampleContent} variant="primary" disabled={saving}>
                  {saving ? 'Adding...' : `Add ${selectedTemplate.sampleContent?.length || 0} Sample Content`}
                </Button>
              </div>
            )}
            
            <p className={styles.info}>💡 You can add more content after publishing your school.</p>
          </div>
        )}

        {wizard.currentStep === 'pricing' && (
          <div className={styles.stepContent}>
            <h2>Pricing Setup</h2>
            <p>Configure pricing for your content</p>
            <div className={styles.infoBox}>
              <p>💡 You can set individual prices for each content item when creating them.</p>
              <p>Options: Free, Paid, Subscription-based</p>
              <p>Supported payment methods: PayPal, Card, Crypto</p>
            </div>
          </div>
        )}

        {wizard.currentStep === 'review' && (
          <div className={styles.stepContent}>
            <h2>Review & Publish</h2>
            <p>Review your school details before publishing</p>
            
            <div className={styles.reviewSection}>
              <h3>School Profile</h3>
              <p><strong>Name:</strong> {schoolName}</p>
              <p><strong>About:</strong> {schoolAbout}</p>
              {schoolImage && <img src={schoolImage} alt="School" className={styles.reviewImage} />}
            </div>
            
            {selectedTemplate?.sampleContent && (
              <div className={styles.reviewSection}>
                <h3>Sample Content ({selectedTemplate.sampleContent.length})</h3>
                <ul className={styles.reviewList}>
                  {selectedTemplate.sampleContent.map((content, i) => (
                    <li key={i}>{content.title} {content.price ? `- $${content.price}` : '- Free'}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </FormWizard>
    </div>
  )
}

export default function SchoolSetupPage() {
  return (
    <Suspense fallback={<Skeleton width="100%" height="2rem" />}>
      <SchoolSetupContent />
    </Suspense>
  )
}
