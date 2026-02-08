import { getTimeAgo } from '../utils'
import { useRecentBookings } from '../hooks/useRecentBookings'

export default function RecentBookings() {
  const { bookings: purchases, isLoading } = useRecentBookings(5)

  if (purchases.length === 0 && !isLoading) return null

  return (
    <div className="recent-bookings">
      <h4>Recent Bookings</h4>
      <div className="recent-bookings-scroll">
        {isLoading && purchases.length === 0 ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div className="recent-booking-card loading" key={`skeleton-${i}`}>
              <div className="recent-booking-avatar skeleton" />
              <div className="recent-booking-info">
                <span className="recent-booking-name skeleton" />
                <span className="recent-booking-package skeleton" />
              </div>
            </div>
          ))
        ) : (
          purchases.map((purchase) => (
            <div className="recent-booking-card" key={purchase.id}>
              <div className="recent-booking-avatar">
                {(purchase.first_name || 'U').charAt(0)}
              </div>
              <div className="recent-booking-info">
                <span className="recent-booking-name">{purchase.first_name || 'User'}</span>
                <span className="recent-booking-package">{purchase.package_name}</span>
                <span className="recent-booking-time">{getTimeAgo(purchase.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
