import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCategoryLabel, getAdminGrantablePackages } from '../../lib/packages.js'
import './AdminUser.css'

// Real, purchasable packages an admin can manually grant, grouped by category for the "Add
// Sessions" form's <optgroup>s.
const ADMIN_PACKAGE_OPTIONS = getAdminGrantablePackages()
const ADMIN_PACKAGE_GROUPS = [
  { category: 'interview', label: 'Interview Prep' },
  { category: 'cv', label: 'CV & Strategy' },
  { category: 'advisory', label: 'Advisory' }
].map(group => ({
  ...group,
  packages: ADMIN_PACKAGE_OPTIONS.filter(p => p.category === group.category)
}))

// Interview preference display labels (same values used by Profile.jsx/ProfileSetup.jsx)
const INTERVIEW_LEVEL_LABELS = {
  beginner: 'Beginner',
  mid: 'Intermediate',
  advanced: 'Advanced'
}
const INTERVIEW_STYLE_LABELS = {
  MMI: 'MMI',
  traditional: 'Traditional',
  both: 'Both'
}

export default function AdminUser() {
  const { userId } = useParams()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newResource, setNewResource] = useState({ title: '', url: '', description: '', type: 'article' })
  const [addingResource, setAddingResource] = useState(false)
  const [addingSession, setAddingSession] = useState(false)
  const [newSession, setNewSession] = useState({
    packageId: ADMIN_PACKAGE_OPTIONS[0].packageId,
    sessions: ADMIN_PACKAGE_OPTIONS[0].sessions
  })
  const [editingUser, setEditingUser] = useState(false)
  const [editForm, setEditForm] = useState({ name: '' })

  useEffect(() => {
    if (!authLoading && isAdmin && userId) {
      fetchUser()
    }
  }, [isAdmin, authLoading, userId])

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin?action=getUser&userId=${userId}&googleId=${user?.id || ''}`, {
        headers: {
          'Authorization': `Bearer ${user?.id || ''}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        setEditForm({ name: data.user?.name || '' })
      } else if (response.status === 404) {
        setError('User not found')
      } else if (response.status === 403) {
        setError('Admin access denied')
      } else {
        setError('Failed to load user')
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setError('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const handleAddResource = async () => {
    if (!newResource.title || !newResource.url) return

    // Limit to 10 admin-added resources per user
    const adminResources = (userData?.resources || []).filter(r => r.added_by_admin === true)
    if (adminResources.length >= 10) {
      alert('Maximum of 10 admin-added resources per user')
      return
    }

    try {
      const response = await fetch(`/api/admin?action=resources&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId: userData.id,
          ...newResource,
          addedByAdmin: true
        })
      })

      if (response.ok) {
        setNewResource({ title: '', url: '', description: '', type: 'article' })
        setAddingResource(false)
        fetchUser()
      }
    } catch (err) {
      console.error('Error adding resource:', err)
    }
  }

  const handleRemoveResource = async (resourceId) => {
    if (!confirm('Remove this resource?')) return

    try {
      const response = await fetch(`/api/admin?action=resources&userId=${userData.id}&resourceId=${resourceId}&googleId=${user?.id || ''}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.id || ''}`
        }
      })

      if (response.ok) {
        fetchUser()
      }
    } catch (err) {
      console.error('Error removing resource:', err)
    }
  }

  const handleDeletePackage = async (packageId) => {
    if (!confirm('Delete this package? This will permanently remove it from the user.')) return

    try {
      const response = await fetch(`/api/admin?action=deletePackage&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ userId: userData.id, packageId })
      })

      if (response.ok) {
        fetchUser()
      }
    } catch (err) {
      console.error('Error deleting package:', err)
    }
  }

  const handleAddSession = async () => {
    if (!newSession.packageId || !newSession.sessions || newSession.sessions < 1) return

    try {
      const response = await fetch(`/api/admin?action=addSession&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId: userData.id,
          packageId: newSession.packageId,
          sessions: parseInt(newSession.sessions)
        })
      })

      if (response.ok) {
        setNewSession({ packageId: ADMIN_PACKAGE_OPTIONS[0].packageId, sessions: ADMIN_PACKAGE_OPTIONS[0].sessions })
        setAddingSession(false)
        fetchUser()
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Failed to add session(s). Please try again.')
      }
    } catch (err) {
      console.error('Error adding session:', err)
      alert('Failed to add session(s). Please try again.')
    }
  }

  const handleEditUser = async () => {
    try {
      const response = await fetch(`/api/admin?action=editUser&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId: userData.id,
          name: editForm.name
        })
      })

      if (response.ok) {
        setEditingUser(false)
        fetchUser()
      }
    } catch (err) {
      console.error('Error editing user:', err)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate session stats
  const getSessionStats = () => {
    if (!userData?.purchases) return { remaining: 0, total: 0, used: 0 }
    let remaining = 0, total = 0, used = 0
    userData.purchases.forEach(p => {
      total += p.sessions_total || 0
      used += p.sessions_used || 0
      remaining += (p.sessions_total || 0) - (p.sessions_used || 0)
    })
    return { remaining, total, used }
  }

  // Get all bookings from all packages
  const getAllBookings = () => {
    if (!userData?.purchases) return []
    const bookings = []
    userData.purchases.forEach(pkg => {
      if (pkg.bookings) {
        pkg.bookings.forEach(b => {
          // Prefer the booking's own category (set at booking time); fall back to the parent
          // purchase's category for bookings created before that field existed.
          bookings.push({ ...b, category: b.category || pkg.category })
        })
      }
    })
    return bookings.sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at))
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="admin-page">
        <div className="admin-page-container">
          <div className="admin-loading">Loading...</div>
        </div>
      </div>
    )
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-page-container">
          <div className="admin-access-denied">
            <h2>Access Denied</h2>
            <p>You don't have admin privileges.</p>
            <Link to="/" className="admin-back-btn">← Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-container">
          <div className="admin-loading">Loading user...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-page-container">
          <div className="admin-access-denied">
            <h2>{error}</h2>
            <Link to="/admin" className="admin-back-btn">← Back to Admin</Link>
          </div>
        </div>
      </div>
    )
  }

  const stats = getSessionStats()
  const bookings = getAllBookings()

  return (
    <div className="admin-page admin-user-page">
      <div className="admin-page-container">
        {/* Header */}
        <div className="admin-page-header">
          <Link to="/admin" className="admin-back-link">← Back to All Users</Link>
          <h1>Client Profile</h1>
          <div className="admin-user-info-small">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="admin-avatar-small" />
            )}
            <span>{user?.name}</span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="admin-user-profile-card">
          <div className="profile-header">
            <img 
              src={userData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=0d9488&color=fff&size=120`} 
              alt={userData.name}
              className="profile-avatar-large"
            />
            <div className="profile-header-info">
              {editingUser ? (
                <div className="edit-user-form">
                  <input
                    type="text"
                    placeholder="Name"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <div className="edit-actions">
                    <button className="save-btn" onClick={handleEditUser}>Save</button>
                    <button className="cancel-btn" onClick={() => setEditingUser(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2>
                    {userData.name || 'Unnamed User'}
                    {userData.is_admin && <span className="admin-badge">Admin</span>}
                  </h2>
                  <p className="profile-email">{userData.email}</p>
                  <button className="edit-profile-btn" onClick={() => setEditingUser(true)}>
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-stats-row">
            <div className="profile-stat">
              <span className="stat-value">{stats.remaining}</span>
              <span className="stat-label">Sessions Left</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">{stats.used}</span>
              <span className="stat-label">Sessions Used</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">{bookings.length}</span>
              <span className="stat-label">Total Bookings</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">{formatDateShort(userData.created_at)}</span>
              <span className="stat-label">Member Since</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="admin-user-grid">
          {/* Left Column */}
          <div className="admin-user-column">
            {/* Application Details */}
            <div className="admin-section-card">
              <h3>Application Details</h3>
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-label">Stage:</span>
                  <span className="detail-value">{userData.application_stage || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Level:</span>
                  <span className="detail-value">{INTERVIEW_LEVEL_LABELS[userData.interview_level] || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Interview Style:</span>
                  <span className="detail-value">{INTERVIEW_STYLE_LABELS[userData.interview_style] || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Profile Complete:</span>
                  <span className={`detail-value ${userData.profile_complete ? 'yes' : 'no'}`}>
                    {userData.profile_complete ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>
              
              {userData.main_concerns && (
                <div className="concerns-section">
                  <h4>Main Concerns</h4>
                  <p className="concerns-text">{userData.main_concerns}</p>
                </div>
              )}
            </div>

            {/* Target Schools */}
            <div className="admin-section-card">
              <h3>Target Schools ({userData.target_schools?.length || 0})</h3>
              {userData.target_schools?.length > 0 ? (
                <ul className="schools-list">
                  {userData.target_schools.map((school, idx) => {
                    // Purchases store schools as { name, interviewType, interviewDate }
                    // (camelCase) - school_name/interview_type/interview_date never actually
                    // exist in the DB, so this always rendered blank. Fall back to both, matching
                    // the defensive pattern already used in Profile.jsx.
                    const schoolName = school.name || school.school_name
                    const interviewType = school.interviewType || school.interview_type
                    const interviewDate = school.interviewDate || school.interview_date
                    return (
                      <li key={schoolName || idx}>
                        <span className="school-name">
                          {schoolName || 'Unnamed school'}
                          {interviewType && <span className="school-type"> ({interviewType})</span>}
                        </span>
                        {interviewDate && (
                          <span className="school-date">Interview: {formatDateShort(interviewDate)}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="empty-state">No target schools added</p>
              )}
            </div>

            {/* Resources */}
            <div className="admin-section-card">
              <div className="section-header">
                <h3>Resources ({userData.resources?.length || 0})</h3>
                <button 
                  className="add-btn"
                  onClick={() => setAddingResource(!addingResource)}
                >
                  {addingResource ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {addingResource && (
                <div className="add-form">
                  <input
                    type="text"
                    placeholder="Resource title"
                    value={newResource.title}
                    onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={newResource.url}
                    onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newResource.description}
                    onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                  />
                  <select
                    value={newResource.type}
                    onChange={e => setNewResource({ ...newResource, type: e.target.value })}
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                    <option value="practice_question">Practice Question</option>
                  </select>
                  <button className="save-btn" onClick={handleAddResource}>
                    Add Resource
                  </button>
                </div>
              )}

              {userData.resources?.length > 0 ? (
                <ul className="resources-list">
                  {userData.resources.map((resource) => (
                    <li key={resource.id || resource.url}>
                      <div className="resource-info">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          {resource.title}
                        </a>
                        <span className="resource-type">{resource.resource_type}</span>
                        {resource.added_by_admin && (
                          <span className="admin-added">Admin</span>
                        )}
                      </div>
                      <button 
                        className="remove-btn"
                        onClick={() => handleRemoveResource(resource.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No resources added</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="admin-user-column">
            {/* Packages */}
            <div className="admin-section-card">
              <div className="section-header">
                <h3>Packages ({userData.purchases?.length || 0})</h3>
                <button 
                  className="add-btn"
                  onClick={() => setAddingSession(!addingSession)}
                >
                  {addingSession ? 'Cancel' : '+ Add Sessions'}
                </button>
              </div>

              {addingSession && (
                <div className="add-form add-session-form">
                  <select
                    value={newSession.packageId}
                    onChange={e => {
                      const selected = ADMIN_PACKAGE_OPTIONS.find(p => p.packageId === e.target.value)
                      setNewSession({ packageId: e.target.value, sessions: selected ? selected.sessions : 1 })
                    }}
                  >
                    {ADMIN_PACKAGE_GROUPS.map(group => (
                      group.packages.length > 0 && (
                        <optgroup key={group.category} label={group.label}>
                          {group.packages.map(pkg => (
                            <option key={pkg.packageId} value={pkg.packageId}>{pkg.label}</option>
                          ))}
                        </optgroup>
                      )
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="# Sessions"
                    value={newSession.sessions}
                    onChange={e => setNewSession({ ...newSession, sessions: e.target.value })}
                  />
                  <button className="save-btn" onClick={handleAddSession}>
                    Add
                  </button>
                </div>
              )}

              {userData.purchases?.length > 0 ? (
                <ul className="packages-list">
                  {[...userData.purchases]
                    .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
                    .map((pkg) => (
                    <li key={pkg.id} className="package-item">
                      <div className="package-main">
                        <span className={`package-type-badge ${pkg.duration_minutes === 30 ? 'trial' : 'regular'}`}>
                          {pkg.duration_minutes === 30 ? 'Trial' : 'Regular'}
                        </span>
                        <span className="package-sessions">
                          {(pkg.sessions_total || 0) - (pkg.sessions_used || 0)} / {pkg.sessions_total || 0} left
                        </span>
                        <span className={`package-status ${pkg.status}`}>{pkg.status}</span>
                      </div>
                      <div className="package-meta">
                        <span>Purchased: {formatDateShort(pkg.purchase_date)}</span>
                        {pkg.added_by_admin && <span className="admin-added">Admin granted</span>}
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No packages purchased</p>
              )}
            </div>

            {/* Booking History */}
            <div className="admin-section-card">
              <h3>Booking History ({bookings.length})</h3>
              {bookings.length > 0 ? (
                <ul className="bookings-list">
                  {bookings.map((booking) => (
                    <li key={booking.id} className="booking-item">
                      <div className="booking-main">
                        <span className="booking-service-label">{getCategoryLabel(booking.category)}</span>
                        <span className="booking-date">{formatDateShort(booking.date)}</span>
                        <span className="booking-time">{booking.time}</span>
                        <span className={`booking-duration ${booking.duration === 30 ? 'trial' : 'regular'}`}>
                          {booking.duration} min
                        </span>
                      </div>
                      {(booking.interview_level || booking.interview_style || booking.target_school) && (
                        <div className="booking-service-details">
                          {booking.interview_level && <span>Level: {booking.interview_level}</span>}
                          {booking.interview_style && <span>Style: {booking.interview_style}</span>}
                          {booking.target_school && <span>School: {booking.target_school}</span>}
                        </div>
                      )}
                      {booking.attachments?.length > 0 && (
                        <div className="booking-attachments">
                          {booking.attachments.map(f => (
                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="booking-attachment-link">
                              📎 {f.filename}
                            </a>
                          ))}
                        </div>
                      )}
                      {booking.notes && (
                        <p className="booking-notes">📝 {booking.notes}</p>
                      )}
                      <div className="booking-meta">
                        <span className={`booking-status ${booking.status}`}>{booking.status}</span>
                        <span className="booking-booked">Booked: {formatDate(booking.booked_at)}</span>
                      </div>
                      {booking.calendar_event_link && (
                        <a 
                          href={booking.calendar_event_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="calendar-link"
                        >
                          View in Calendar →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No bookings yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

