import { prisma } from "../lib/prisma";
import { HomeClient } from "./home-client";
import { auth } from "../auth";
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  
  // Boot unauthenticated users to the login screen
  if (!session?.user) {
    redirect('/api/auth/signin'); 
  }

  // 1. Calculate the time exactly 1 hour ago
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // 2. LAZY CLEANUP: Officially close any pools that are past the 1-hour mark
  // We do this BEFORE fetching the pools so we don't accidentally fetch stale ones.
  await prisma.pool.updateMany({
    where: {
      leavingAt: { lt: oneHourAgo },
      status: { in: ['ACTIVE', 'FULL'] },
    },
    data: { 
      status: 'COMPLETED' 
    },
  });

  // 3. Fetch the fresh pools AND count them simultaneously
  const [activePools, activePoolCount] = await Promise.all([
    prisma.pool.findMany({
      where: { status: { in: ['ACTIVE', 'FULL'] } },
      orderBy: { createdAt: "desc" },
      include: { creator: true, participants: true },
    }),
    prisma.pool.count({ 
      where: { status: { in: ['ACTIVE', 'FULL'] } } 
    }),
  ]);

  return (
    <HomeClient
      initialPools={activePools}
      activePoolCount={activePoolCount}
      userName={session?.user?.name ?? null}
    />
  );
}