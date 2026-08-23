/* ============================================
   RAELENE VALESKA DOOKKOO — KANBAN PROXY
   Vercel serverless function
   File location in repo: api/kanban.js
   ============================================ */

export default async function handler(req, res) {

  /* Set CORS headers — allows GitHub Pages origin */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  /* Handle OPTIONS preflight immediately */
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  /* Only allow POST */
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  /* Token check */
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  /* Hardcoded query — client body is completely ignored */
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
        'User-Agent': 'RaeleneV-Portfolio-Proxy'
      },
      body: JSON.stringify({ query })
    });

    if (!ghRes.ok) {
      res.status(502).json({ error: 'GitHub API error' });
      return;
    }

    const data = await ghRes.json();

    if (data.errors) {
      res.status(502).json({ error: 'GitHub GraphQL error' });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch board data' });
  }
}
