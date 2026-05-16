// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';

const UPSTREAM = 'http://4.224.186.213/evaluation-service/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upstreamUrl = new URL(UPSTREAM);

    // Forward supported query params
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const type = searchParams.get('notification_type');

    if (page) upstreamUrl.searchParams.set('page', page);
    if (limit) upstreamUrl.searchParams.set('limit', limit);
    if (type) upstreamUrl.searchParams.set('notification_type', type);

    const upstream = await fetch(upstreamUrl.toString(), {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 }, // cache for 30 seconds
    });

    if (!upstream.ok) {
      console.warn(`[API Proxy] Upstream returned ${upstream.status}. Falling back to mock data.`);
      return NextResponse.json(MOCK_NOTIFICATIONS);
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    // Fallback to mock data even on network errors
    return NextResponse.json(MOCK_NOTIFICATIONS);
  }
}
