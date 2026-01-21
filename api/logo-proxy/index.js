// Logo proxy with aggressive caching
// This proxies ESPN logos and caches them for 1 year

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const logoUrl = url.searchParams.get('url');

  if (!logoUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Only allow ESPN CDN URLs for security
  if (!logoUrl.startsWith('https://a.espncdn.com/')) {
    return new Response('Invalid logo URL', { status: 400 });
  }

  try {
    const response = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PreMedical1on1/1.0)',
      },
    });

    if (!response.ok) {
      return new Response('Failed to fetch logo', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return with aggressive caching headers
    // Cache for 1 year (31536000 seconds)
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Logo proxy error:', error);
    return new Response('Error fetching logo', { status: 500 });
  }
}

