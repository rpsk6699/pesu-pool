import { NextResponse } from 'next/server'
import { pusher } from '../../lib/pusher'

export async function POST(req: Request) {
  const { poolId, userId, lat, lng } = await req.json()

  await pusher.trigger(poolId, 'location-update', { userId, lat, lng })

  return NextResponse.json({ success: true })
}

