import Pusher from 'pusher-js'

export function createPusherClient(): Pusher {
  return new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
  })
}

export { GLOBAL_POOLS_CHANNEL, poolChannel } from './pusher-channels'
