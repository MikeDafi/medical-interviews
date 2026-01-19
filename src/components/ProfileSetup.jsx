import { useState } from 'react'

export default function ProfileSetup({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    phone: '',
    interviewExperience: '',
    targetSchools: [{ name: '', interviewType: 'MMI', interviewDate: '', priority: 1 }],
    currentConcerns: ''
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
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
      targetSchools: [...prev.targetSchools, { name: '', interviewType: 'MMI', interviewDate: '', priority: prev.targetSchools.length + 1 }]
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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        })
      })
      
      if (response.ok) {
        onComplete()
      }
    } catch (error) {
      console.error('Error saving profile:', error)
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
          </div>
        </div>

        <div className="setup-content">
          {step === 1 && (
            <div className="setup-step">
              <h3>Basic Info</h3>
              
              <div className="form-group">
                <label>Phone Number (optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="For session reminders"
                />
              </div>

              <div className="form-group">
                <label>Interview Experience</label>
                <select
                  name="interviewExperience"
                  value={formData.interviewExperience}
                  onChange={handleInputChange}
                >
                  <option value="">Select your experience level</option>
                  <option value="none">No interview experience yet</option>
                  <option value="some">Done a few practice interviews</option>
                  <option value="moderate">Had real interviews before</option>
                  <option value="extensive">Extensive interview experience</option>
                </select>
              </div>

              <button className="setup-btn" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="setup-step">
              <h3>Target Schools</h3>
              <p className="step-description">Add the schools you're applying to so I can tailor your prep</p>

              <div className="schools-list">
                {formData.targetSchools.map((school, index) => (
                  <div className="school-entry" key={index}>
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
                        <button className="remove-school-btn" onClick={() => removeSchool(index)}>
                          ×
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      placeholder="Interview date (if known)"
                      value={school.interviewDate}
                      onChange={(e) => handleSchoolChange(index, 'interviewDate', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button className="add-school-btn" onClick={addSchool}>
                + Add Another School
              </button>

              <div className="setup-buttons">
                <button className="setup-btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="setup-btn" onClick={() => setStep(3)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
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
                />
              </div>

              <div className="setup-buttons">
                <button className="setup-btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button className="setup-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="skip-setup" onClick={onComplete}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

