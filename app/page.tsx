import { prisma } from "../lib/prisma";
import { HomeClient } from "./home-client";
import { auth } from "../auth";
import { redirect } from 'next/navigation'; // Add this at the very top of the file with your imports
import { sweepStalePools } from './actions/poolActions';

export default async function Home() {
  

  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin'); // Boot unauthenticated users to the login screen
  }
  await sweepStalePools();
  const [activePools, activePoolCount] = await Promise.all([
    prisma.pool.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { creator: true, participants: true },
    }),
    prisma.pool.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <HomeClient
      initialPools={activePools}
      activePoolCount={activePoolCount}
      userName={session?.user?.name ?? null}
    />
  );
}
