

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  // Helper to keep Akamai tokens intact
  function resolveAndMergeUrl(relativePath: string, base: string) {
    const baseUrl = new URL(base);
    const resolvedUrl = new URL(relativePath, base);
    
    baseUrl.searchParams.forEach((val, key) => {
      if (!resolvedUrl.searchParams.has(key)) {
        resolvedUrl.searchParams.append(key, val);
      }
    });
    return resolvedUrl.href;
  }

  try {
    // 2. TELL FETCH TO BYPASS CACHE
    const response = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://dishmt.xyz.com/',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      return new Response(`Error fetching upstream: ${response.status}`, { status: response.status });
    }

    // --- M3U8 PLAYLIST HANDLING ---
    if (targetUrl.includes('.m3u8')) {
      let manifest = await response.text();
      const baseUrl = targetUrl;

      manifest = manifest.replace(/URI="([^"]+)"/g, (match, keyUri) => {
        const absoluteKeyUrl = resolveAndMergeUrl(keyUri, baseUrl);
        return `URI="/api/proxy?url=${encodeURIComponent(absoluteKeyUrl)}"`;
      });

      manifest = manifest.split('\n').map(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const absoluteMediaUrl = resolveAndMergeUrl(line, baseUrl);
          return `/api/proxy?url=${encodeURIComponent(absoluteMediaUrl)}`;
        }
        return line;
      }).join('\n');

      return new Response(manifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          // 3. STRICT NO-CACHE HEADERS FOR CDN & BROWSER
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        }
      });
    }

    // --- VIDEO SEGMENTS (.ts) & KEYS ---
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        // 3. STRICT NO-CACHE HEADERS FOR VIDEO CHUNKS
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      }
    });

  } catch (error: any) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}
