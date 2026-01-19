import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First, ensure the packages exist
    await sql`
      INSERT INTO packages (name, description, price, duration_minutes, session_count, features) VALUES
      ('30 Min Trial', 'Try it out session', 30.00, 30, 1, '["Brief introduction & assessment", "One MMI question practice", "7 min timed response", "Immediate feedback"]'),
      ('1 Hour Session', 'Full prep session', 100.00, 60, 1, '["Full prep & coaching", "MMI or traditional practice", "Detailed feedback", "Take-home notes"]'),
      ('Package of 3', 'Three session package', 250.00, 60, 3, '["3 one-hour sessions", "Progressive skill building", "Beginner to Advanced", "Comprehensive feedback"]'),
      ('Package of 5', 'Premium five session package', 450.00, 60, 5, '["5 one-hour sessions", "Full mastery program", "Take-home questions", "Priority scheduling", "Session recordings"]')
      ON CONFLICT DO NOTHING
    `;

    // Create sample users
    const users = [
      { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
      { name: 'Michael Chen', email: 'michael.c@example.com' },
      { name: 'Emily Rodriguez', email: 'emily.r@example.com' },
      { name: 'James Williams', email: 'james.w@example.com' },
      { name: 'Priya Patel', email: 'priya.p@example.com' }
    ];

    const userIds = [];
    for (const user of users) {
      const result = await sql`
        INSERT INTO users (name, email, profile_complete)
        VALUES (${user.name}, ${user.email}, true)
        ON CONFLICT (email) DO UPDATE SET name = ${user.name}
        RETURNING id
      `;
      userIds.push(result.rows[0].id);
    }

    // Get package IDs
    const packagesResult = await sql`
      SELECT id, name FROM packages ORDER BY id
    `;
    const packages = packagesResult.rows;

    // Sample booking data matching the display
    const bookingData = [
      { userIndex: 0, packageName: '1 Hour Session', hoursAgo: 2 },      // Sarah - 2h ago
      { userIndex: 1, packageName: 'Package of 3', hoursAgo: 5 },        // Michael - 5h ago
      { userIndex: 2, packageName: '30 Min Trial', hoursAgo: 12 },       // Emily - 12h ago
      { userIndex: 3, packageName: 'Package of 5', hoursAgo: 24 },       // James - 1d ago
      { userIndex: 4, packageName: '1 Hour Session', hoursAgo: 36 }      // Priya - 1.5d ago
    ];

    // Insert bookings
    for (const booking of bookingData) {
      const userId = userIds[booking.userIndex];
      const pkg = packages.find(p => p.name === booking.packageName);
      
      if (pkg && userId) {
        const createdAt = new Date(Date.now() - booking.hoursAgo * 60 * 60 * 1000);
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + 7); // Book for a week from now
        
        await sql`
          INSERT INTO bookings (user_id, package_id, booking_date, booking_time, status, created_at)
          VALUES (
            ${userId}, 
            ${pkg.id}, 
            ${bookingDate.toISOString().split('T')[0]},
            '10:00:00',
            'confirmed',
            ${createdAt.toISOString()}
          )
        `;
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Sample bookings created successfully',
      usersCreated: userIds.length,
      bookingsCreated: bookingData.length
    });
  } catch (error) {
    console.error('Error seeding bookings:', error);
    return res.status(500).json({ error: error.message });
  }
}

