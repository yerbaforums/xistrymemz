'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { businessTemplates, getTemplatesByType, type BusinessTemplate } from '@/lib/templates'
import { eventTemplates, type EventTemplate } from '@/lib/event-templates'

type FilterType = 'ALL' | 'SHOP' | 'SCHOOL' | 'COURIER' | 'EVENTS'

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div style={{padding: '40px', textAlign: 'center'}}>Loading templates...</div>}>
      <TemplatesPageContent />
    </Suspense>
  )
}

function TemplatesPageContent() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')?.toUpperCase() as FilterType | null
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    filterParam && ['ALL', 'SHOP', 'SCHOOL', 'COURIER', 'EVENTS'].includes(filterParam)
      ? filterParam
      : 'ALL'
  )

  useEffect(() => {
    if (filterParam && ['ALL', 'SHOP', 'SCHOOL', 'COURIER', 'EVENTS'].includes(filterParam)) {
      setActiveFilter(filterParam)
    }
  }, [filterParam])
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessTemplate | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventTemplate | null>(null)

  const isEventFilter = activeFilter === 'EVENTS'

  const filteredBusinesses = isEventFilter ? [] : (
    activeFilter === 'ALL' 
      ? businessTemplates 
      : getTemplatesByType(activeFilter)
  )

  const filteredEvents = isEventFilter ? eventTemplates : (
    activeFilter === 'ALL' ? eventTemplates : []
  )

  const selectBusiness = (t: BusinessTemplate) => {
    setSelectedBusiness(t)
    setSelectedEvent(null)
  }

  const selectEvent = (t: EventTemplate) => {
    setSelectedEvent(t)
    setSelectedBusiness(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>Templates</h1>
        <p className={styles.subtitle}>
          Choose a pre-built template to quickly set up your business or event
        </p>
      </div>

      <div className={styles.filters}>
        {(['ALL', 'SHOP', 'SCHOOL', 'COURIER', 'EVENTS'] as const).map(filter => (
          <button
            key={filter}
            className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterActive : ''}`}
            onClick={() => { setActiveFilter(filter); setSelectedBusiness(null); setSelectedEvent(null) }}
          >
            {filter === 'ALL' ? 'All Templates' : filter === 'EVENTS' ? 'Events' : filter.charAt(0) + filter.slice(1).toLowerCase() + 's'}
          </button>
        ))}
      </div>

      <div className={styles.templateGrid}>
        {filteredBusinesses.map(template => (
          <div 
            key={template.id} 
            className={`${styles.templateCard} ${selectedBusiness?.id === template.id ? styles.selected : ''}`}
            onClick={() => selectBusiness(template)}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h3>{template.name}</h3>
              <span className={styles.category}>{template.category}</span>
              <p>{template.description}</p>
              <div className={styles.templateMeta}>
                <span>⏱️ {template.estimatedTime}</span>
                {template.sampleProducts && (
                  <span>📦 {template.sampleProducts.length} sample products</span>
                )}
                {template.sampleContent && (
                  <span>📚 {template.sampleContent.length} sample content</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredEvents.map(template => (
          <div 
            key={template.id} 
            className={`${styles.templateCard} ${selectedEvent?.id === template.id ? styles.selected : ''}`}
            onClick={() => selectEvent(template)}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h3>{template.name}</h3>
              <span className={styles.category}>{template.category}</span>
              <p>{template.description}</p>
              <div className={styles.templateMeta}>
                <span>⏱️ {template.suggestedDuration}</span>
                <span>👥 up to {template.suggestedMaxJoiners}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedBusiness && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedBusiness.icon} {selectedBusiness.name}</h2>
            <button 
              className={styles.closeBtn}
              onClick={() => setSelectedBusiness(null)}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.previewContent}>
            <p><strong>Category:</strong> {selectedBusiness.category}</p>
            <p><strong>Description:</strong> {selectedBusiness.description}</p>
            
            {selectedBusiness.data.shopName && (
              <div className={styles.previewSection}>
                <h4>Shop Details</h4>
                <p><strong>Name:</strong> {selectedBusiness.data.shopName}</p>
                <p><strong>About:</strong> {selectedBusiness.data.shopAbout}</p>
              </div>
            )}
            
            {selectedBusiness.data.schoolName && (
              <div className={styles.previewSection}>
                <h4>School Details</h4>
                <p><strong>Name:</strong> {selectedBusiness.data.schoolName}</p>
                <p><strong>About:</strong> {selectedBusiness.data.schoolAbout}</p>
              </div>
            )}
            
            {selectedBusiness.data.serviceName && (
              <div className={styles.previewSection}>
                <h4>Service Details</h4>
                <p><strong>Name:</strong> {selectedBusiness.data.serviceName}</p>
                <p><strong>Type:</strong> {selectedBusiness.data.serviceType}</p>
                <p><strong>Base Price:</strong> ${selectedBusiness.data.basePrice}</p>
                <p><strong>Per Mile:</strong> ${selectedBusiness.data.pricePerMile}</p>
              </div>
            )}
            
            {selectedBusiness.sampleProducts && (
              <div className={styles.previewSection}>
                <h4>Sample Products ({selectedBusiness.sampleProducts.length})</h4>
                {selectedBusiness.sampleProducts.map((product, i) => (
                  <div key={i} className={styles.previewItem}>
                    <p><strong>{product.title}</strong> - ${product.price}</p>
                    <p className={styles.previewItemDesc}>{product.description}</p>
                  </div>
                ))}
              </div>
            )}
            
            {selectedBusiness.sampleContent && (
              <div className={styles.previewSection}>
                <h4>Sample Content ({selectedBusiness.sampleContent.length})</h4>
                {selectedBusiness.sampleContent.map((content, i) => (
                  <div key={i} className={styles.previewItem}>
                    <p><strong>{content.title}</strong> {content.price ? `- $${content.price}` : '- Free'}</p>
                    <p className={styles.previewItemDesc}>{content.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.previewActions}>
            <Link 
              href={`/shop/setup?template=${selectedBusiness.id}`}
              className="btn-primary"
              style={{display: selectedBusiness.type === 'SHOP' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
            <Link 
              href={`/school/setup?template=${selectedBusiness.id}`}
              className="btn-primary"
              style={{display: selectedBusiness.type === 'SCHOOL' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
            <Link 
              href={`/courier/setup?template=${selectedBusiness.id}`}
              className="btn-primary"
              style={{display: selectedBusiness.type === 'COURIER' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedEvent.icon} {selectedEvent.name}</h2>
            <button 
              className={styles.closeBtn}
              onClick={() => setSelectedEvent(null)}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.previewContent}>
            <p><strong>Category:</strong> {selectedEvent.category}</p>
            <p><strong>Duration:</strong> {selectedEvent.suggestedDuration}</p>
            <p><strong>Max Attendees:</strong> {selectedEvent.suggestedMaxJoiners}</p>
            <p><strong>Suggested Location:</strong> {selectedEvent.suggestedLocation || 'Any'}</p>
            <p><strong>Description:</strong> {selectedEvent.description}</p>
            
            <div className={styles.previewSection}>
              <h4>Suggested Description</h4>
              <p className={styles.previewItemDesc}>{selectedEvent.suggestedDescription}</p>
            </div>

            {selectedEvent.tags.length > 0 && (
              <div className={styles.previewSection}>
                <h4>Tags</h4>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                  {selectedEvent.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.suggestedVolunteerRoles.length > 0 && (
              <div className={styles.previewSection}>
                <h4>Suggested Volunteer Roles ({selectedEvent.suggestedVolunteerRoles.length})</h4>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                  {selectedEvent.suggestedVolunteerRoles.map((role, i) => (
                    <span key={i} className={styles.tag}>🙋 {role}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.previewActions}>
            <Link 
              href={`/events/new?template=${selectedEvent.id}`}
              className="btn-primary"
            >
              Use This Template →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
