/* ============================================
   RAELENE VALESKA DOOKKOO — KANBAN PROXY
   Vercel serverless function
   File location in repo: api/kanban.js
   ============================================ */

/* Explicitly list every allowed origin — no wildcards */
const ALLOWED_ORIGINS = [
  'https://RaeleneV.github.io',
  'https://raelenv.github.io',
];

export default async function handler(req, res) {

  /* ---- CORS — only allow requests from the portfolio ---- */
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  /* Block everything not on the allowed list */
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

  /* ---- Token check — must be set as Vercel env variable ---- */
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  /* ---- GraphQL query — hardcoded server-side, ignores any body sent by client ---- */
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

  /* ---- Call GitHub API ---- */
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

    if (!ghRes.ok) {
      console.error(`GitHub API returned ${ghRes.status}`);
      return res.status(502).json({ error: 'GitHub API error' });
    }

    const data = await ghRes.json();

    if (data.errors) {
      console.error('GitHub GraphQL errors:', data.errors);
      return res.status(502).json({ error: 'GitHub GraphQL error' });
    }

    /* Cache for 60 seconds — reduces API calls on repeated page loads */
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch failed:', err.message);
    return res.status(500).json({ error: 'Failed to fetch board data' });
  }
}
