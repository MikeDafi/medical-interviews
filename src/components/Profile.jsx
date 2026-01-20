import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { calculateSessionCredits, formatDate } from '../utils'

export default function Profile({ onClose }) {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [profileData, setProfileData] = useState(null)
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
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingPhone, setEditingPhone] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

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
        const purchases = data.profile?.purchases || []
        const credits = calculateSessionCredits(purchases)
        setSessionCredits({ ...credits, loading: false })
        setPurchasedPackages(purchases)
      } else {
        setSessionCredits({ trial: 0, regular: 0, loading: false })
      }
    } catch (error) {
      console.error('Could not fetch session data:', error)
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
          phone: parsed.phone,
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

  // formatDate imported from utils

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
    
    // Optimistically update UI
    setResources(updatedResources)
    setNewResource({ title: '', url: '' })
    setShowAddResource(false)
    
    // Save to DB
    const saved = await saveProfileUpdate({ resources: updatedResources })
    if (!saved) {
      // Revert on failure
      setResources(resources)
    }
  }

  const handleDeleteResource = async (resourceId) => {
    const updatedResources = resources.filter(r => r.id !== resourceId)
    
    // Optimistically update UI
    const previousResources = resources
    setResources(updatedResources)
    
    // Save to DB
    const saved = await saveProfileUpdate({ resources: updatedResources })
    if (!saved) {
      // Revert on failure
      setResources(previousResources)
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return
    
    try {
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: user.id,
          email: user.email,
          name: newName.trim()
        })
      })
      
      if (response.ok) {
        setEditingName(false)
        // Refresh profile data to get updated name
        fetchProfileData()
      }
    } catch (error) {
      console.error('Failed to update name:', error)
    }
  }

  const handleSavePhone = async () => {
    // Validate phone - digits only
    const cleanPhone = newPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setPhoneError('Please enter a valid phone number (at least 10 digits)')
      return
    }
    
    setPhoneError('')
    
    try {
      // Update in backend
      await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: user.id,
          email: user.email,
          phone: cleanPhone
        })
      })
      
      // Update local storage
      const localProfile = JSON.parse(localStorage.getItem('profileData') || '{}')
      localProfile.phone = cleanPhone
      localStorage.setItem('profileData', JSON.stringify(localProfile))
      
      // Update profile data state
      setProfileData(prev => ({ ...prev, phone: cleanPhone }))
      setEditingPhone(false)
    } catch (error) {
      console.error('Failed to update phone:', error)
      setPhoneError('Failed to save. Please try again.')
    }
  }

  // Coach-provided resources are stored in the user's resources array with added_by_admin: true
  // They will be populated by the admin when they add resources for this user
  const coachResources = resources.filter(r => r.added_by_admin === true)

  const handleAddSchool = async () => {
    if (!newSchool.name) return
    
    const school = {
      name: newSchool.name,
      interviewType: newSchool.interviewType,
      interviewDate: newSchool.interviewDate
    }
    
    const currentSchools = profileData?.target_schools || []
    const updatedSchools = [...currentSchools, school]
    
    // Optimistically update UI
    setProfileData(prev => ({ ...prev, target_schools: updatedSchools }))
    setNewSchool({ name: '', interviewType: 'MMI', interviewDate: '' })
    setShowAddSchool(false)
    
    // Save to DB
    const saved = await saveProfileUpdate({ targetSchools: updatedSchools })
    if (!saved) {
      // Revert on failure
      setProfileData(prev => ({ ...prev, target_schools: currentSchools }))
    }
  }

  const handleRemoveSchool = async (index) => {
    const currentSchools = profileData?.target_schools || []
    const updatedSchools = currentSchools.filter((_, i) => i !== index)
    
    // Optimistically update UI
    setProfileData(prev => ({ ...prev, target_schools: updatedSchools }))
    
    // Save to DB
    const saved = await saveProfileUpdate({ targetSchools: updatedSchools })
    if (!saved) {
      // Revert on failure
      setProfileData(prev => ({ ...prev, target_schools: currentSchools }))
    }
  }

  const handleSaveConcerns = async () => {
    const previousConcerns = profileData?.main_concerns || ''
    
    // Optimistically update UI
    setProfileData(prev => ({ ...prev, main_concerns: concerns }))
    setEditingConcerns(false)
    
    // Save to DB
    const saved = await saveProfileUpdate({ concerns })
    if (!saved) {
      // Revert on failure
      setProfileData(prev => ({ ...prev, main_concerns: previousConcerns }))
      setConcerns(previousConcerns)
      setEditingConcerns(true)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    try {
      // SECURITY: Include email confirmation for deletion
      const response = await fetch(
        `/api/profile?userId=${user.id}&confirmEmail=${encodeURIComponent(user.email)}`, 
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to delete account')
        return
      }
      
      // Sign out and close on successful deletion
      signOut()
      onClose()
    } catch (e) {
      console.error('Account deletion failed:', e)
      alert('Failed to delete account. Please try again.')
    }
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
            {profileData?.phone && <p className="profile-phone">📞 {profileData.phone}</p>}
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
              {/* Purchased Packages */}
              {purchasedPackages.length > 0 && (
                <div className="overview-card">
                  <h4>Your Packages</h4>
                  <div className="packages-list">
                    {purchasedPackages.map((pkg) => {
                      const total = pkg.sessions_total || pkg.sessionsTotal || 1
                      const used = pkg.sessions_used || pkg.sessionsUsed || 0
                      const remaining = total - used
                      const packageType = pkg.type === 'trial' ? 'Trial' : 'Regular'
                      return (
                        <div className="package-item" key={pkg.id}>
                          <div className="package-info">
                            <span className="package-name">{pkg.name || pkg.package_name}</span>
                            <span className="package-date">Purchased {new Date(pkg.purchase_date || pkg.purchaseDate).toLocaleDateString()}</span>
                          </div>
                          <div className="package-sessions">
                            <span className="sessions-remaining">{remaining} {packageType}</span>
                            <span className="sessions-label">{remaining === 1 ? 'session left' : 'sessions left'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="overview-stats">
                <div className="stat-card">
                  <span className="stat-number">{purchasedPackages.reduce((acc, p) => acc + (p.sessions_used || 0), 0)}</span>
                  <span className="stat-label">Sessions Completed</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{sessionCredits.trial + sessionCredits.regular}</span>
                  <span className="stat-label">{(sessionCredits.trial + sessionCredits.regular) === 1 ? 'Session Available' : 'Sessions Available'}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{profileData?.target_schools?.length || 0}</span>
                  <span className="stat-label">Target Schools</span>
                </div>
              </div>

              {/* Small Book Button below stats */}
              {(sessionCredits.trial + sessionCredits.regular) > 0 && (
                <button className="book-session-btn-small" onClick={handleBookNow}>
                  Book Your Session →
                </button>
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

              <div className="bookings-section">
                <h4>Purchased Packages</h4>
                {purchasedPackages.length > 0 ? (
                  <>
                    <div className="bookings-list">
                      {purchasedPackages.map(pkg => {
                        const remaining = (pkg.sessions_total || 1) - (pkg.sessions_used || 0)
                        const packageName = pkg.package_id === 'trial' ? '30 Min Trial' : 
                                           pkg.package_id === 'single' ? '1 Hour Session' : 
                                           pkg.package_id === 'package3' ? 'Package of 3' : 
                                           pkg.package_id === 'package5' ? 'Package of 5' : 'Session'
                        return (
                          <div className="booking-card" key={pkg.id}>
                            <div className="booking-info">
                              <span className="booking-type">{packageName}</span>
                              <span className="booking-date">Purchased {new Date(pkg.purchase_date).toLocaleDateString()}</span>
                            </div>
                            <span className={`booking-status ${remaining > 0 ? 'active' : 'used'}`}>
                              {remaining > 0 ? `${remaining} remaining` : 'Used'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {(sessionCredits.trial + sessionCredits.regular) > 0 && (
                      <button className="book-session-btn" onClick={handleBookNow}>Book a Session</button>
                    )}
                  </>
                ) : (
                  <p className="no-bookings">No sessions yet. <button className="link-btn" onClick={handleBookNow}>Purchase a package!</button></p>
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

                {resources.filter(r => !r.added_by_admin).length > 0 ? (
                  <div className="resources-list">
                    {resources.filter(r => !r.added_by_admin).map((resource, index) => (
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
                    <span className="settings-label">Display Name</span>
                    {editingName ? (
                      <div className="edit-name-form">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Enter your name"
                          className="edit-name-input"
                        />
                        <div className="edit-name-actions">
                          <button className="save-name-btn" onClick={handleSaveName}>Save</button>
                          <button className="cancel-name-btn" onClick={() => { setEditingName(false); setNewName(user.name || '') }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="name-display">
                        <span className="settings-value">{user.name || 'Not set'}</span>
                        <button className="edit-name-btn" onClick={() => { setEditingName(true); setNewName(user.name || '') }}>Edit</button>
                      </div>
                    )}
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
