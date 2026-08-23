/* ============================================
   RAELENE VALESKA DOOKKOO — KANBAN PROXY
   Vercel serverless function
   File location in repo: api/kanban.js
   ============================================ */

/* All valid origins — lowercase since browsers normalise to lowercase */
const ALLOWED_ORIGINS = [
  'https://raelenev.github.io',
  'https://RaeleneV.github.io',
];

export default async function handler(req, res) {

  const origin = (req.headers.origin || '').toLowerCase().replace(/\/$/, '');

  const isAllowed = ALLOWED_ORIGINS.some(o => o.toLowerCase() === origin);

  /* Set CORS headers */
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? req.headers.origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  /* Block disallowed origins */
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  /* Handle preflight */
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  /* Only allow POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* Token check */
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  /* Hardcoded query — client body is ignored */
  const query = `{
    user(login: "RaeleneV") {
      projectV2(number: 2) {
        items(first: 100) {
          nodes {
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
              }
            }
            content {
              ... on DraftIssue  { title }
              ... on Issue       { title }
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
        'User-Agent':   'RaeleneV-Portfolio-Proxy'
      },
      body: JSON.stringify({ query })
    });

    if (!ghRes.ok) return res.status(502).json({ error: 'GitHub API error' });

    const data = await ghRes.json();
    if (data.errors) return res.status(502).json({ error: 'GitHub GraphQL error' });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch board data' });
  }
}
