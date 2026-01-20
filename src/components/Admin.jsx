import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedUser, setExpandedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newResource, setNewResource] = useState({ title: '', url: '', description: '', type: 'article' })
  const [addingResourceFor, setAddingResourceFor] = useState(null)
  const [addingSessionFor, setAddingSessionFor] = useState(null)
  const [newSession, setNewSession] = useState({ duration: 60, sessions: 1 })
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '' })

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers()
    }
  }, [isAdmin, authLoading, sortBy, sortOrder])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // SECURITY: Pass user's Google ID for server-side auth verification
      const response = await fetch(`/api/admin?sortBy=${sortBy}&sortOrder=${sortOrder}&googleId=${user?.id || ''}`, {
        headers: {
          'Authorization': `Bearer ${user?.id || ''}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else if (response.status === 403) {
        console.error('Admin access denied')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const toggleUserExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId)
    setAddingResourceFor(null)
  }

  const handleAddResource = async (userId) => {
    if (!newResource.title || !newResource.url) return

    try {
      const response = await fetch(`/api/admin?action=resources&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId,
          ...newResource,
          addedByAdmin: true
        })
      })

      if (response.ok) {
        setNewResource({ title: '', url: '', description: '', type: 'article' })
        setAddingResourceFor(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error adding resource:', error)
    }
  }

  const handleRemoveResource = async (resourceId) => {
    if (!confirm('Remove this resource?')) return

    try {
      const response = await fetch(`/api/admin?action=resources&userId=${expandedUser}&resourceId=${resourceId}&googleId=${user?.id || ''}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.id || ''}`
        }
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error removing resource:', error)
    }
  }

  const handleDeletePackage = async (userId, packageId) => {
    if (!confirm('Delete this package? This will permanently remove it from the user.')) return

    try {
      const response = await fetch(`/api/admin?action=deletePackage&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({ userId, packageId })
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting package:', error)
    }
  }

  const handleAddSession = async (userId) => {
    if (!newSession.sessions || newSession.sessions < 1) return

    try {
      const response = await fetch(`/api/admin?action=addSession&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId,
          duration: parseInt(newSession.duration),
          sessions: parseInt(newSession.sessions)
        })
      })

      if (response.ok) {
        setNewSession({ duration: 60, sessions: 1 })
        setAddingSessionFor(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error adding session:', error)
    }
  }

  const handleEditUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin?action=editUser&googleId=${user?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          userId,
          name: editForm.name,
          phone: editForm.phone
        })
      })

      if (response.ok) {
        setEditingUser(null)
        setEditForm({ name: '', phone: '' })
        fetchUsers()
      }
    } catch (error) {
      console.error('Error editing user:', error)
    }
  }

  const startEditingUser = (u) => {
    setEditingUser(u.id)
    setEditForm({ name: u.name || '', phone: u.phone || '' })
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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

  return (
    <div className="admin-page">
      <div className="admin-page-container">
        {/* Header */}
        <div className="admin-page-header">
          <Link to="/" className="admin-back-link">← Back to Site</Link>
          <h1>Admin Dashboard</h1>
          <div className="admin-user-info-small">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="admin-avatar-small" />
            )}
            <span>{user?.name}</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-number">
              {users.filter(u => u.sessions_remaining > 0).length}
            </span>
            <span className="stat-label">Users with Sessions</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-number">
              {users.reduce((sum, u) => sum + (u.total_bookings || 0), 0)}
            </span>
            <span className="stat-label">Total Bookings</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-number">
              {users.filter(u => u.is_admin).length}
            </span>
            <span className="stat-label">Admins</span>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="admin-controls">
          <div className="admin-search">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="admin-sort-controls">
            <span>Sort by:</span>
            <button 
              className={sortBy === 'created_at' ? 'active' : ''} 
              onClick={() => handleSort('created_at')}
            >
              Join Date {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={sortBy === 'sessions_remaining' ? 'active' : ''} 
              onClick={() => handleSort('sessions_remaining')}
            >
              Sessions Left {sortBy === 'sessions_remaining' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={sortBy === 'total_bookings' ? 'active' : ''} 
              onClick={() => handleSort('total_bookings')}
            >
              Bookings {sortBy === 'total_bookings' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={sortBy === 'last_booking' ? 'active' : ''} 
              onClick={() => handleSort('last_booking')}
            >
              Recent Activity {sortBy === 'last_booking' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="admin-loading">Loading users...</div>
        ) : (
          <div className="admin-users-list">
            {filteredUsers.length === 0 ? (
              <div className="admin-no-users">No users found</div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className={`admin-user-card ${expandedUser === u.id ? 'expanded' : ''}`}>
                  {/* User Row - Always Visible */}
                  <div className="admin-user-row" onClick={() => toggleUserExpand(u.id)}>
                    <div className="admin-user-info">
                      <img 
                        src={u.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=2da7a7&color=fff`} 
                        alt={u.name}
                        className="admin-user-avatar"
                      />
                      <div className="admin-user-details">
                        <span className="admin-user-name">
                          {u.name || 'Unnamed User'}
                          {u.is_admin && <span className="admin-badge">Admin</span>}
                        </span>
                        <span className="admin-user-email">{u.email}</span>
                      </div>
                    </div>
                    <div className="admin-user-metrics">
                      <div className="admin-metric">
                        <span className="metric-value">{u.sessions_remaining || 0}</span>
                        <span className="metric-label">Sessions Left</span>
                      </div>
                      <div className="admin-metric">
                        <span className="metric-value">{u.total_bookings || 0}</span>
                        <span className="metric-label">Bookings</span>
                      </div>
                      <div className="admin-metric">
                        <span className="metric-value">{formatDate(u.last_booking)}</span>
                        <span className="metric-label">Last Booking</span>
                      </div>
                      <div className="admin-metric">
                        <span className="metric-value">{formatDate(u.created_at)}</span>
                        <span className="metric-label">Joined</span>
                      </div>
                    </div>
                    <span className="admin-expand-icon">{expandedUser === u.id ? '▼' : '▶'}</span>
                  </div>

                  {/* Expanded Content */}
                  {expandedUser === u.id && (
                    <div className="admin-user-expanded">
                      <div className="admin-expanded-grid">
                        {/* User Details */}
                        <div className="admin-expanded-section">
                          <div className="admin-section-header">
                            <h4>User Details</h4>
                            <button 
                              className="admin-add-resource-btn"
                              onClick={() => editingUser === u.id ? setEditingUser(null) : startEditingUser(u)}
                            >
                              {editingUser === u.id ? 'Cancel' : 'Edit'}
                            </button>
                          </div>
                          
                          {editingUser === u.id ? (
                            <div className="admin-edit-user-form">
                              <div className="edit-field">
                                <label>Name:</label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                  placeholder="User name"
                                />
                              </div>
                              <div className="edit-field">
                                <label>Phone:</label>
                                <input
                                  type="text"
                                  value={editForm.phone}
                                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                  placeholder="Phone number"
                                />
                              </div>
                              <button 
                                className="admin-save-resource-btn"
                                onClick={() => handleEditUser(u.id)}
                              >
                                Save Changes
                              </button>
                            </div>
                          ) : (
                            <div className="admin-detail-list">
                              <div><strong>Phone:</strong> {u.phone || 'Not provided'}</div>
                              <div><strong>Main Concerns:</strong> {u.main_concerns || 'None specified'}</div>
                            </div>
                          )}
                        </div>

                        {/* Target Schools */}
                        <div className="admin-expanded-section">
                          <h4>Target Schools ({u.target_schools?.length || 0})</h4>
                          {u.target_schools?.length > 0 ? (
                            <ul className="admin-schools-list">
                              {u.target_schools.map((school) => (
                                <li key={school.school_name || school.id}>
                                  {school.school_name}
                                  {school.interview_date && (
                                    <span className="school-date">
                                      {formatDate(school.interview_date)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="admin-empty">No target schools</p>
                          )}
                        </div>

                        {/* Packages / Sessions */}
                        <div className="admin-expanded-section">
                          <div className="admin-section-header">
                            <h4>Packages ({u.purchases?.filter(p => p.status === 'active').length || 0})</h4>
                            <button 
                              className="admin-add-resource-btn"
                              onClick={() => setAddingSessionFor(addingSessionFor === u.id ? null : u.id)}
                            >
                              {addingSessionFor === u.id ? 'Cancel' : '+ Add Session'}
                            </button>
                          </div>

                          {/* Add Session Form */}
                          {addingSessionFor === u.id && (
                            <div className="admin-add-session-form">
                              <select
                                value={newSession.duration}
                                onChange={e => setNewSession({ ...newSession, duration: e.target.value })}
                              >
                                <option value="30">30-minute</option>
                                <option value="60">60-minute</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="# Sessions"
                                value={newSession.sessions}
                                onChange={e => setNewSession({ ...newSession, sessions: e.target.value })}
                              />
                              <button 
                                className="admin-save-resource-btn"
                                onClick={() => handleAddSession(u.id)}
                              >
                                Add Sessions
                              </button>
                            </div>
                          )}

                          {u.purchases?.filter(p => p.status === 'active').length > 0 ? (
                            <ul className="admin-packages-list">
                              {u.purchases.filter(p => p.status === 'active').map((pkg) => (
                                <li key={pkg.id} className="admin-package-item">
                                  <div className="package-info">
                                    <span className={`package-type ${pkg.duration_minutes === 30 ? 'trial' : 'regular'}`}>
                                      {pkg.duration_minutes || (pkg.type === 'trial' ? 30 : 60)}-min
                                    </span>
                                    <span className="package-sessions">
                                      {(pkg.sessions_total || 0) - (pkg.sessions_used || 0)} / {pkg.sessions_total || 0} sessions left
                                    </span>
                                  </div>
                                  <div className="package-meta">
                                    <span className="package-date">Added: {formatDate(pkg.purchase_date)}</span>
                                    {pkg.added_by_admin && <span className="admin-added-badge">Admin</span>}
                                  </div>
                                  <button 
                                    className="admin-delete-package-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeletePackage(u.id, pkg.id)
                                    }}
                                  >
                                    Delete
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="admin-empty">No active packages</p>
                          )}
                        </div>

                        {/* Resources */}
                        <div className="admin-expanded-section admin-resources-section">
                          <div className="admin-section-header">
                            <h4>Resources ({u.resources?.length || 0})</h4>
                            <button 
                              className="admin-add-resource-btn"
                              onClick={() => setAddingResourceFor(addingResourceFor === u.id ? null : u.id)}
                            >
                              {addingResourceFor === u.id ? 'Cancel' : '+ Add Resource'}
                            </button>
                          </div>

                          {/* Add Resource Form */}
                          {addingResourceFor === u.id && (
                            <div className="admin-add-resource-form">
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
                              <button 
                                className="admin-save-resource-btn"
                                onClick={() => handleAddResource(u.id)}
                              >
                                Add Resource
                              </button>
                            </div>
                          )}

                          {/* User-Provided Resources */}
                          <div className="admin-resources-group">
                            <h5 className="resources-group-title user-resources">
                              Their Resources ({u.resources?.filter(r => !r.added_by_admin).length || 0})
                            </h5>
                            {u.resources?.filter(r => !r.added_by_admin).length > 0 ? (
                              <ul className="admin-resources-list">
                                {u.resources.filter(r => !r.added_by_admin).map((resource) => (
                                  <li key={resource.id || resource.url} className="admin-resource-item user-resource">
                                    <div className="resource-info">
                                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                        {resource.title}
                                      </a>
                                      {resource.resource_type && (
                                        <span className="resource-type">{resource.resource_type}</span>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="admin-empty">No resources from user</p>
                            )}
                          </div>

                          {/* Coach-Provided Resources */}
                          <div className="admin-resources-group">
                            <h5 className="resources-group-title coach-resources">
                              Your Resources ({u.resources?.filter(r => r.added_by_admin).length || 0})
                            </h5>
                            {u.resources?.filter(r => r.added_by_admin).length > 0 ? (
                              <ul className="admin-resources-list">
                                {u.resources.filter(r => r.added_by_admin).map((resource) => (
                                  <li key={resource.id || resource.url} className="admin-resource-item coach-resource">
                                    <div className="resource-info">
                                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                        {resource.title}
                                      </a>
                                      {resource.resource_type && (
                                        <span className="resource-type">{resource.resource_type}</span>
                                      )}
                                    </div>
                                    <button 
                                      className="admin-remove-resource-btn"
                                      onClick={() => handleRemoveResource(resource.id)}
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="admin-empty">No resources added by you</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
