export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const PLAID_SECRET = process.env.PLAID_SECRET;
  const PLAID_ENV = process.env.PLAID_ENV || 'development';

  const baseUrls = {
    production: 'https://production.plaid.com',
    development: 'https://development.plaid.com',
    sandbox: 'https://sandbox.plaid.com'
  };
  const baseUrl = baseUrls[PLAID_ENV] || baseUrls.development;

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return res.json({ error: 'Plaid credentials not configured. Add PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV to Vercel Environment Variables.' });
  }

  try {
    const { action, ...params } = req.body;
    let endpoint = '';
    let payload = { client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET };

    if (action === 'create_link_token') {
      endpoint = '/link/token/create';
      payload.user = { client_user_id: params.user_id || 'agrovia-user' };
      payload.client_name = 'Agrovia';
      payload.products = ['transactions'];
      payload.country_codes = ['US'];
      payload.language = 'en';
    } else if (action === 'exchange_token') {
      endpoint = '/item/public_token/exchange';
      payload.public_token = params.public_token;
    } else if (action === 'get_transactions') {
      endpoint = '/transactions/get';
      const now = new Date();
      const ago = new Date(now.getTime() - 30 * 86400000);
      payload.access_token = params.access_token;
      payload.start_date = params.start_date || ago.toISOString().split('T')[0];
      payload.end_date = params.end_date || now.toISOString().split('T')[0];
      payload.options = { count: 500, offset: 0 };
    } else if (action === 'get_accounts') {
      endpoint = '/accounts/get';
      payload.access_token = params.access_token;
    } else {
      return res.json({ error: 'Unknown action: ' + action });
    }

    const response = await fetch(baseUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.json({ error: err.message });
  }
}
