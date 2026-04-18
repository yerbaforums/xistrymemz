'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './profile.module.css'
import Rating from '@/components/Rating'

interface ProfileUser {
  id: string
  name: string | null
  email: string
  image: string | null
  coverImage: string | null
  bio: string | null
  location: string | null
  website: string | null
  userClass: string | null
  shopName: string | null
  shopSlug: string | null
  schoolName: string | null
  schoolSlug: string | null
  createdAt: string
  earthId: string | null
  verificationLevel: string
  reputationScore: number
  verifiedEmail: boolean
  verifiedPhone: boolean
  verifiedIdentity: boolean
  verifiedAddress: boolean
  planCount: number
  postCount: number
  productCount: number
  connectionCount: number
  isConnected: boolean
  hasPendingRequest: boolean
  connectionId: string | null
}

interface Post {
  id: string
  content: string
  imageUrl: string | null
  pinned: boolean
  likes: number
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface Plan {
  id: string
  title: string
  status: string
  published: boolean
  pinned: boolean
  createdAt: string
}

interface Product {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
  type: string
  pinned: boolean
  createdAt: string
}

interface Connection {
  id: string
  name: string | null
  email: string
  image: string | null
  userClass: string | null
}

interface UserGroup {
  id: string
  name: string
  imageUrl: string | null
  memberCount: number
  role: string
  joinedAt: string
}

const USER_CLASSES = [
  'Healer',
  'Revealer',
  'Seer',
  'Teacher',
  'Guide',
  'Warrior',
  'Guardian',
  'Sage',
  'Mystic',
  'Architect',
  'Artist',
  'Builder',
  'Explorer',
  'Mentor'
]

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'plans' | 'connections' | 'groups' | 'shop' | 'school' | 'about'>('posts')
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    image: '',
    coverImage: '',
    userClass: ''
  })
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectMessage, setConnectMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  const getTargetId = () => {
    if (params.id) {
      return Array.isArray(params.id) ? params.id[0] : params.id
    }
    return session?.user?.id || ''
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      const targetId = getTargetId()
      setIsOwnProfile(targetId === session.user.id || !params.id)
      fetchProfile(targetId)
    }
  }, [session, params.id])

  const fetchProfile = async (targetId: string) => {
    try {
      const res = await fetch(`/api/users/${targetId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setPosts(data.posts || [])
        setPlans(data.plans || [])
        setProducts(data.products || [])
        setConnections(data.connections || [])
        setGroups(data.groups || [])
        setEditForm({
          name: data.user.name || '',
          bio: data.user.bio || '',
          location: data.user.location || '',
          website: data.user.website || '',
          image: data.user.image || '',
          coverImage: data.user.coverImage || '',
          userClass: data.user.userClass || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      if (res.ok) {
        setEditMode(false)
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return

    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost })
      })

      if (res.ok) {
        setNewPost('')
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handlePin = async (type: string, id: string, currentPinned: boolean) => {
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, pinned: !currentPinned })
      })
      if (res.ok) {
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error pinning item:', error)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/community/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receiverId: getTargetId(),
          message: connectMessage || undefined
        })
      })
      
      if (res.ok) {
        setShowConnectModal(false)
        setConnectMessage('')
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error connecting:', error)
    } finally {
      setConnecting(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading profile...</div></div>
  }

  if (!user) {
    return <div className={styles.container}><div className={styles.notFound}>User not found</div></div>
  }

  const userClasses = user.userClass ? user.userClass.split(',').map(c => c.trim()).filter(Boolean) : []

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div 
          className={styles.coverImage}
          style={{ backgroundImage: user.coverImage ? `url(${user.coverImage})` : undefined }}
        >
          {!user.coverImage && <div className={styles.coverPlaceholder} />}
        </div>
        
        <div className={styles.profileContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {user.image ? (
                <Image src={user.image} alt={user.name || 'User'} fill />
              ) : (
                <span>{user.name?.[0] || user.email[0].toUpperCase()}</span>
              )}
            </div>
          </div>
          
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              {editMode ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={styles.editInput}
                  placeholder="Display name"
                />
              ) : (
                <h1>{user.name || 'Anonymous User'}</h1>
              )}
            </div>
            
            {userClasses.length > 0 && (
              <div className={styles.classes}>
                {userClasses.map(cls => (
                  <span key={cls} className={styles.classBadge}>{cls}</span>
                ))}
              </div>
            )}
            
            <div className={styles.meta}>
              {user.location && (
                <span className={styles.metaItem}>
                  <span>📍</span> {user.location}
                </span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                  <span>🔗</span> {user.website.replace(/^https?:\/\//, '')}
                </a>
              )}
<span className={styles.metaItem}>
                  <span>📅</span> Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className={styles.passportSection}>
                <div className={styles.passportHeader}>
                  <span className={styles.passportIcon}>🌍</span>
                  <span className={styles.passportTitle}>Earth Passport</span>
                  {(user.earthId || user.verificationLevel !== 'NONE') && (
                    <span className={`${styles.verificationBadge} ${styles[user.verificationLevel.toLowerCase()]}`}>
                      {user.verificationLevel}
                    </span>
                  )}
                </div>
                {user.earthId && (
                  <div className={styles.passportId}>
                    <span className={styles.passportIdLabel}>Passport ID</span>
                    <span className={styles.passportIdValue}>{user.earthId}</span>
                  </div>
                )}
                {user.reputationScore > 0 && (
                  <div className={styles.reputationScore}>
                    <span className={styles.reputationLabel}>Reputation</span>
                    <div className={styles.reputationBar}>
                      <div 
                        className={styles.reputationFill} 
                        style={{ width: `${Math.min(user.reputationScore, 100)}%` }}
                      />
                    </div>
                    <span className={styles.reputationValue}>{user.reputationScore.toFixed(0)}</span>
                  </div>
                )}
                <div className={styles.verificationBadges}>
                  {user.verifiedEmail && <span className={styles.vBadge}>✓ Email</span>}
                  {user.verifiedPhone && <span className={styles.vBadge}>✓ Phone</span>}
                  {user.verifiedIdentity && <span className={styles.vBadge}>✓ ID</span>}
                  {user.verifiedAddress && <span className={styles.vBadge}>✓ Address</span>}
                </div>
              </div>

              <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.postCount}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.planCount}</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.productCount}</span>
                <span className={styles.statLabel}>Listings</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.connectionCount}</span>
                <span className={styles.statLabel}>Connections</span>
              </div>
            </div>

            {!isOwnProfile && (
              <div className={styles.ratingSection}>
                <Rating userId={user.id} type="SELLER" />
              </div>
            )}
          </div>
          
          <div className={styles.actions}>
            {isOwnProfile ? (
              editMode ? (
                <>
                  <button onClick={handleUpdateProfile} className={styles.saveBtn}>Save</button>
                  <button onClick={() => setEditMode(false)} className={styles.cancelBtn}>Cancel</button>
                </>
              ) : (
                <button onClick={() => { setEditMode(true); setActiveTab('about'); }} className={styles.editBtn}>Edit Profile</button>
              )
            ) : (
              <>
                <Link href={`/messages?user=${user.id}`} className={styles.messageBtn}>Message</Link>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  disabled={user.isConnected || user.hasPendingRequest}
                  className={`${styles.connectBtn} ${user.isConnected ? styles.connected : ''}`}
                >
                  {user.isConnected ? 'Connected' : user.hasPendingRequest ? 'Pending' : 'Connect'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts ({posts.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'plans' ? styles.active : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Projects ({plans.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'connections' ? styles.active : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections ({connections.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups ({groups.length})
        </button>
        {products.length > 0 && (
          <button 
            className={`${styles.tab} ${activeTab === 'shop' ? styles.active : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            Shop ({products.length})
          </button>
        )}
        {(user.schoolName || user.schoolSlug) && (
          <button 
            className={`${styles.tab} ${activeTab === 'school' ? styles.active : ''}`}
            onClick={() => setActiveTab('school')}
          >
            School
          </button>
        )}
        <button 
          className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'posts' && (
          <div className={styles.postsSection}>
            {isOwnProfile && (
              <form onSubmit={handleCreatePost} className={styles.createPost}>
                <div className={styles.postInputWrapper}>
                  <div className={styles.postAvatar}>
                    {session?.user?.image ? (
                      <Image src={session.user.image} alt="" fill />
                    ) : (
                      <span>{session?.user?.name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's on your mind?"
                    className={styles.postInput}
                    rows={3}
                  />
                </div>
                <div className={styles.postActions}>
                  <span className={styles.charCount}>{newPost.length}/2000</span>
                  <button type="submit" disabled={posting || !newPost.trim()} className={styles.postBtn}>
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            )}

            {posts.length > 0 ? (
              <div className={styles.postsList}>
                {posts.map((post) => (
                  <div key={post.id} className={`${styles.postCard} ${post.pinned ? styles.pinnedCard : ''}`}>
                    <div className={styles.postHeader}>
                      <div className={styles.postAuthor}>
                        <div className={styles.postAvatarSmall}>
                          {post.user.image ? (
                            <Image src={post.user.image} alt="" fill />
                          ) : (
                            <span>{post.user.name?.[0] || 'U'}</span>
                          )}
                        </div>
                        <div>
                          <span className={styles.postAuthorName}>
                            {post.pinned && <span className={styles.pinnedBadge}>📌</span>}
                            {post.user.name || 'Anonymous'}
                          </span>
                          <span className={styles.postDate}>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {isOwnProfile && (
                        <div className={styles.postActions}>
                          <button 
                            onClick={() => handlePin('post', post.id, post.pinned)} 
                            className={styles.pinBtn}
                            title={post.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            {post.pinned ? '📌' : '📍'}
                          </button>
                          <button onClick={() => handleDeletePost(post.id)} className={styles.deletePost}>
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    <div className={styles.postFooter}>
                      <span className={styles.postLikes}>♥ {post.likes} likes</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No posts yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className={styles.plansSection}>
            {plans.length > 0 ? (
              <div className={styles.plansGrid}>
                {plans.map((plan) => (
                  <div key={plan.id} className={`${styles.planCard} ${plan.pinned ? styles.pinnedCard : ''}`}>
                    {isOwnProfile && (
                      <button 
                        onClick={() => handlePin('plan', plan.id, plan.pinned)} 
                        className={styles.cardPinBtn}
                        title={plan.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {plan.pinned ? '📌' : '📍'}
                      </button>
                    )}
                    <Link href={`/plans/${plan.id}`} className={styles.planCardLink}>
                      <h3>
                        {plan.pinned && <span className={styles.pinnedBadge}>📌</span>}
                        {plan.title}
                      </h3>
                      <span className={`${styles.planStatus} ${styles[plan.status.toLowerCase()]}`}>
                        {plan.status}
                      </span>
                      <p>Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No plans yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className={styles.connectionsSection}>
            {connections.length > 0 ? (
              <div className={styles.connectionsGrid}>
                {connections.map((conn) => (
                  <Link key={conn.id} href={`/profile/${conn.id}`} className={styles.connectionCard}>
                    <div className={styles.connectionAvatar}>
                      {conn.image ? (
                        <Image src={conn.image} alt={conn.name || 'User'} fill />
                      ) : (
                        <span>{conn.name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div className={styles.connectionInfo}>
                      <h4>{conn.name || 'Anonymous User'}</h4>
                      {conn.userClass && <p className={styles.connectionClass}>{conn.userClass}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No connections yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className={styles.groupsSection}>
            {groups.length > 0 ? (
              <div className={styles.groupsGrid}>
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                    <div className={styles.groupIcon}>
                      {group.imageUrl ? (
                        <Image src={group.imageUrl} alt={group.name} fill style={{objectFit: 'cover'}} />
                      ) : (
                        <span>👥</span>
                      )}
                    </div>
                    <div className={styles.groupInfo}>
                      <h4>{group.name}</h4>
                      <p className={styles.groupMeta}>
                        <span>👥 {group.memberCount} members</span>
                        {group.role === 'ADMIN' && <span className={styles.adminBadge}>Admin</span>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>{isOwnProfile ? "You haven't joined any groups yet." : `${user.name || 'This user'} hasn't joined any groups yet.`}</p>
                {isOwnProfile && (
                  <Link href="/groups" className={styles.browseGroupsLink}>
                    Browse Groups →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className={styles.shopSection}>
            {user.shopSlug && (
              <Link href={`/shop/${user.shopSlug}`} className={styles.viewShopLink}>
                View Full Shop →
              </Link>
            )}
            {products.length > 0 ? (
              <div className={styles.productsGrid}>
                {products.map((product) => (
                  <div key={product.id} className={`${styles.productCard} ${product.pinned ? styles.pinnedCard : ''}`}>
                    {isOwnProfile && (
                      <button 
                        onClick={() => handlePin('product', product.id, product.pinned)} 
                        className={styles.cardPinBtn}
                        title={product.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {product.pinned ? '📌' : '📍'}
                      </button>
                    )}
                    <Link href={`/products/${product.id}`} className={styles.productCardLink}>
                      {product.imageUrl && (
                        <div className={styles.productImage}>
                          <Image src={product.imageUrl} alt={product.title} fill style={{objectFit: 'cover'}} />
                        </div>
                      )}
                      <div className={styles.productInfo}>
                        <span className={`badge badge-${product.type.toLowerCase()}`}>
                          {product.pinned && '📌 '}{product.type}
                        </span>
                        <h3>{product.title}</h3>
                        {product.price && <p className={styles.productPrice}>${product.price}</p>}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No listings</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'school' && (
          <div className={styles.schoolSection}>
            {user.schoolSlug && (
              <Link href={`/school/${user.schoolSlug}`} className={styles.schoolCard}>
                <h3>{user.schoolName || 'School'}</h3>
                <p>View School Content →</p>
              </Link>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className={styles.aboutSection}>
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Profile Picture URL</label>
                  <input
                    type="url"
                    value={editForm.image}
                    onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Cover Image URL</label>
                  <input
                    type="url"
                    value={editForm.coverImage}
                    onChange={(e) => setEditForm({ ...editForm, coverImage: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>User Class (select multiple)</label>
                  <div className={styles.classGrid}>
                    {USER_CLASSES.map(cls => (
                      <label key={cls} className={styles.classOption}>
                        <input
                          type="checkbox"
                          checked={editForm.userClass.split(',').map(c => c.trim()).includes(cls)}
                          onChange={(e) => {
                            const classes = editForm.userClass.split(',').map(c => c.trim()).filter(Boolean)
                            if (e.target.checked) {
                              if (!classes.includes(cls)) classes.push(cls)
                            } else {
                              const idx = classes.indexOf(cls)
                              if (idx > -1) classes.splice(idx, 1)
                            }
                            setEditForm({ ...editForm, userClass: classes.join(', ') })
                          }}
                        />
                        <span>{cls}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn}>Save Changes</button>
                  <button type="button" onClick={() => setEditMode(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className={styles.aboutBlock}>
                  <h3>Bio</h3>
                  <p>{user.bio || 'No bio provided yet.'}</p>
                </div>
                <div className={styles.aboutBlock}>
                  <h3>Details</h3>
                  <dl>
                    <dt>Location</dt>
                    <dd>{user.location || 'Not specified'}</dd>
                    <dt>Website</dt>
                    <dd>{user.website ? <a href={user.website}>{user.website}</a> : 'Not specified'}</dd>
                    <dt>Member since</dt>
                    <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
                  </dl>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Connect with {user.name || 'User'}</h2>
            <p className={styles.modalDesc}>Send a message with your connection request:</p>
            <div className="form-group">
              <textarea
                value={connectMessage}
                onChange={(e) => setConnectMessage(e.target.value)}
                placeholder="Hi! I'd like to connect with you..."
                rows={4}
                className={styles.messageInput}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowConnectModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                {connecting ? 'Connecting...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
