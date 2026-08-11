export const poolFeedInclude = {
  creator: { select: { id: true, name: true } },
  participants: { select: { id: true, name: true } },
} as const
