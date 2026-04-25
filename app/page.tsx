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

  // 1. Calculate our cleanup thresholds
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 2. LAZY CLEANUP PART A: Close stale pools
  // Officially close any pools that are past the 1-hour mark
  await prisma.pool.updateMany({
    where: {
      leavingAt: { lt: oneHourAgo },
      status: { in: ['ACTIVE', 'FULL'] },
    },
    data: { 
      status: 'COMPLETED' 
    },
  });

  // 3. LAZY CLEANUP PART B: Database maintenance
  // Delete completed pools older than 30 days to save space
  await prisma.pool.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
      status: 'COMPLETED'
    }
  });

  // 4. Fetch the fresh pools AND count them simultaneously
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