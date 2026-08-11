import { auth } from '../../../../auth'
import { pusher } from '../../../lib/pusher'
import { AuthError, assertPoolMember } from '../../../../lib/auth-helpers'
import {
  GLOBAL_POOLS_CHANNEL,
  parsePoolChannel,
} from '../../../../lib/pusher-channels'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Forbidden', { status: 403 })
  }

  const formData = await req.formData()
  const socketId = formData.get('socket_id')
  const channelName = formData.get('channel_name')

  if (typeof socketId !== 'string' || typeof channelName !== 'string') {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    if (channelName === GLOBAL_POOLS_CHANNEL) {
      // Any authenticated user may listen for pool feed updates.
    } else {
      const poolId = parsePoolChannel(channelName)
      if (!poolId) {
        return new Response('Forbidden', { status: 403 })
      }
      await assertPoolMember(poolId, session.user.email)
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName)
    return Response.json(authResponse)
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(error.message, { status: error.status })
    }
    console.error('Pusher auth error:', error)
    return new Response('Forbidden', { status: 403 })
  }
}
