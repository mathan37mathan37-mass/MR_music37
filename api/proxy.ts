// Serverless function proxy for binary Supabase Storage assets
export default async function handler(req: any, res: any) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  // Allow only Supabase storage public assets
  if (
    !url.includes('.supabase.co/storage/v1/object/public/') &&
    !url.includes('supabase.co/storage')
  ) {
    return res.status(403).send('Forbidden destination origin');
  }

  try {
    const upstreamRes = await fetch(url, {
      headers: {
        'User-Agent': 'Melodix-Asset-Proxy/1.0',
        Accept: '*/*',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Upstream response not OK');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(502).send(err?.message || 'Proxy fetch failed');
  }
}
