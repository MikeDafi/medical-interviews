import { getTimeAgo } from '../utils'
import { useRecentBookings } from '../hooks/useRecentBookings'

export default function SampleQuestion() {
  const { bookings: recentBookings } = useRecentBookings(3)

  return (
    <section className="sample-section">
      <div className="sample-row">
        <div className="sample-card">
          <span className="sample-label">Sample MMI Question</span>
          <blockquote className="sample-quote">
            "A patient refuses a life-saving blood transfusion due to religious beliefs. 
            The patient's family is begging you to proceed with the transfusion. 
            What do you do?"
          </blockquote>
          <p className="sample-note">
            Questions tailored to your target school's values and interview style.
          </p>
        </div>
        
        <div className="recent-bookings-inline">
          <h3 className="recent-bookings-inline-title">
            <svg className="recent-bookings-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" fill="currentColor"/>
              <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            Recent Bookings
          </h3>
          <div className="bookings-list">
            {recentBookings.map((booking, index) => (
              <div className="booking-item" key={booking.id || index}>
                <div className="booking-avatar">
                  {(booking.first_name || 'U').charAt(0)}
                </div>
                <div className="booking-info">
                  <span className="booking-name">{booking.first_name}</span>
                  <span className="booking-details">
                    {booking.package_name} • {getTimeAgo(booking.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

