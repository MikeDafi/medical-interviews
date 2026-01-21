// Email notification utility using Resend
// Requires RESEND_API_KEY environment variable

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = 'premedical1on1@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'PreMedical 1-on-1 <notifications@premedical1on1.com>';
const SITE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.SITE_URL || 'http://localhost:5173';

/**
 * Send an email using Resend API
 */
async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured - skipping email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Send booking confirmation email to customer
 */
export async function sendCustomerBookingEmail({ 
  customerEmail, 
  customerName, 
  date, 
  time, 
  duration, 
  eventLink,
  meetLink,
  timezone = 'Central Time'
}) {
  const sessionType = duration === 30 ? 'Trial Session (30 minutes)' : 'Regular Session (1 hour)';
  const formattedDate = formatDate(date);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f4f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f4f0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                ✓ Booking Confirmed
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">
                Your session has been scheduled
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${customerName || 'there'},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Great news! Your medical school interview coaching session has been confirmed. Here are the details:
              </p>
              
              <!-- Appointment Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdfa; border-radius: 12px; border: 1px solid #99f6e4;">
                <tr>
                  <td style="padding: 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #99f6e4;">
                          <p style="color: #0d9488; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
                            Session Type
                          </p>
                          <p style="color: #134e4a; font-size: 18px; font-weight: 600; margin: 0;">
                            ${sessionType}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #99f6e4;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%">
                                <p style="color: #0d9488; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
                                  📅 Date
                                </p>
                                <p style="color: #134e4a; font-size: 16px; font-weight: 500; margin: 0;">
                                  ${formattedDate}
                                </p>
                              </td>
                              <td width="50%">
                                <p style="color: #0d9488; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
                                  🕐 Time
                                </p>
                                <p style="color: #134e4a; font-size: 16px; font-weight: 500; margin: 0;">
                                  ${time} ${timezone}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <p style="color: #0d9488; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
                            📍 Location
                          </p>
                          <p style="color: #134e4a; font-size: 16px; font-weight: 500; margin: 0;">
                            ${meetLink ? 'Google Meet Video Call' : 'Video Call (link will be in calendar invite)'}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${meetLink ? `
              <!-- Google Meet Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${meetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(26,115,232,0.3);">
                      🎥 Join Google Meet
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      Or copy this link: <a href="${meetLink}" style="color: #1a73e8;">${meetLink}</a>
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${eventLink ? `
              <!-- Calendar Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${meetLink ? '16px' : '32px'};">
                <tr>
                  <td align="center">
                    <a href="${eventLink}" target="_blank" style="display: inline-block; background: ${meetLink ? '#f3f4f6' : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'}; color: ${meetLink ? '#374151' : '#ffffff'}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      ${meetLink ? '📅 View in Calendar' : 'View in Google Calendar →'}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Preparation Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; background-color: #fef3c7; border-radius: 12px; border: 1px solid #fcd34d;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">
                      💡 Before Your Session
                    </p>
                    <ul style="color: #78350f; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Update your profile with your main concerns and target schools</li>
                      <li>Have a quiet, well-lit space ready for the video call</li>
                      <li>Prepare any specific questions you'd like to discuss</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Cancel/Reschedule Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; background-color: #f8f4f0; border-radius: 12px; border: 1px solid #e7e5e4;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="color: #78716c; font-size: 14px; font-weight: 600; margin: 0 0 8px;">
                      Need to Cancel?
                    </p>
                    <p style="color: #78716c; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                      We understand plans change! Cancellations are free if made at least 1 day before your appointment. Your session credit will be restored automatically.
                    </p>
                    <p style="color: #78716c; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                      <strong>To cancel:</strong>
                    </p>
                    <ol style="color: #78716c; font-size: 14px; line-height: 1.8; margin: 0 0 16px; padding-left: 20px;">
                      <li>Go to <a href="${SITE_URL}" style="color: #0d9488; font-weight: 600;">premedical1on1.com</a></li>
                      <li>Sign in and click your profile icon</li>
                      <li>Go to <strong>"My Sessions"</strong> tab</li>
                      <li>Find your upcoming session and click <strong>"Cancel"</strong></li>
                    </ol>
                    <a href="${SITE_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      Go to My Sessions →
                    </a>
                    <p style="color: #a1a1aa; font-size: 12px; margin: 16px 0 0;">
                      Questions? Contact us at ${ADMIN_EMAIL}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
                PreMedical 1-on-1 • Expert Interview Coaching
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Booking Confirmed!

Hi ${customerName || 'there'},

Your medical school interview coaching session has been confirmed.

SESSION DETAILS:
- Type: ${sessionType}
- Date: ${formattedDate}
- Time: ${time} ${timezone}
- Location: ${meetLink ? 'Google Meet Video Call' : 'Video Call'}

${meetLink ? `🎥 JOIN GOOGLE MEET: ${meetLink}` : ''}
${eventLink ? `📅 View in Google Calendar: ${eventLink}` : ''}

BEFORE YOUR SESSION:
- Update your profile with your main concerns and target schools
- Have a quiet, well-lit space ready for the video call
- Prepare any specific questions you'd like to discuss

NEED TO CANCEL?
We understand plans change! Cancellations are free if made at least 1 day before your appointment.

To cancel:
1. Go to ${SITE_URL}
2. Sign in and click your profile icon
3. Go to "My Sessions" tab
4. Find your upcoming session and click "Cancel"

Your session credit will be restored automatically.

Questions? Contact us at ${ADMIN_EMAIL}

---
PreMedical 1-on-1 • Expert Interview Coaching
${SITE_URL}
`;

  return sendEmail({
    to: customerEmail,
    subject: `✓ Session Confirmed: ${formattedDate} at ${time}`,
    html,
    text
  });
}

/**
 * Send booking notification email to admin
 */
export async function sendAdminBookingEmail({
  customerEmail,
  customerName,
  customerId,
  date,
  time,
  duration,
  eventLink,
  meetLink,
  userProfile = {}
}) {
  const sessionType = duration === 30 ? 'Trial (30 min)' : 'Regular (1 hour)';
  const formattedDate = formatDate(date);
  const adminUserLink = `${SITE_URL}/admin/user/${customerId}`;
  
  // Extract profile info
  const { phone, application_stage, main_concerns, target_schools } = userProfile;
  const schoolsList = target_schools?.length 
    ? target_schools.map(s => s.school_name || s).join(', ')
    : 'Not specified';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e293b; padding: 24px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">
                🔔 New Session Booked
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Quick Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0;">
                            ${customerName || customerEmail}
                          </p>
                          <p style="color: #047857; font-size: 14px; margin: 4px 0 0;">
                            ${sessionType} • ${formattedDate} at ${time}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Client Info -->
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Client Information
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="color: #64748b; font-size: 13px; display: inline-block; width: 120px;">Name:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${customerName || 'Not provided'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="color: #64748b; font-size: 13px; display: inline-block; width: 120px;">Email:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${customerEmail}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="color: #64748b; font-size: 13px; display: inline-block; width: 120px;">Phone:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${phone || 'Not provided'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                    <span style="color: #64748b; font-size: 13px; display: inline-block; width: 120px;">Stage:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${application_stage || 'Not specified'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #64748b; font-size: 13px; display: inline-block; width: 120px;">Target Schools:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${schoolsList}</span>
                  </td>
                </tr>
              </table>
              
              ${main_concerns ? `
              <!-- Main Concerns -->
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Main Concerns
              </h3>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px; padding: 12px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #0d9488;">
                ${main_concerns}
              </p>
              ` : ''}
              
              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${meetLink ? `
                    <a href="${meetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-right: 12px;">
                      🎥 Join Meet
                    </a>
                    ` : ''}
                    <a href="${adminUserLink}" target="_blank" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-right: 12px;">
                      View Client Profile →
                    </a>
                    ${eventLink ? `
                    <a href="${eventLink}" target="_blank" style="display: inline-block; background-color: #f1f5f9; color: #475569; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
                      Calendar Event
                    </a>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This is an automated notification from PreMedical 1-on-1
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
NEW SESSION BOOKED

${customerName || customerEmail}
${sessionType} • ${formattedDate} at ${time}

CLIENT INFORMATION:
- Name: ${customerName || 'Not provided'}
- Email: ${customerEmail}
- Phone: ${phone || 'Not provided'}
- Stage: ${application_stage || 'Not specified'}
- Target Schools: ${schoolsList}

${main_concerns ? `MAIN CONCERNS:\n${main_concerns}\n` : ''}

${meetLink ? `JOIN GOOGLE MEET: ${meetLink}` : ''}
View Client Profile: ${adminUserLink}
${eventLink ? `Calendar Event: ${eventLink}` : ''}

---
This is an automated notification from PreMedical 1-on-1
`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔔 New Booking: ${customerName || customerEmail} - ${formattedDate}`,
    html,
    text
  });
}

export { sendEmail, ADMIN_EMAIL };

