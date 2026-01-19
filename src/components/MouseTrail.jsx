import { useState, useEffect, useRef } from 'react'

const schoolLogos = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/UCLA_Bruins_script.svg/200px-UCLA_Bruins_script.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Stanford_Cardinal_logo.svg/200px-Stanford_Cardinal_logo.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Seal_of_University_of_California%2C_San_Francisco.svg/150px-Seal_of_University_of_California%2C_San_Francisco.svg.png',
  'https://upload.wikimedia.org/wikipedia/en/thumb/1/18/Duke_Blue_Devils_logo.svg/200px-Duke_Blue_Devils_logo.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Harvard_University_shield.svg/150px-Harvard_University_shield.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Yale_University_Shield_1.svg/150px-Yale_University_Shield_1.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/JHU_seal.svg/150px-JHU_seal.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Northwestern_University_seal.svg/150px-Northwestern_University_seal.svg.png',
]

export default function MouseTrail() {
  const [trails, setTrails] = useState([])
  const [isActive, setIsActive] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const logoIndex = useRef(0)
  const trailId = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e) => {
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Only add trail if mouse moved enough distance
      if (distance > 50) {
        lastPos.current = { x: e.clientX, y: e.clientY }
        
        const newTrail = {
          id: trailId.current++,
          x: e.clientX,
          y: e.clientY,
          logo: schoolLogos[logoIndex.current % schoolLogos.length],
          rotation: Math.random() * 30 - 15,
          scale: 0.6 + Math.random() * 0.4
        }
        
        logoIndex.current++
        
        setTrails(prev => [...prev.slice(-12), newTrail]) // Keep max 12 trails
      }
    }

    const handleMouseDown = () => setIsActive(true)
    const handleMouseUp = () => setIsActive(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Clean up old trails
  useEffect(() => {
    if (trails.length > 0) {
      const timer = setTimeout(() => {
        setTrails(prev => prev.slice(1))
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [trails])

  return (
    <div className="mouse-trail-container">
      {trails.map((trail, index) => (
        <div
          key={trail.id}
          className="trail-logo"
          style={{
            left: trail.x,
            top: trail.y,
            transform: `translate(-50%, -50%) rotate(${trail.rotation}deg) scale(${trail.scale})`,
            opacity: (index + 1) / trails.length,
            animationDelay: `${index * 50}ms`
          }}
        >
          <img src={trail.logo} alt="" />
        </div>
      ))}
    </div>
  )
}

