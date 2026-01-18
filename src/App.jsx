import './App.css'

function App() {
  return (
    <div className="app">
      {/* Background Blur Elements */}
      <div className="bg-blur bg-blur-1"></div>
      <div className="bg-blur bg-blur-2"></div>
      <div className="bg-blur bg-blur-3"></div>

      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span className="logo-text">Taste</span>
            <span className="logo-sub">Restaurant & BBQ</span>
          </div>
          <button className="cart-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-left">
            <h1 className="hero-title">
              Delicious<br />
              Food is Waiting<br />
              For you
            </h1>
            <button className="view-menu-btn">
              View Menu
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            
            {/* Category Icons */}
            <div className="category-icons">
              <button className="category-icon">
                <span>🍔</span>
              </button>
              <button className="category-icon active">
                <span>🦐</span>
              </button>
              <button className="category-icon">
                <span>🗑️</span>
              </button>
              <button className="category-icon">
                <span>🚗</span>
              </button>
            </div>
          </div>
          
          <div className="hero-right">
            <div className="hero-image-container">
              <img 
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=600&fit=crop" 
                alt="Delicious food bowl" 
                className="hero-image"
              />
              <div className="floating-utensils">
                <img 
                  src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100&h=200&fit=crop" 
                  alt="Fork" 
                  className="utensil fork"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Cards Section */}
      <section className="food-cards-section">
        <div className="container">
          <div className="food-cards-wrapper">
            <button className="nav-arrow nav-prev">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            
            <div className="food-cards">
              <div className="food-card">
                <div className="food-card-image">
                  <img 
                    src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop" 
                    alt="Crab Ramen"
                  />
                </div>
                <button className="wishlist-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <h3 className="food-card-title">Crab Ramen</h3>
                <p className="food-card-desc">Spicy with garlic</p>
                <div className="food-card-footer">
                  <span className="food-price">$ 24.00</span>
                  <button className="add-cart-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="food-card">
                <div className="food-card-image">
                  <img 
                    src="https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=200&h=200&fit=crop" 
                    alt="Chicken Slice"
                  />
                </div>
                <button className="wishlist-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <h3 className="food-card-title">Chicken Slice</h3>
                <p className="food-card-desc">Real chicken</p>
                <div className="food-card-footer">
                  <span className="food-price">$ 12.00</span>
                  <button className="add-cart-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <button className="nav-arrow nav-next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            <div className="delicious-text">
              <h2>We have Delicious food<br />Tasty food in town</h2>
              <p>
                Capteur sint occaecat cupidatat proident, taken possession
                of my entire soul, like these sweet mornings of spring
                which I enjoy with my whole.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Section */}
      <section className="healthcare-section">
        <div className="container healthcare-content">
          <div className="healthcare-left">
            <h2>
              Our team of registered nurses and<br />
              skilled healthcare professionals<br />
              provide in-home nursing.
            </h2>
            <p>
              Our Specialist. In yoga you can book with them your
              Classes dummy text ever since the 1500s, when an
              unknown printer took a galley of type and scrambled
              it to make.
            </p>
          </div>
          <div className="healthcare-right">
            <div className="pasta-image-container">
              <img 
                src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop" 
                alt="Pasta dish"
                className="pasta-image"
              />
              <div className="price-tag">
                <span>$25.89</span>
              </div>
              <div className="basil-leaves"></div>
            </div>
          </div>
        </div>
      </section>

      {/* App Section */}
      <section className="app-section">
        <div className="container app-content">
          <div className="app-mockups">
            <div className="phone-mockup phone-left">
              <div className="phone-screen">
                <div className="mini-header">
                  <span className="cart-icon-small">🛒</span>
                </div>
                <h4>Delicious Food</h4>
                <p className="mini-subtitle">We have fresh and healthy food</p>
                <div className="mini-categories">
                  <span>🍔</span>
                  <span>🍗</span>
                  <span>🍕</span>
                  <span>🥗</span>
                </div>
                <div className="mini-food-cards">
                  <div className="mini-food-card">
                    <div className="mini-food-img"></div>
                    <span>Crab Raman</span>
                    <small>Spicy with garlic</small>
                    <strong>$ 24.00</strong>
                  </div>
                  <div className="mini-food-card">
                    <div className="mini-food-img"></div>
                    <span>Chicken Slice</span>
                    <small>Real chicken</small>
                    <strong>$ 12.00</strong>
                  </div>
                </div>
                <div className="mini-nav">
                  <span>🏠</span>
                  <span>🔍</span>
                  <span>❤️</span>
                  <span>👤</span>
                </div>
              </div>
            </div>

            <div className="phone-mockup phone-right">
              <div className="phone-screen">
                <div className="carousel-nav">
                  <button className="carousel-btn">‹</button>
                  <span className="carousel-indicator">|</span>
                  <button className="carousel-btn">›</button>
                </div>
                <div className="curry-card">
                  <img 
                    src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop" 
                    alt="Eggs Curry"
                  />
                </div>
                <div className="curry-info">
                  <h4>Eggs Curry</h4>
                  <p>Eggs Curry with tomato and cucumbers our chefs 
                  special tasty and fat free dish for those who want 
                  to lose weight.</p>
                  <div className="curry-footer">
                    <div className="curry-price">
                      <small>Total Price</small>
                      <strong>$ 15.00</strong>
                    </div>
                    <button className="add-to-cart-btn">
                      Add to Cart
                      <span className="cart-plus">+</span>
                    </button>
                  </div>
                </div>
                <div className="prep-time">
                  <span>⏱ 30 Min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="app-info">
            <h2>App is Available</h2>
            <p>
              Download our app is available on App Store for
              Both platform Android and IOS!Our Specialist
              unknown printer took a galley of type and scrambled
              it to make.
            </p>
            <div className="store-buttons">
              <button className="store-btn app-store">
                <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor">
                  <path d="M15.769 12.642c-.026-2.651 2.164-3.925 2.262-3.988-1.232-1.8-3.15-2.047-3.833-2.075-1.632-.165-3.186.961-4.013.961-.827 0-2.104-.937-3.46-.912-1.781.026-3.423 1.036-4.339 2.631-1.85 3.208-.473 7.961 1.33 10.564.882 1.276 1.933 2.711 3.314 2.66 1.33-.053 1.833-.861 3.441-.861 1.608 0 2.061.861 3.467.834 1.431-.026 2.337-1.302 3.213-2.585 1.013-1.483 1.43-2.919 1.456-2.993-.032-.013-2.794-1.072-2.821-4.253l-.017.017z"/>
                </svg>
                <div className="store-text">
                  <small>Download on the</small>
                  <span>App Store</span>
                </div>
              </button>
              <button className="store-btn google-play">
                <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor">
                  <path d="M.542 0C.25.266 0 .686 0 1.205v19.59c0 .52.25.94.542 1.205l.057.053L11.23 11.47v-.134L.6.054.542 0z"/>
                  <path d="M14.778 15.02l-3.548-3.548v-.134l3.548-3.548.08.046 4.205 2.39c1.2.68 1.2 1.795 0 2.476l-4.205 2.39-.08.028z"/>
                </svg>
                <div className="store-text">
                  <small>GET IT ON</small>
                  <span>Google Play</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <div className="cta-text">
            <span className="cta-label">LET'S TALK.</span>
            <h2>Want to Reserve a table?</h2>
          </div>
          <button className="contact-btn">Contact us Now</button>
        </div>
        <div className="cta-divider"></div>
        <p className="cta-description">
          We're a team of Professional yoga trainers who are excited about our customers
          To show them their amazing skills and expertness in yoga
        </p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="footer-logo">Taste</span>
            <span className="footer-logo-sub">Restaurant & BBQ</span>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Our services</h4>
              <ul>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Tracking</a></li>
                <li><a href="#">Report a Bug</a></li>
                <li><a href="#">Terms of services</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Our Company</h4>
              <ul>
                <li><a href="#">Reporting</a></li>
                <li><a href="#">Get in Touch</a></li>
                <li><a href="#">Management</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Address</h4>
              <ul>
                <li>121 King St,</li>
                <li>VIC3000, US</li>
                <li>888-123-42278</li>
                <li><a href="mailto:Info@example.com">Info@example.com</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-image">
            <img 
              src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&h=150&fit=crop" 
              alt="Croissant"
              className="croissant-img"
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
