'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { businessTemplates, getTemplatesByType, type BusinessTemplate } from '@/lib/templates'

export default function TemplatesPage() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SHOP' | 'SCHOOL' | 'COURIER'>('ALL')
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null)

  const filteredTemplates = activeFilter === 'ALL' 
    ? businessTemplates 
    : getTemplatesByType(activeFilter)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>Business Templates</h1>
        <p className={styles.subtitle}>
          Choose a pre-built template to quickly set up your business with example data
        </p>
      </div>

      <div className={styles.filters}>
        {(['ALL', 'SHOP', 'SCHOOL', 'COURIER'] as const).map(filter => (
          <button
            key={filter}
            className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === 'ALL' ? 'All Templates' : filter.charAt(0) + filter.slice(1).toLowerCase() + 's'}
          </button>
        ))}
      </div>

      <div className={styles.templateGrid}>
        {filteredTemplates.map(template => (
          <div 
            key={template.id} 
            className={`${styles.templateCard} ${selectedTemplate?.id === template.id ? styles.selected : ''}`}
            onClick={() => setSelectedTemplate(template)}
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
      </div>

      {selectedTemplate && (
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2>{selectedTemplate.icon} {selectedTemplate.name}</h2>
            <button 
              className={styles.closeBtn}
              onClick={() => setSelectedTemplate(null)}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.previewContent}>
            <p><strong>Category:</strong> {selectedTemplate.category}</p>
            <p><strong>Description:</strong> {selectedTemplate.description}</p>
            
            {selectedTemplate.data.shopName && (
              <div className={styles.previewSection}>
                <h4>Shop Details</h4>
                <p><strong>Name:</strong> {selectedTemplate.data.shopName}</p>
                <p><strong>About:</strong> {selectedTemplate.data.shopAbout}</p>
              </div>
            )}
            
            {selectedTemplate.data.schoolName && (
              <div className={styles.previewSection}>
                <h4>School Details</h4>
                <p><strong>Name:</strong> {selectedTemplate.data.schoolName}</p>
                <p><strong>About:</strong> {selectedTemplate.data.schoolAbout}</p>
              </div>
            )}
            
            {selectedTemplate.data.serviceName && (
              <div className={styles.previewSection}>
                <h4>Service Details</h4>
                <p><strong>Name:</strong> {selectedTemplate.data.serviceName}</p>
                <p><strong>Type:</strong> {selectedTemplate.data.serviceType}</p>
                <p><strong>Base Price:</strong> ${selectedTemplate.data.basePrice}</p>
                <p><strong>Per Mile:</strong> ${selectedTemplate.data.pricePerMile}</p>
              </div>
            )}
            
            {selectedTemplate.sampleProducts && (
              <div className={styles.previewSection}>
                <h4>Sample Products ({selectedTemplate.sampleProducts.length})</h4>
                {selectedTemplate.sampleProducts.map((product, i) => (
                  <div key={i} className={styles.previewItem}>
                    <p><strong>{product.title}</strong> - ${product.price}</p>
                    <p className={styles.previewItemDesc}>{product.description}</p>
                  </div>
                ))}
              </div>
            )}
            
            {selectedTemplate.sampleContent && (
              <div className={styles.previewSection}>
                <h4>Sample Content ({selectedTemplate.sampleContent.length})</h4>
                {selectedTemplate.sampleContent.map((content, i) => (
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
              href={`/shop/setup?template=${selectedTemplate.id}`}
              className="btn-primary"
              style={{display: selectedTemplate.type === 'SHOP' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
            <Link 
              href={`/school/setup?template=${selectedTemplate.id}`}
              className="btn-primary"
              style={{display: selectedTemplate.type === 'SCHOOL' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
            <Link 
              href={`/courier/setup?template=${selectedTemplate.id}`}
              className="btn-primary"
              style={{display: selectedTemplate.type === 'COURIER' ? 'inline-flex' : 'none'}}
            >
              Use This Template →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
