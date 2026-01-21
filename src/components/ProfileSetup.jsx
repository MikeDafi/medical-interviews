import { useState } from 'react'

const MAX_CONCERNS_LENGTH = 500

// Generate unique IDs for form items
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function ProfileSetup({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    phone: '',
    applicationStage: '',
    targetSchools: [{ id: generateId(), name: '', interviewType: 'MMI', interviewDate: '', priority: 1 }],
    currentConcerns: '',
    resources: [{ id: generateId(), title: '', url: '' }]
  })
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Special handling for phone - only allow numbers
    if (name === 'phone') {
      const numbersOnly = value.replace(/[^0-9]/g, '')
      if (value !== numbersOnly && value !== '') {
        setPhoneError('Please enter numbers only')
      } else {
        setPhoneError('')
      }
      setFormData(prev => ({ ...prev, [name]: numbersOnly }))
      return
    }
    
    // Special handling for concerns - enforce character limit
    if (name === 'currentConcerns' && value.length > MAX_CONCERNS_LENGTH) {
      return
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSchoolChange = (index, field, value) => {
    const updated = [...formData.targetSchools]
    updated[index][field] = value
    setFormData(prev => ({ ...prev, targetSchools: updated }))
  }

  const addSchool = () => {
    setFormData(prev => ({
      ...prev,
      targetSchools: [...prev.targetSchools, { id: generateId(), name: '', interviewType: 'MMI', interviewDate: '', priority: prev.targetSchools.length + 1 }]
    }))
  }

  const removeSchool = (index) => {
    if (formData.targetSchools.length > 1) {
      setFormData(prev => ({
        ...prev,
        targetSchools: prev.targetSchools.filter((_, i) => i !== index)
      }))
    }
  }

  const handleResourceChange = (index, field, value) => {
    const updated = [...formData.resources]
    updated[index][field] = value
    setFormData(prev => ({ ...prev, resources: updated }))
  }

  const addResource = () => {
    setFormData(prev => ({
      ...prev,
      resources: [...prev.resources, { id: generateId(), title: '', url: '' }]
    }))
  }

  const removeResource = (index) => {
    if (formData.resources.length > 1) {
      setFormData(prev => ({
        ...prev,
        resources: prev.resources.filter((_, i) => i !== index)
      }))
    }
  }

  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // SECURITY: Session authenticates user, no need to send googleId/email
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: user.name,
          phone: formData.phone,
          applicationStage: formData.applicationStage,
          targetSchools: formData.targetSchools.filter(s => s.name.trim()),
          concerns: formData.currentConcerns,
          resources: formData.resources.filter(r => r.title.trim() && r.url.trim())
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }
      
      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <div className="setup-header">
          <h2>Welcome, {user.name?.split(' ')[0]}!</h2>
          <p>Let's set up your profile so I can personalize your prep</p>
          <div className="setup-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4</div>
          </div>
        </div>

        <div className="setup-content">
          {step === 1 && (
            <div className="setup-step">
              <h3>About You</h3>
              
              <div className="form-group">
                <label>Phone Number (optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="For session reminders (numbers only)"
                  maxLength={15}
                />
                {phoneError && <span className="field-error">{phoneError}</span>}
              </div>

              <div className="form-group">
                <label>Where are you in your application?</label>
                <select
                  name="applicationStage"
                  value={formData.applicationStage}
                  onChange={handleInputChange}
                >
                  <option value="">Select your stage</option>
                  <option value="pre-med-freshman">Pre-med (Freshman/Sophomore)</option>
                  <option value="pre-med-junior">Pre-med (Junior/Senior)</option>
                  <option value="gap-year">Gap year / Post-bacc</option>
                  <option value="applying">Currently applying this cycle</option>
                  <option value="interviews-scheduled">Have interviews scheduled</option>
                  <option value="reapplicant">Reapplicant</option>
                </select>
              </div>

              <button type="button" className="setup-btn" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="setup-step">
              <h3>Target Schools</h3>
              <p className="step-description">Add the schools you're applying to so I can tailor your prep</p>

              <div className="schools-form-list">
                {formData.targetSchools.map((school, index) => (
                  <div className="school-entry" key={school.id}>
                    <div className="school-row">
                      <input
                        type="text"
                        placeholder="School name (e.g., UCLA)"
                        value={school.name}
                        onChange={(e) => handleSchoolChange(index, 'name', e.target.value)}
                      />
                      <select
                        value={school.interviewType}
                        onChange={(e) => handleSchoolChange(index, 'interviewType', e.target.value)}
                      >
                        <option value="MMI">MMI</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Both">Both</option>
                        <option value="Unknown">Not sure</option>
                      </select>
                      {formData.targetSchools.length > 1 && (
                        <button type="button" className="remove-school-btn" onClick={() => removeSchool(index)}>
                          ×
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="date-label">Interview Date (if scheduled)</label>
                      <input
                        type="date"
                        value={school.interviewDate}
                        onChange={(e) => handleSchoolChange(index, 'interviewDate', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="add-school-btn" onClick={addSchool}>
                + Add Another School
              </button>

              <div className="setup-buttons">
                <button type="button" className="setup-btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="setup-btn" onClick={() => setStep(3)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="setup-step">
              <h3>Helpful Resources</h3>
              <p className="step-description">Share any resources you've been using (articles, videos, school pages) so I can understand your prep approach</p>

              <div className="resources-form-list">
                {formData.resources.map((resource, index) => (
                  <div className="resource-entry" key={resource.id}>
                    <input
                      type="text"
                      placeholder="Resource name (e.g., UCLA interview tips)"
                      value={resource.title}
                      onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                    />
                    <div className="resource-url-row">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={resource.url}
                        onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                      />
                      {formData.resources.length > 1 && (
                        <button type="button" className="remove-school-btn" onClick={() => removeResource(index)}>
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="add-school-btn" onClick={addResource}>
                + Add Another Resource
              </button>

              <div className="setup-buttons">
                <button type="button" className="setup-btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="setup-btn" onClick={() => setStep(4)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="setup-step">
              <h3>What are your main concerns?</h3>
              <p className="step-description">This helps me focus on what matters most to you</p>

              <div className="form-group">
                <textarea
                  name="currentConcerns"
                  value={formData.currentConcerns}
                  onChange={handleInputChange}
                  placeholder="e.g., I freeze up when I don't know the answer, I struggle with ethical scenarios, I talk too fast when nervous..."
                  rows={5}
                  maxLength={MAX_CONCERNS_LENGTH}
                  className="concerns-textarea"
                />
                <div className="char-count">
                  <span className={formData.currentConcerns.length >= MAX_CONCERNS_LENGTH * 0.9 ? 'char-count-warning' : ''}>
                    {formData.currentConcerns.length}
                  </span>
                  /{MAX_CONCERNS_LENGTH} characters
                </div>
              </div>

              {error && (
                <div className="setup-error">
                  {error}
                </div>
              )}

              <div className="setup-buttons">
                <button type="button" className="setup-btn-secondary" onClick={() => setStep(3)}>
                  Back
                </button>
                <button type="button" className="setup-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="skip-setup" onClick={async () => {
          // Save minimal profile to mark as complete so it doesn't keep showing
          try {
            await fetch('/api/profile/setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: user.name,
                phone: '',
                applicationStage: '',
                targetSchools: [],
                concerns: '',
                resources: []
              })
            })
          } catch (e) {
            console.error('Skip save error:', e)
          }
          onComplete()
        }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
