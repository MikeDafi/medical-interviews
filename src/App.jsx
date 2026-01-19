import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import Hero from './components/Hero'
import SampleQuestion from './components/SampleQuestion'
import Packages from './components/Packages'
import SessionStructure from './components/SessionStructure'
import About from './components/About'
import Features from './components/Features'
import Experiences from './components/Experiences'
import FAQ from './components/FAQ'
import Calendar from './components/Calendar'
import Footer from './components/Footer'
import RecentBookingNotification from './components/RecentBookingNotification'
import ProfileSetup from './components/ProfileSetup'
import PaymentStatus from './components/PaymentStatus'
import Admin from './components/Admin'

function HomePage() {
  return (
    <>
      <div className="app">
        {/* Background Image with Blur */}
        <div className="background-layer">
          <img 
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=80" 
            alt="" 
            className="bg-image"
          />
          <div className="bg-overlay"></div>
        </div>

        {/* Main Container with Border */}
        <div className="main-container">
          <div className="inner-border">
            <Header />
            
            <div className="content-area">
              <Hero />
              <SampleQuestion />
              <Experiences />
              <Packages />
              <SessionStructure />
              <About />
              <Features />
              <FAQ />
              <Calendar />
              <Footer />
            </div>
          </div>
        </div>
      </div>

      <PaymentStatus />
    </>
  )
}

function AppContent() {
  const { user, showProfileSetup, completeProfileSetup } = useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      
      <Analytics />
      
      {user && showProfileSetup && (
        <ProfileSetup user={user} onComplete={completeProfileSetup} />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
