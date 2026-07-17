// REMOVED: export const runtime = 'edge'; 

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://dishmt.xyz.com/',
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
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Streams the TS and Key files directly, bypassing the 4.5MB Node.js limit!
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error: any) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}
