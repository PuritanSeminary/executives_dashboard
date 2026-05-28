// api/populi.js
// Vercel serverless function — proxies requests to the Populi REST API v2
// API token is stored in Vercel environment variables, never exposed to the browser

const POPULI_BASE_URL = 'https://prts.populiweb.com/api2';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the token from environment variables
  const token = process.env.POPULI_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Populi API token not configured' });
  }

  // The frontend passes ?endpoint=/academicterms/1/students etc.
  const { endpoint, ...params } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // Build the full Populi URL
  const queryString = new URLSearchParams(params).toString();
  const url = `${POPULI_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    // Allow the frontend to read this response
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (err) {
    console.error('Populi proxy error:', err);
    return res.status(500).json({ error: 'Failed to reach Populi API' });
  }
}
