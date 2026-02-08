import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

// Critical path components - loaded immediately for LCP
import Header from './components/Header'
import Hero from './components/Hero'
import Footer from './components/Footer'

// Lazy-loaded components - loaded when needed
const SampleQuestion = lazy(() => import('./components/SampleQuestion'))
const Packages = lazy(() => import('./components/Packages'))
const About = lazy(() => import('./components/About'))
const Features = lazy(() => import('./components/Features'))
const FAQ = lazy(() => import('./components/FAQ'))
const Calendar = lazy(() => import('./components/Calendar'))
const RecentBookingNotification = lazy(() => import('./components/RecentBookingNotification'))
const ProfileSetup = lazy(() => import('./components/ProfileSetup'))
const PaymentStatus = lazy(() => import('./components/PaymentStatus'))
const Admin = lazy(() => import('./components/Admin'))
const AdminUser = lazy(() => import('./components/AdminUser'))
const Terms = lazy(() => import('./components/pages/Terms'))
const Privacy = lazy(() => import('./components/pages/Privacy'))
const NotFound = lazy(() => import('./components/pages/NotFound'))

function HomePage() {
  return (
    <>
      <div className="app">
        {/* Background Layer */}
        <div className="background-layer"></div>

        {/* Main Container with Border */}
        <div className="main-container">
          <div className="inner-border">
            <Header />
            
            <div className="content-area">
              {/* Critical LCP content - loads immediately */}
              <Hero />
              
              {/* Below-the-fold content - lazy loaded */}
              <Suspense fallback={null}>
                <About />
                <SampleQuestion />
                <Packages />
                <Features />
                <FAQ />
                <Calendar />
              </Suspense>
              
              <Footer />
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <PaymentStatus />
        <RecentBookingNotification />
      </Suspense>
    </>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  )
}

function AppContent() {
  const { user, loading, showProfileSetup, completeProfileSetup } = useAuth()

  // Don't block page render on auth - let LCP (Hero) render immediately
  // Auth-dependent UI (Header user menu) shows its own loading state

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={loading ? <LoadingScreen /> : <Admin />} />
          <Route path="/admin/user/:userId" element={loading ? <LoadingScreen /> : <AdminUser />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      <Analytics />
      
      {user && showProfileSetup && (
        <Suspense fallback={null}>
          <ProfileSetup user={user} onComplete={completeProfileSetup} />
        </Suspense>
      )}
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
