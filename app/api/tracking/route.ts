import { NextResponse } from 'next/server'
import { pusher } from '../../lib/pusher'
import {
  AuthError,
  requireSessionUser,
  getOrCreateUser,
  assertPoolMember,
} from '../../../lib/auth-helpers'
import { isWithinPESUGeofence } from '../../../lib/geofence'
import { poolChannel } from '../../../lib/pusher-channels'

export async function POST(req: Request) {
  try {
    const { email, name } = await requireSessionUser()
    const { poolId, lat, lng } = await req.json()

    if (!poolId || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
    }

    await assertPoolMember(poolId, email)

    if (!isWithinPESUGeofence(lat, lng)) {
      return NextResponse.json({ error: 'Outside geofence (>2km from campus)' }, { status: 403 })
    }

    const user = await getOrCreateUser(email, name)

    await pusher.trigger(poolChannel(poolId), 'location-update', {
      userId: user.id,
      name: user.name,
      lat,
      lng,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Failed to broadcast location' }, { status: 500 })
  }
}
