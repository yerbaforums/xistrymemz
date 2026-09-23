'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import RequestForm from '@/components/RequestForm'
import Breadcrumbs from '@/components/Breadcrumbs'
import NextStepsSheet from '@/components/NextStepsSheet'
import type { RequestFormData } from '@/types/request'

export default function NewRequestPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdTitle, setCreatedTitle] = useState('')

  const projectId = (() => {
    try {
      return new URLSearchParams(window.location.search).get('projectId')
    } catch {
      return null
    }
  })()

  const handleSubmit = async (data: RequestFormData) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        imageUrl: data.images[0] || null,
        category: data.category,
        priority: data.priority,
        budget: data.budget ? parseFloat(data.budget) : null,
        goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : null,
        location: data.location || null,
        isPublic: data.isPublic,
        allowFulfillments: data.allowFulfillments,
        showDonationAddress: data.showDonationAddress,
        hashtags: data.hashtags,
        customFields: (data.customFields || []).length > 0 ? data.customFields : undefined,
        ...(projectId ? { projectId } : {}),
      })
    })
    if (res.ok) {
      const created = await res.json()
      const id = created?.id || created?.data?.id
      success('Request created!')
      if (id) {
        setCreatedId(id)
        setCreatedTitle(data.title)
      } else {
        router.push('/requests')
      }
    } else {
      const err = await res.json()
      toastError(err.error || 'Failed to create request')
    }
  }

  return (
    <div className="page-container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Requests', href: '/requests' }, { label: 'New Request' }]} />
      <Link href="/requests" className="back-link">← Back to Requests</Link>
      <h1>New Request</h1>
      {projectId && <p role="status">🔗 Will link to project on create.</p>}
      <div className="form-card">
        <RequestForm onSubmit={handleSubmit} />
      </div>
      {createdId && (
        <NextStepsSheet
          open={true}
          entityType="REQUEST"
          entityId={createdId}
          title={createdTitle || 'Request'}
          detailUrl={`/requests/${createdId}`}
          extraAction={{ label: '🚀 Start a project from this request', href: `/projects/new?fromRequest=${createdId}` }}
          onClose={() => setCreatedId(null)}
          onView={() => router.push(`/requests/${createdId}`)}
        />
      )}
    </div>
  )
}
