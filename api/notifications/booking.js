import { sql } from '@vercel/postgres'

// This API sends email notifications to admins when a booking is made
// Requires RESEND_API_KEY environment variable
// Sign up at resend.com - free tier: 100 emails/day

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { bookingDetails, userName, userEmail } = req.body

  if (!bookingDetails) {
    return res.status(400).json({ error: 'Booking details required' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!RESEND_API_KEY) {
    console.log('Email notifications not configured - RESEND_API_KEY missing')
    return res.status(200).json({ 
      success: true, 
      message: 'Booking saved (email notifications not configured)' 
    })
  }

  try {
    // Get all admin emails
    const admins = await sql`
      SELECT email, name FROM users WHERE is_admin = true
    `

    if (admins.rows.length === 0) {
      console.log('No admins to notify')
      return res.status(200).json({ success: true, message: 'No admins to notify' })
    }

    const adminEmails = admins.rows.map(a => a.email)
    
    // Format booking date nicely
    const bookingDate = new Date(bookingDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PreMedical 1-on-1 <notifications@premedical1on1.com>',
        to: adminEmails,
        subject: `New Booking: ${userName || userEmail}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2da7a7 0%, #1d8f8f 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Session Booked!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px;">
              <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Booking Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Student</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${userName || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${userEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${bookingDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Time</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">${bookingDetails.time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280;">Session Type</td>
                    <td style="padding: 12px 0; color: #1f2937;">${bookingDetails.sessionType || 'Standard Session'}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
                Log in to your <a href="https://premedical1on1.vercel.app" style="color: #2da7a7; text-decoration: none;">Admin Dashboard</a> to view all bookings.
              </p>
            </div>
          </div>
        `
      })
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API error:', errorData)
      return res.status(200).json({ 
        success: true, 
        message: 'Booking saved (email notification failed)',
        emailError: errorData 
      })
    }

    const emailData = await emailResponse.json()
    return res.status(200).json({ 
      success: true, 
      message: 'Booking notification sent',
      emailId: emailData.id 
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    // Don't fail the booking if email fails
    return res.status(200).json({ 
      success: true, 
      message: 'Booking saved (email notification error)',
      error: error.message 
    })
  }
}

