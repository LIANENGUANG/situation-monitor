// Cloudflare Worker - CORS Proxy with caching
// Deploy: wrangler deploy

const ALLOWED_ORIGINS = [
    'api.rss2json.com',
    'api.gdeltproject.org',
    'api.coingecko.com',
    'fred.stlouisfed.org',
    'earthquake.usgs.gov',
    // News RSS feeds
    'feeds.bbci.co.uk',
    'feeds.npr.org',
    'rss.nytimes.com',
    'rss.cnn.com',
    'www.theguardian.com',
    'apnews.com',
    // Tech feeds
    'news.ycombinator.com',
    'hnrss.org',
    'feeds.arstechnica.com',
    'www.theverge.com',
    'www.technologyreview.com',
    'feeds.feedburner.com',
    'arxiv.org',
    'rss.arxiv.org',
    // Finance feeds
    'www.cnbc.com',
    'feeds.marketwatch.com',
    'finance.yahoo.com',
    'www.ft.com',
    // Government feeds
    'www.whitehouse.gov',
    'www.federalreserve.gov',
    'www.sec.gov',
    'www.defense.gov',
    'www.cisa.gov',
    // Intel/Defense feeds
    'www.csis.org',
    'www.brookings.edu',
    'www.cfr.org',
    'www.defenseone.com',
    'warontherocks.com',
    'breakingdefense.com',
    'www.thedrive.com',
    'thediplomat.com',
    'www.al-monitor.com',
    'www.bellingcat.com',
    'krebsonsecurity.com',
    // AI news feeds
    'openai.com',
    'venturebeat.com',
    'blog.google',
    'news.mit.edu',
    'huggingface.co',
    'deepmind.google'
];

// Cache TTLs by content type/host (in seconds)
function getCacheTtl(contentType, host) {
    // RSS/XML feeds: 5 minutes
    if (contentType.includes('xml') || contentType.includes('rss')) return 300;
    // GDELT JSON: 3 minutes (real-time news)
    if (host.includes('gdelt')) return 180;
    // CoinGecko: 1 minute (crypto volatility)
    if (host.includes('coingecko')) return 60;
    // USGS: 5 minutes (earthquake data)
    if (host.includes('usgs')) return 300;
    // FRED: 1 hour (weekly economic data)
    if (host.includes('fred')) return 3600;
    // Default: 2 minutes
    return 120;
}

// Add CORS headers to response
function addCorsHeaders(response, origin) {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', origin || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

// Validate target URL
function isAllowedOrigin(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return ALLOWED_ORIGINS.some(allowed => url.hostname.includes(allowed));
    } catch {
        return false;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '*';

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Only allow GET requests
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Get target URL from query param
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            return new Response(JSON.stringify({
                error: 'Missing url parameter',
                usage: 'Add ?url=<encoded-url> to proxy requests'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate allowed origins
        if (!isAllowedOrigin(targetUrl)) {
            return new Response(JSON.stringify({
                error: 'Domain not allowed',
                allowed: ALLOWED_ORIGINS
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check cache first
        const cacheKey = new Request(targetUrl, request);
        const cache = caches.default;
        let response = await cache.match(cacheKey);

        if (response) {
            // Return cached response
            const cachedResponse = addCorsHeaders(response, origin);
            cachedResponse.headers.set('X-Cache', 'HIT');
            cachedResponse.headers.set('X-Cache-Time', response.headers.get('X-Cache-Time') || 'unknown');
            return cachedResponse;
        }

        // Fetch from origin
        try {
            const targetUrlObj = new URL(targetUrl);

            response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'SituationMonitor/1.0 (https://github.com/situation-monitor)',
                    'Accept': request.headers.get('Accept') || '*/*'
                },
                cf: {
                    // Cloudflare cache settings
                    cacheTtl: getCacheTtl('', targetUrlObj.hostname),
                    cacheEverything: true
                }
            });

            if (!response.ok) {
                return addCorsHeaders(new Response(JSON.stringify({
                    error: `Upstream error: ${response.status} ${response.statusText}`,
                    url: targetUrl
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                }), origin);
            }

            // Clone for caching
            const responseToCache = response.clone();
            const contentType = response.headers.get('content-type') || '';
            const cacheTtl = getCacheTtl(contentType, targetUrlObj.hostname);

            // Store in cache with TTL
            if (cacheTtl > 0) {
                const cacheHeaders = new Headers(responseToCache.headers);
                cacheHeaders.set('Cache-Control', `public, max-age=${cacheTtl}`);
                cacheHeaders.set('X-Cache-Time', new Date().toISOString());

                ctx.waitUntil(
                    cache.put(cacheKey, new Response(responseToCache.body, {
                        status: responseToCache.status,
                        statusText: responseToCache.statusText,
                        headers: cacheHeaders
                    }))
                );
            }

            // Return response with CORS headers
            const finalResponse = addCorsHeaders(response, origin);
            finalResponse.headers.set('X-Cache', 'MISS');
            finalResponse.headers.set('X-Cache-TTL', String(cacheTtl));
            return finalResponse;

        } catch (error) {
            return addCorsHeaders(new Response(JSON.stringify({
                error: 'Proxy error',
                message: error.message,
                url: targetUrl
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            }), origin);
        }
    }
};
