import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Profile({ onClose }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [profileData, setProfileData] = useState(null)
  const [bookings, setBookings] = useState({ upcoming: [], past: [] })
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      // Fetch profile, bookings, and resources in parallel
      const [profileRes, bookingsRes, resourcesRes] = await Promise.all([
        fetch(`/api/profile?userId=${user.id}`),
        fetch(`/api/bookings?userId=${user.id}`),
        fetch(`/api/resources?userId=${user.id}`)
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfileData(data.profile)
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        const now = new Date()
        setBookings({
          upcoming: data.bookings?.filter(b => new Date(b.booking_date) >= now && b.status !== 'cancelled') || [],
          past: data.bookings?.filter(b => new Date(b.booking_date) < now || b.status === 'completed') || []
        })
      }
      if (resourcesRes.ok) {
        const data = await resourcesRes.json()
        setResources(data.resources || [])
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
    setLoading(false)
  }

  const getLevelProgress = () => {
    const levels = { beginner: 33, intermediate: 66, advanced: 100 }
    return levels[profileData?.current_level] || 33
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric' 
    })
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
            src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} 
            alt={user.name}
            className="profile-avatar"
          />
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="profile-level">{profileData?.current_level || 'Beginner'} Level</span>
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
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === 'overview' && (
            <div className="tab-overview">
              {/* Progress Card */}
              <div className="overview-card">
                <h4>Your Progress</h4>
                <div className="progress-track">
                  <div className="progress-labels">
                    <span className={profileData?.current_level === 'beginner' ? 'active' : ''}>Beginner</span>
                    <span className={profileData?.current_level === 'intermediate' ? 'active' : ''}>Intermediate</span>
                    <span className={profileData?.current_level === 'advanced' ? 'active' : ''}>Advanced</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${getLevelProgress()}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Package Status */}
              {profileData?.active_package && (
                <div className="overview-card">
                  <h4>Package Status</h4>
                  <div className="package-status">
                    <span className="package-name">{profileData.active_package.name}</span>
                    <div className="sessions-remaining">
                      <span className="sessions-count">
                        {profileData.active_package.sessions_total - profileData.active_package.sessions_used}
                      </span>
                      <span className="sessions-label">sessions remaining</span>
                    </div>
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
                  <p className="no-bookings">No upcoming sessions. <a href="#book">Book one now!</a></p>
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
              <h4>Your Target Schools</h4>
              {profileData?.target_schools?.length > 0 ? (
                <div className="schools-list">
                  {profileData.target_schools.map((school, index) => (
                    <div className="school-card" key={index}>
                      <div className="school-info">
                        <span className="school-name">{school.school_name}</span>
                        <span className="school-type">{school.interview_type} Interview</span>
                      </div>
                      {school.interview_date && (
                        <span className="school-date">Interview: {formatDate(school.interview_date)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-schools">No target schools added yet.</p>
              )}
              <button className="add-school-btn">+ Add School</button>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="tab-resources">
              <h4>Your Resources</h4>
              {resources.length > 0 ? (
                <div className="resources-list">
                  {resources.map(resource => (
                    <a 
                      href={resource.url} 
                      className="resource-card" 
                      key={resource.id}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <div className="resource-icon">
                        {resource.resource_type === 'video' && '🎥'}
                        {resource.resource_type === 'article' && '📄'}
                        {resource.resource_type === 'document' && '📋'}
                        {resource.resource_type === 'practice_question' && '❓'}
                        {!resource.resource_type && '🔗'}
                      </div>
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
                <p className="no-resources">No resources shared yet. Resources from your sessions will appear here.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

