const normalizeApiBaseUrl = (value) => {
  const baseUrl = (value || 'https://sales-crm-api-h3nq.onrender.com/api').replace(/\/+$/, '');
  return /\/api(?:\/|$)/.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
};

const getRequestBody = async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
};

const setCorsHeaders = (req, res) => {
  const allowedOrigins = new Set([
    'https://canova-crm-epft.vercel.app',
    'https://canova-crm-three.vercel.app'
  ]);
  const origin = req.headers.origin;

  res.setHeader('access-control-allow-origin', allowedOrigins.has(origin) ? origin : 'https://canova-crm-three.vercel.app');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'authorization,content-type,accept');
  res.setHeader('vary', 'Origin');
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const backendBaseUrl = normalizeApiBaseUrl(process.env.BACKEND_API_URL || process.env.VITE_API_URL);
  const incomingUrl = new URL(req.url, 'https://canova-crm-three.vercel.app');
  const backendPath = (incomingUrl.searchParams.get('path') || '').replace(/^\/+/, '');
  incomingUrl.searchParams.delete('path');
  const targetUrl = `${backendBaseUrl}/${backendPath}${incomingUrl.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        accept: req.headers.accept || 'application/json',
        authorization: req.headers.authorization || '',
        'content-type': req.headers['content-type'] || 'application/json'
      },
      body: await getRequestBody(req)
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const responseBody = await response.arrayBuffer();

    res.status(response.status);
    res.setHeader('content-type', contentType);
    res.setHeader('cache-control', 'no-store');
    res.send(Buffer.from(responseBody));
  } catch (error) {
    res.status(502).json({
      message: `API proxy failed: ${error.message}`
    });
  }
}
