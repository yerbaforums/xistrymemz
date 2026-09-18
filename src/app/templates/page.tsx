'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import {
  businessTemplates,
  channelTemplates,
  getTemplatesByType,
  getChannelTemplatesByType,
  type BusinessTemplate,
  type ChannelTemplate,
} from '@/lib/templates'
import { eventTemplates, type EventTemplate } from '@/lib/event-templates'
import { useQuickCreate } from '@/components/QuickCreateModal'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'
import Loading from '@/components/Loading'
import { useToast } from '@/context/ToastContext'

const CHANNEL_FILTERS = ['ALL', 'SHOP', 'SCHOOL', 'COURIER', 'EVENTS', 'PRODUCT', 'SERVICE', 'PROJECT', 'GROUP', 'REQUEST'] as const
type FilterType = (typeof CHANNEL_FILTERS)[number]

export default function TemplatesPage() {
  return (
    <Suspense fallback={<Loading size="medium" message="Loading templates..." />}>
      <TemplatesPageContent />
    </Suspense>
  )
}

function TemplatesPageContent() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')?.toUpperCase() as FilterType | null
  const { success } = useToast()
  const { open: openQuickCreate } = useQuickCreate()
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    filterParam && CHANNEL_FILTERS.includes(filterParam) ? filterParam : 'ALL'
  )

  useEffect(() => {
    if (filterParam && CHANNEL_FILTERS.includes(filterParam)) {
      setActiveFilter(filterParam)
    }
  }, [filterParam])
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessTemplate | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventTemplate | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelTemplate | null>(null)

  const isEventFilter = activeFilter === 'EVENTS'
  const isChannelFilter = activeFilter === 'PRODUCT' || activeFilter === 'SERVICE' || activeFilter === 'PROJECT' || activeFilter === 'GROUP' || activeFilter === 'REQUEST'

  const filteredBusinesses = isEventFilter || isChannelFilter ? [] : (
    activeFilter === 'ALL'
      ? businessTemplates
      : getTemplatesByType(activeFilter)
  )

  const filteredEvents = isEventFilter ? eventTemplates : (
    activeFilter === 'ALL' ? eventTemplates : []
  )

  const filteredChannels = isChannelFilter ? getChannelTemplatesByType(activeFilter) : (
    activeFilter === 'ALL' ? channelTemplates : []
  )

  const selectBusiness = (t: BusinessTemplate) => {
    setSelectedBusiness(t)
    setSelectedEvent(null)
    setSelectedChannel(null)
  }

  const selectEvent = (t: EventTemplate) => {
    setSelectedEvent(t)
    setSelectedBusiness(null)
    setSelectedChannel(null)
  }

  const selectChannel = (t: ChannelTemplate) => {
    setSelectedChannel(t)
    setSelectedBusiness(null)
    setSelectedEvent(null)
  }

  const launchChannelTemplate = (t: ChannelTemplate) => {
    openQuickCreate(t.tab, t.data)
    success(`Opened ${t.name} starter — fill in your details!`)
    setSelectedChannel(null)
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Templates' },
      ]} />
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>Templates</h1>
        <p className={styles.subtitle}>
          Choose a pre-built template to quickly set up your shop, school, courier service, event, product, service, project, group, or request
        </p>
      </div>

      <div className={styles.filters}>
        {CHANNEL_FILTERS.map(filter => (
          <Button
            key={filter}
            className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterActive : ''}`}
            onClick={() => { setActiveFilter(filter); setSelectedBusiness(null); setSelectedEvent(null); setSelectedChannel(null) }}
          >
            {filter === 'ALL' ? 'All Templates' : filter === 'EVENTS' ? 'Events' : filter === 'PRODUCT' ? 'Products' : filter === 'SERVICE' ? 'Services' : filter === 'PROJECT' ? 'Projects' : filter === 'GROUP' ? 'Groups' : filter === 'REQUEST' ? 'Requests' : filter.charAt(0) + filter.slice(1).toLowerCase() + 's'}
          </Button>
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
        {filteredChannels.map(template => (
          <div
            key={template.id}
            className={`${styles.templateCard} ${selectedChannel?.id === template.id ? styles.selected : ''}`}
            onClick={() => selectChannel(template)}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h3>{template.name}</h3>
              <span className={styles.category}>{template.category}</span>
              <p>{template.description}</p>
              <div className={styles.templateMeta}>
                <span>⏱️ {template.estimatedTime}</span>
                {template.sampleItems && (
                  <span>✨ {template.sampleItems.length} suggested fields</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedBusiness && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedBusiness.icon} {selectedBusiness.name}</h2>
            <Button 
              className={styles.closeBtn}
              onClick={() => setSelectedBusiness(null)}
            >
              ✕
            </Button>
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
            <Link href={`/shop/setup?template=${selectedBusiness.id}`} style={{display: selectedBusiness.type === 'SHOP' ? 'inline-flex' : 'none'}}>
              <Button variant="primary">Use This Template →</Button>
            </Link>
            <Link href={`/school/setup?template=${selectedBusiness.id}`} style={{display: selectedBusiness.type === 'SCHOOL' ? 'inline-flex' : 'none'}}>
              <Button variant="primary">Use This Template →</Button>
            </Link>
            <Link href={`/courier/setup?template=${selectedBusiness.id}`} style={{display: selectedBusiness.type === 'COURIER' ? 'inline-flex' : 'none'}}>
              <Button variant="primary">Use This Template →</Button>
            </Link>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedEvent.icon} {selectedEvent.name}</h2>
            <Button 
              className={styles.closeBtn}
              onClick={() => setSelectedEvent(null)}
            >
              ✕
            </Button>
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
            <Link href={`/events/new?template=${selectedEvent.id}`}>
              <Button variant="primary">Use This Template →</Button>
            </Link>
          </div>
        </div>
      )}

      {selectedChannel && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedChannel.icon} {selectedChannel.name}</h2>
            <Button
              className={styles.closeBtn}
              onClick={() => setSelectedChannel(null)}
            >
              ✕
            </Button>
          </div>

          <div className={styles.previewContent}>
            <p><strong>Category:</strong> {selectedChannel.category}</p>
            <p><strong>Description:</strong> {selectedChannel.description}</p>

            <div className={styles.previewSection}>
              <h4>Starter Details</h4>
              {(selectedChannel.data.title || selectedChannel.data.name) && (
                <p><strong>Title:</strong> {selectedChannel.data.title || selectedChannel.data.name}</p>
              )}
              {selectedChannel.data.description && (
                <p><strong>Suggested description:</strong> {selectedChannel.data.description}</p>
              )}
              {selectedChannel.data.price && <p><strong>Price:</strong> ${selectedChannel.data.price}</p>}
              {selectedChannel.data.duration && <p><strong>Duration:</strong> {selectedChannel.data.duration} min</p>}
              {selectedChannel.data.goalAmount && <p><strong>Goal:</strong> ${selectedChannel.data.goalAmount}</p>}
              {selectedChannel.data.budget && <p><strong>Budget:</strong> ${selectedChannel.data.budget}</p>}
              {selectedChannel.data.volunteerRoles && (
                <p><strong>Volunteer roles:</strong> {selectedChannel.data.volunteerRoles}</p>
              )}
            </div>

            {selectedChannel.sampleItems && (
              <div className={styles.previewSection}>
                <h4>What to fill in ({selectedChannel.sampleItems.length})</h4>
                {selectedChannel.sampleItems.map((item, i) => (
                  <div key={i} className={styles.previewItem}>
                    <p><strong>{item.label}</strong> — {item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.previewActions}>
            <Button variant="primary" onClick={() => launchChannelTemplate(selectedChannel)}>
              Use This Template →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
