import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function fetchContentType(url: string) {
  const requestOptions = {
    method: 'HEAD' as const,
    redirect: 'follow' as const,
    headers: {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  };

  let upstream = await fetch(url, requestOptions);
  if (!upstream.ok || !upstream.headers.get('content-type')) {
    upstream = await fetch(url, {
      ...requestOptions,
      method: 'GET',
    });
    if (!upstream.ok) {
      throw new Error('Upstream fetch failed');
    }
  }

  return upstream.headers.get('content-type') || 'application/octet-stream';
}

export async function HEAD(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    const contentType = await fetchContentType(url);
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    headers.set('Content-Disposition', 'inline');

    return new Response(null, { status: 200, headers });
  } catch (err) {
    return NextResponse.json({ error: 'Server error fetching image' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    const range = req.headers.get('range');
    const upstream = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    headers.set('Content-Disposition', 'inline');

    const status = upstream.status === 206 ? 206 : 200;

    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    headers.set('Accept-Ranges', acceptRanges);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(upstream.body, { status, headers });
  } catch (err) {
    return NextResponse.json({ error: 'Server error fetching image' }, { status: 500 });
  }
}
