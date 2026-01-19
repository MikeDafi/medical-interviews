import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Profile({ onClose }) {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [profileData, setProfileData] = useState(null)
  const [bookings, setBookings] = useState({ upcoming: [], past: [] })
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [newResource, setNewResource] = useState({ title: '', url: '' })
  const [showAddResource, setShowAddResource] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [newSchool, setNewSchool] = useState({ name: '', interviewType: 'MMI', interviewDate: '' })
  const [editingConcerns, setEditingConcerns] = useState(false)
  const [concerns, setConcerns] = useState('')
  const [sessionCredits, setSessionCredits] = useState({ trial: 0, regular: 0, loading: true })
  const [purchasedPackages, setPurchasedPackages] = useState([])

  useEffect(() => {
    fetchProfileData()
    fetchSessionData()
    
    // Listen for payment completed to refresh
    const handlePaymentCompleted = () => {
      setTimeout(() => fetchSessionData(), 2000)
    }
    window.addEventListener('paymentCompleted', handlePaymentCompleted)
    return () => window.removeEventListener('paymentCompleted', handlePaymentCompleted)
  }, [])

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${user.id}&email=${encodeURIComponent(user.email)}`)
      if (response.ok) {
        const data = await response.json()
        // Purchases are now JSON on the user object
        const purchases = data.profile?.purchases || []
        
        let trial = 0
        let regular = 0
        
        purchases.forEach(p => {
          const remaining = (p.sessions_total || 0) - (p.sessions_used || 0)
          if (p.type === 'trial' || p.package_id === 'trial') {
            trial += remaining
          } else {
            regular += remaining
          }
        })
        
        setSessionCredits({ trial, regular, loading: false })
        setPurchasedPackages(purchases)
      } else {
        setSessionCredits({ trial: 0, regular: 0, loading: false })
      }
    } catch (error) {
      console.log('Could not fetch session data:', error)
      setSessionCredits({ trial: 0, regular: 0, loading: false })
    }
  }

  const fetchProfileData = async () => {
    try {
      // Try to get from localStorage first
      const localProfile = localStorage.getItem('profileData')
      if (localProfile) {
        const parsed = JSON.parse(localProfile)
        setProfileData({
          ...parsed,
          application_stage: parsed.applicationStage,
          target_schools: parsed.targetSchools?.map(s => ({ school_name: s.name, interview_type: s.interviewType, interview_date: s.interviewDate })) || [],
          current_concerns: parsed.currentConcerns || ''
        })
        setResources(parsed.resources?.filter(r => r.title && r.url) || [])
        setConcerns(parsed.currentConcerns || '')
      }

      // Try API for profile
      const profileRes = await fetch(`/api/profile?userId=${user.id}&email=${encodeURIComponent(user.email)}`).catch(() => null)

      if (profileRes?.ok) {
        const data = await profileRes.json()
        setProfileData(data.profile)
        // Resources are now JSON on user object
        setResources(data.profile?.resources || [])
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
    setLoading(false)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric' 
    })
  }

  const handleBookNow = () => {
    onClose()
    setTimeout(() => {
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleAddResource = async () => {
    if (!newResource.title || !newResource.url) return
    
    const newRes = { ...newResource, id: Date.now(), type: 'user' }
    const updatedResources = [...resources, newRes]
    setResources(updatedResources)
    
    // Save to localStorage (only user resources)
    const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
    localProfile.resources = updatedResources.filter(r => r.type === 'user')
    localStorage.setItem('profileData', JSON.stringify(localProfile))
    
    // Try to save to API
    try {
      await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: newResource.title,
          url: newResource.url,
          resourceType: 'user'
        })
      })
    } catch (e) {
      console.log('Saved locally')
    }
    
    setNewResource({ title: '', url: '' })
    setShowAddResource(false)
  }

  const handleDeleteResource = async (resourceId) => {
    const updatedResources = resources.filter(r => r.id !== resourceId)
    setResources(updatedResources)
    
    // Update localStorage
    const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
    localProfile.resources = updatedResources.filter(r => r.type === 'user')
    localStorage.setItem('profileData', JSON.stringify(localProfile))
    
    // Try to delete from API
    try {
      await fetch(`/api/resources?id=${resourceId}`, {
        method: 'DELETE'
      })
    } catch (e) {
      console.log('Deleted locally')
    }
  }

  // Coach-provided resources (loaded from API/database)
  const [coachResources, setCoachResources] = useState([])

  useEffect(() => {
    // Fetch coach resources
    const fetchCoachResources = async () => {
      try {
        const response = await fetch('/api/resources?type=coach')
        if (response.ok) {
          const data = await response.json()
          setCoachResources(data.resources || [])
        }
      } catch (e) {
        // No coach resources available yet
        console.log('No coach resources')
      }
    }
    fetchCoachResources()
  }, [])

  const handleAddSchool = () => {
    if (!newSchool.name) return
    
    const school = {
      school_name: newSchool.name,
      interview_type: newSchool.interviewType,
      interview_date: newSchool.interviewDate
    }
    
    const updatedSchools = [...(profileData?.target_schools || []), school]
    setProfileData(prev => ({ ...prev, target_schools: updatedSchools }))
    
    // Update localStorage
    const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
    localProfile.targetSchools = updatedSchools.map(s => ({
      name: s.school_name,
      interviewType: s.interview_type,
      interviewDate: s.interview_date
    }))
    localStorage.setItem('profileData', JSON.stringify(localProfile))
    
    setNewSchool({ name: '', interviewType: 'MMI', interviewDate: '' })
    setShowAddSchool(false)
  }

  const handleRemoveSchool = (index) => {
    const updatedSchools = profileData.target_schools.filter((_, i) => i !== index)
    setProfileData(prev => ({ ...prev, target_schools: updatedSchools }))
    
    // Update localStorage
    const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
    localProfile.targetSchools = updatedSchools.map(s => ({
      name: s.school_name,
      interviewType: s.interview_type,
      interviewDate: s.interview_date
    }))
    localStorage.setItem('profileData', JSON.stringify(localProfile))
  }

  const handleSaveConcerns = () => {
    setProfileData(prev => ({ ...prev, current_concerns: concerns }))
    
    // Update localStorage
    const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
    localProfile.currentConcerns = concerns
    localStorage.setItem('profileData', JSON.stringify(localProfile))
    
    setEditingConcerns(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    try {
      // Try to delete from API
      await fetch(`/api/profile?userId=${user.id}`, {
        method: 'DELETE'
      }).catch(() => {})
    } catch (e) {
      console.log('API delete failed, continuing with local cleanup')
    }
    
    // Clear all local data
    localStorage.removeItem('user')
    localStorage.removeItem('profileData')
    localStorage.removeItem('profileComplete')
    localStorage.removeItem('sessionCredits')
    
    // Sign out and close
    signOut()
    onClose()
  }

  if (loading) {
    return (
      <div className="profile-overlay">
        <div className="profile-modal">
          <div className="profile-loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Profile Header */}
        <div className="profile-header">
          <img 
            src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d9488&color=fff&size=200`} 
            alt={user.name}
            className="profile-avatar"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d9488&color=fff&size=200`
            }}
          />
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`profile-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            My Sessions
          </button>
          <button 
            className={`profile-tab ${activeTab === 'schools' ? 'active' : ''}`}
            onClick={() => setActiveTab('schools')}
          >
            Target Schools
          </button>
          <button 
            className={`profile-tab ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            Resources
          </button>
          <button 
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === 'overview' && (
            <div className="tab-overview">
              {/* Session Credits */}
              <div className="overview-card session-credits-card">
                <h4>Available Sessions</h4>
                <div className="session-credits-display">
                  <div className="credit-box">
                    <span className="credit-number">{sessionCredits.trial}</span>
                    <span className="credit-type">Trial Sessions</span>
                  </div>
                  <div className="credit-box">
                    <span className="credit-number">{sessionCredits.regular}</span>
                    <span className="credit-type">Regular Sessions</span>
                  </div>
                  <div className="credit-box total">
                    <span className="credit-number">{sessionCredits.trial + sessionCredits.regular}</span>
                    <span className="credit-type">Total</span>
                  </div>
                </div>
                {sessionCredits.trial + sessionCredits.regular === 0 && (
                  <p className="no-sessions-msg">No sessions available. <a href="#packages" onClick={onClose}>Purchase a package</a></p>
                )}
              </div>

              {/* Purchased Packages */}
              {purchasedPackages.length > 0 && (
                <div className="overview-card">
                  <h4>Your Packages</h4>
                  <div className="packages-list">
                    {purchasedPackages.map((pkg) => (
                      <div className="package-item" key={pkg.id}>
                        <div className="package-info">
                          <span className="package-name">{pkg.name || pkg.package_name}</span>
                          <span className="package-date">Purchased {new Date(pkg.purchase_date || pkg.purchaseDate).toLocaleDateString()}</span>
                        </div>
                        <div className="package-sessions">
                          <span className="sessions-remaining">{(pkg.sessions_total || pkg.sessionsTotal) - (pkg.sessions_used || pkg.sessionsUsed)}/{pkg.sessions_total || pkg.sessionsTotal}</span>
                          <span className="sessions-label">remaining</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="overview-stats">
                <div className="stat-card">
                  <span className="stat-number">{bookings.past.length}</span>
                  <span className="stat-label">Sessions Completed</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{bookings.upcoming.length}</span>
                  <span className="stat-label">Upcoming</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{profileData?.target_schools?.length || 0}</span>
                  <span className="stat-label">Target Schools</span>
                </div>
              </div>

              {/* Next Session */}
              {bookings.upcoming.length > 0 && (
                <div className="overview-card next-session">
                  <h4>Next Session</h4>
                  <div className="session-preview">
                    <div className="session-date">
                      <span className="date">{formatDate(bookings.upcoming[0].booking_date)}</span>
                      <span className="time">{bookings.upcoming[0].booking_time}</span>
                    </div>
                    <span className="session-type">{bookings.upcoming[0].package_name}</span>
                    {bookings.upcoming[0].zoom_link && (
                      <a href={bookings.upcoming[0].zoom_link} className="zoom-link" target="_blank" rel="noopener noreferrer">
                        Join Zoom
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Main Concerns */}
              <div className="overview-card concerns-card">
                <div className="concerns-header">
                  <h4>Main Concerns</h4>
                  <button 
                    type="button"
                    className="edit-concerns-btn"
                    onClick={() => setEditingConcerns(!editingConcerns)}
                  >
                    {editingConcerns ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                {editingConcerns ? (
                  <div className="concerns-edit">
                    <textarea
                      value={concerns}
                      onChange={(e) => setConcerns(e.target.value.slice(0, 500))}
                      placeholder="What are your main concerns about interviews? e.g., I freeze up when I don't know the answer..."
                      rows={4}
                      maxLength={500}
                    />
                    <div className="concerns-footer">
                      <span className="char-count">{concerns.length}/500</span>
                      <button type="button" className="save-concerns-btn" onClick={handleSaveConcerns}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="concerns-text">
                    {profileData?.current_concerns || concerns || 'No concerns added yet. Click Edit to add your interview concerns.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="tab-bookings">
              <div className="bookings-section">
                <h4>Upcoming Sessions</h4>
                {bookings.upcoming.length > 0 ? (
                  <div className="bookings-list">
                    {bookings.upcoming.map(booking => (
                      <div className="booking-card" key={booking.id}>
                        <div className="booking-info">
                          <span className="booking-date">{formatDate(booking.booking_date)}</span>
                          <span className="booking-time">{booking.booking_time}</span>
                          <span className="booking-type">{booking.package_name}</span>
                        </div>
                        <span className={`booking-status ${booking.status}`}>{booking.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-bookings">No upcoming sessions. <button className="link-btn" onClick={handleBookNow}>Book one now!</button></p>
                )}
              </div>

              <div className="bookings-section">
                <h4>Past Sessions</h4>
                {bookings.past.length > 0 ? (
                  <div className="bookings-list">
                    {bookings.past.map(booking => (
                      <div className="booking-card past" key={booking.id}>
                        <div className="booking-info">
                          <span className="booking-date">{formatDate(booking.booking_date)}</span>
                          <span className="booking-type">{booking.package_name}</span>
                        </div>
                        {booking.session_recording_url && (
                          <a href={booking.session_recording_url} className="recording-link" target="_blank" rel="noopener noreferrer">
                            Watch Recording
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-bookings">No past sessions yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schools' && (
            <div className="tab-schools">
              <div className="schools-header">
                <h4>Your Target Schools</h4>
                <button 
                  type="button"
                  className="add-school-profile-btn"
                  onClick={() => setShowAddSchool(!showAddSchool)}
                >
                  {showAddSchool ? 'Cancel' : '+ Add School'}
                </button>
              </div>

              {showAddSchool && (
                <div className="add-school-form">
                  <input
                    type="text"
                    placeholder="School name (e.g., UCLA)"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <div className="add-school-row">
                    <select
                      value={newSchool.interviewType}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, interviewType: e.target.value }))}
                    >
                      <option value="MMI">MMI</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Both">Both</option>
                      <option value="Unknown">Not sure</option>
                    </select>
                    <input
                      type="date"
                      value={newSchool.interviewDate}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, interviewDate: e.target.value }))}
                      placeholder="Interview date (optional)"
                    />
                  </div>
                  <button type="button" className="save-school-btn" onClick={handleAddSchool}>
                    Add School
                  </button>
                </div>
              )}

              {profileData?.target_schools?.length > 0 ? (
                <div className="schools-list">
                  {profileData.target_schools.map((school, index) => (
                    <div className="school-card" key={index}>
                      <div className="school-info">
                        <span className="school-name">{school.school_name}</span>
                        <span className="school-type">{school.interview_type} Interview</span>
                      </div>
                      <div className="school-actions">
                        {school.interview_date && (
                          <span className="school-date">{formatDate(school.interview_date)}</span>
                        )}
                        <button 
                          type="button"
                          className="remove-school-profile-btn"
                          onClick={() => handleRemoveSchool(index)}
                          title="Remove school"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-schools">No target schools added yet. Click "+ Add School" to get started.</p>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="tab-resources">
              {/* Coach Resources Section */}
              <div className="resources-section coach-resources">
                <div className="resources-section-header">
                  <h4>📚 From Your Coach</h4>
                  {coachResources.length > 0 && (
                    <span className="resources-badge coach">Ashley's Picks</span>
                  )}
                </div>
                {coachResources.length > 0 ? (
                  <div className="resources-list">
                    {coachResources.map((resource) => (
                      <a 
                        href={resource.url} 
                        className="resource-card coach" 
                        key={resource.id}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <div className="resource-icon coach">📖</div>
                        <div className="resource-info">
                          <span className="resource-title">{resource.title}</span>
                          {resource.description && (
                            <span className="resource-desc">{resource.description}</span>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="no-resources coach-empty">No resources from Ashley yet. Check back after your first session!</p>
                )}
              </div>

              {/* User Resources Section */}
              <div className="resources-section user-resources">
                <div className="resources-section-header">
                  <h4>📁 Your Resources</h4>
                  <button className="add-resource-btn" onClick={() => setShowAddResource(!showAddResource)}>
                    {showAddResource ? 'Cancel' : '+ Add'}
                  </button>
                </div>

                {showAddResource && (
                  <div className="add-resource-form">
                    <input
                      type="text"
                      placeholder="Resource name"
                      value={newResource.title}
                      onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newResource.url}
                      onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                    />
                    <button className="save-resource-btn" onClick={handleAddResource}>
                      Save Resource
                    </button>
                  </div>
                )}

                {resources.filter(r => r.type === 'user' || !r.type).length > 0 ? (
                  <div className="resources-list">
                    {resources.filter(r => r.type === 'user' || !r.type).map((resource, index) => (
                      <div className="resource-card-wrapper" key={resource.id || index}>
                        <a 
                          href={resource.url} 
                          className="resource-card user" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <div className="resource-icon user">🔗</div>
                          <div className="resource-info">
                            <span className="resource-title">{resource.title}</span>
                            {resource.description && (
                              <span className="resource-desc">{resource.description}</span>
                            )}
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                          </svg>
                        </a>
                        <button 
                          className="delete-resource-btn"
                          onClick={() => handleDeleteResource(resource.id)}
                          title="Delete resource"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-resources">No resources added yet. Add links to articles, videos, or school pages you're using for prep.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-settings">
              <div className="settings-section">
                <h4>Account Settings</h4>
                <div className="settings-item">
                  <div className="settings-info">
                    <span className="settings-label">Email</span>
                    <span className="settings-value">{user.email}</span>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-info">
                    <span className="settings-label">Connected via</span>
                    <span className="settings-value">Google</span>
                  </div>
                </div>
                <button 
                  className="sign-out-btn"
                  onClick={() => {
                    signOut()
                    onClose()
                  }}
                >
                  Sign Out
                </button>
              </div>

              <div className="settings-section danger-zone">
                <h4>Danger Zone</h4>
                <p className="danger-warning">Once you delete your account, there is no going back. All your data, bookings, and resources will be permanently removed.</p>
                
                {!showDeleteConfirm ? (
                  <button 
                    className="delete-account-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="delete-confirm-box">
                    <p>Type <strong>DELETE</strong> to confirm:</p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="delete-confirm-input"
                    />
                    <div className="delete-confirm-actions">
                      <button 
                        className="cancel-delete-btn"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="confirm-delete-btn"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                      >
                        Permanently Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
