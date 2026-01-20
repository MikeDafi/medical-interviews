import { sql } from '@vercel/postgres';

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
      return res.status(200).json({ purchases: cache.data, cached: true });
    }

    const result = await sql`
      SELECT id, name, email, purchases, created_at
      FROM users 
      WHERE purchases IS NOT NULL AND jsonb_array_length(purchases) > 0
      ORDER BY updated_at DESC
      LIMIT 20
    `;

    const recentPurchases = [];
    for (const user of result.rows) {
      const purchases = user.purchases || [];
      for (const purchase of purchases) {
        recentPurchases.push({
          id: purchase.id,
          first_name: user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User',
          package_name: getPackageName(purchase.package_id, purchase.sessions_total),
          created_at: purchase.purchase_date || user.created_at,
          type: purchase.type
        });
      }
    }

    recentPurchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recent = recentPurchases.slice(0, 5);
    cache = { data: recent, timestamp: Date.now() };

    return res.status(200).json({ purchases: recent });
  } catch (error) {
    console.error('Error fetching recent purchases:', error);
    if (cache.data) {
      return res.status(200).json({ purchases: cache.data, stale: true });
    }
    return res.status(500).json({ error: 'Failed to fetch recent purchases' });
  }
}

function getPackageName(packageId, sessions) {
  const names = {
    'trial': '30 Min Trial',
    'single': '1 Hour Session',
    'package3': 'Package of 3',
    'package5': 'Package of 5'
  };
  if (names[packageId]) return names[packageId];
  if (sessions === 1) return '1 Hour Session';
  if (sessions === 3) return 'Package of 3';
  if (sessions === 5) return 'Package of 5';
  return 'Session Package';
}
