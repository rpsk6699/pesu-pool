export const GLOBAL_POOLS_CHANNEL = 'private-global-pools'

const POOL_CHANNEL_PREFIX = 'private-pool-'

export function poolChannel(poolId: string): string {
  return `${POOL_CHANNEL_PREFIX}${poolId}`
}

export function parsePoolChannel(channelName: string): string | null {
  if (!channelName.startsWith(POOL_CHANNEL_PREFIX)) {
    return null
  }
  const poolId = channelName.slice(POOL_CHANNEL_PREFIX.length)
  return poolId.length > 0 ? poolId : null
}
