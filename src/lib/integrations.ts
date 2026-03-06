const RENDER_API = 'https://godlocal-api.onrender.com';

// Fetch user's saved API keys from Render backend
export async function fetchUserKeys(sessionId: string): Promise<Record<string, string>> {
  if (!sessionId) return {};
  try {
    const res = await fetch(`${RENDER_API}/settings?session_id=${sessionId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.keys || {};
  } catch {
    return {};
  }
}

// Send message via Telegram Bot API
export async function sendTelegram(token: string, chatId: string, text: string): Promise<string> {
  if (!token || !chatId) return 'Error: Telegram not configured. Add Bot Token and Chat ID in Settings.';
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      const err = await res.text();
      return `Telegram error ${res.status}: ${err.slice(0, 200)}`;
    }
    const data = await res.json();
    return data.ok ? `Message sent to Telegram (message_id: ${data.result?.message_id})` : `Error: ${data.description}`;
  } catch (err) {
    return `Telegram failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

// RFC 3986 encoding for OAuth
function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// Generate random nonce for OAuth
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA1 signing using Web Crypto API (works in Edge Runtime)
async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Post a tweet using Twitter API v2 with OAuth 1.0a
export async function postTweet(
  apiKey: string, apiSecret: string,
  accessToken: string, accessSecret: string,
  text: string
): Promise<string> {
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return 'Error: Twitter not fully configured. Add all API keys in Settings.';
  }

  const method = 'POST';
  const url = 'https://api.x.com/2/tweets';

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Create signature base string
  const paramString = Object.keys(oauthParams).sort()
    .map(k => `${encodeRFC3986(k)}=${encodeRFC3986(oauthParams[k])}`)
    .join('&');

  const signatureBase = `${method}&${encodeRFC3986(url)}&${encodeRFC3986(paramString)}`;
  const signingKey = `${encodeRFC3986(apiSecret)}&${encodeRFC3986(accessSecret)}`;

  try {
    const signature = await hmacSha1(signingKey, signatureBase);
    oauthParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
      .map(k => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k])}"`)
      .join(', ');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text();
      return `Twitter error ${res.status}: ${err.slice(0, 300)}`;
    }

    const data = await res.json();
    const tweetId = data.data?.id;
    return tweetId
      ? `Tweet posted: https://x.com/i/status/${tweetId}`
      : 'Tweet posted (no ID returned)';
  } catch (err) {
    return `Twitter failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

// Search recent tweets using Bearer Token
export async function searchTwitter(bearerToken: string, query: string): Promise<string> {
  if (!bearerToken) return 'Error: Twitter Bearer Token not configured. Add it in Settings.';
  try {
    const params = new URLSearchParams({
      query,
      max_results: '10',
      'tweet.fields': 'created_at,author_id,public_metrics',
    });
    const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      return `Twitter search error ${res.status}: ${err.slice(0, 200)}`;
    }
    const data = await res.json();
    if (!data.data?.length) return 'No tweets found for this query.';
    return data.data.map((t: Record<string, unknown>) =>
      `- ${(t.text as string || '').slice(0, 200)} (${t.created_at})`
    ).join('\n');
  } catch (err) {
    return `Twitter search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}
