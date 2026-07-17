export async function GET(req: Request) {
  // 1. --- SECURITY: Restrict to allowed domains ---
  const allowedOrigins = [
    'https://ayushtv88.vercel.app',
    'https://ayushlive.vercel.app'
  ];
  
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  let isAllowed = false;
  let corsOrigin = allowedOrigins[0]; // fallback for CORS header

  // Check the Origin header
  if (origin && allowedOrigins.includes(origin)) {
    isAllowed = true;
    corsOrigin = origin;
  } 
  // Check the Referer header (common for same-origin media fetch requests)
  else if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin)) {
        isAllowed = true;
        corsOrigin = refererUrl.origin;
      }
    } catch (e) {
      // Invalid referer URL, ignore
    }
  }

  // If validation fails (direct access or third-party site), return Forbidden HTML
  if (!isAllowed) {
    const forbiddenHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>403 - Access Denied</title>
          <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }
              .container { text-align: center; background: #111827; padding: 3rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-top: 5px solid #ef4444; max-width: 90%; width: 450px; }
              h1 { font-size: 5rem; margin: 0; color: #ef4444; line-height: 1; }
              h2 { font-size: 1.5rem; margin: 1rem 0; font-weight: 600; color: #f8fafc; }
              p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }
              .btn { display: inline-block; padding: 0.75rem 1.5rem; background-color: #ef4444; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500; transition: background-color 0.2s ease; }
              .btn:hover { background-color: #dc2626; }
              .icon { font-size: 3.5rem; margin-bottom: 1rem; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">🚫</div>
              <h1>403</h1>
              <h2>Access Forbidden</h2>
              <p>Use official site to get this content</p>
              <a href="https://sonyliv.com" class="btn">Go to Site</a>
          </div>
      </body>
      </html>
    `;

    return new Response(forbiddenHTML, { 
      status: 403, 
      headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });
  }
  // ------------------------------------------------

  // 2. --- PROXY LOGIC ---
  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sonyliv.com/',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      return new Response(`Error fetching upstream: ${response.status}`, { status: response.status });
    }

    if (targetUrl.includes('.m3u8')) {
      let manifest = await response.text();
      const baseUrl = targetUrl;

      // Rewrite the Decryption Key (serve.key)
      manifest = manifest.replace(/URI="([^"]+)"/g, (match, keyUri) => {
        const absoluteKeyUrl = new URL(keyUri, baseUrl).href;
        return `URI="/api/proxy?url=${encodeURIComponent(absoluteKeyUrl)}"`;
      });

      // Rewrite .ts segments
      manifest = manifest.split('\n').map(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const absoluteMediaUrl = new URL(line, baseUrl).href;
          return `/api/proxy?url=${encodeURIComponent(absoluteMediaUrl)}`;
        }
        return line;
      }).join('\n');

      return new Response(manifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': corsOrigin, // Dynamic secure CORS
          'Vary': 'Origin',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Streams the TS and Key files directly, bypassing the Node.js limit
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': corsOrigin, // Dynamic secure CORS
        'Vary': 'Origin',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error: any) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}
