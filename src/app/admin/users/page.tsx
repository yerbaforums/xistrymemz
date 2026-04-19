'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  verificationLevel: string
  reputationScore: number
  balance: number
  location: string | null
  verifiedEmail: boolean
  verifiedPhone: boolean
  verifiedIdentity: boolean
  verifiedAddress: boolean
  createdAt: string
  _count: {
    plans: number
    requests: number
    sentConnections: number
    receivedConnections: number
  }
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        limit: '50',
        ...(search ? { search } : {}),
        ...(roleFilter !== 'ALL' ? { role: roleFilter } : {})
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data: UsersResponse = await res.json()
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1)
  }, [roleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(1)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>User Management</h1>
          <p className={styles.subtitle}>{total} total users</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admins</option>
          <option value="USER">Users</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : users.length === 0 ? (
        <div className={styles.empty}>No users found</div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>Reputation</th>
                  <th>Balance</th>
                  <th>Activity</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {user.image ? (
                            <Image src={user.image} alt={user.name || 'User'} fill sizes="32px" />
                          ) : (
                            <span>{(user.name?.[0] || user.email[0]).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.userDetail}>
                          <span className={styles.userName}>{user.name || '—'}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${user.role === 'ADMIN' ? styles.admin : styles.userRole}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className={styles.verification}>
                        <span className={styles.verifyBadge} data-verified={user.verifiedEmail}>📧</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedPhone}>📱</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedIdentity}>🪪</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedAddress}>📍</span>
                        <span className={styles.verifyLevel}>{user.verificationLevel}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.reputation}>{user.reputationScore.toFixed(1)}</span>
                    </td>
                    <td>
                      <span className={styles.balance}>${user.balance.toFixed(2)}</span>
                    </td>
                    <td>
                      <div className={styles.activity}>
                        <span>{user._count.plans} plans</span>
                        <span>{user._count.requests} reqs</span>
                        <span>{user._count.sentConnections + user._count.receivedConnections} conn</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.date}>{formatDate(user.createdAt)}</span>
                    </td>
                    <td>
                      {user.role === 'ADMIN' ? (
                        <button
                          onClick={() => handleRoleChange(user.id, 'USER')}
                          disabled={updating === user.id}
                          className={styles.demoteBtn}
                        >
                          {updating === user.id ? '...' : 'Demote'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(user.id, 'ADMIN')}
                          disabled={updating === user.id}
                          className={styles.promoteBtn}
                        >
                          {updating === user.id ? '...' : 'Promote'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => fetchUsers(page - 1)}
                disabled={page <= 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchUsers(page + 1)}
                disabled={page >= totalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}