const ALLOWED_ORIGIN = 'https://raelenev.github.io';

export default async function handler(req, res) {

  const origin = req.headers.origin;

  // Only allow the portfolio origin
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  // Handle browser CORS preflight
  if (req.method === 'OPTIONS') {
    if (origin !== ALLOWED_ORIGIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Token must remain server-side
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('GITHUB_TOKEN environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const query = `{
    user(login: "RaeleneV") {
      projectV2(number: 2) {
        items(first: 100) {
          nodes {
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
              }
            }
            content {
              ... on DraftIssue { title }
              ... on Issue { title }
              ... on PullRequest { title }
            }
          }
        }
      }
    }
  }`;

  try {
    const ghRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RaeleneV-Portfolio-Proxy'
      },
      body: JSON.stringify({ query })
    });

    if (!ghRes.ok) {
      console.error(`GitHub API returned ${ghRes.status}`);
      return res.status(502).json({
        error: 'GitHub API error'
      });
    }

    const data = await ghRes.json();

    if (data.errors) {
      console.error('GitHub GraphQL errors:', data.errors);
      return res.status(502).json({
        error: 'GitHub GraphQL error'
      });
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=30'
    );

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch failed:', err.message);

    return res.status(500).json({
      error: 'Failed to fetch board data'
    });
  }
}
