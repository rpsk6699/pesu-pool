import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import Pusher from 'pusher';

// Initialize the Pusher server using your existing keys
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const { poolId, userName, text } = await req.json();

    if (!poolId || !userName || !text) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Find the user based on their exact username in the database
    const user = await prisma.user.findFirst({
      where: { name: userName },
    });

    if (!user) return NextResponse.json({ error: `User '${userName}' not found` }, { status: 404 });

    // --- ADD THIS BLOCK ---
    // Check how many messages this user has already sent in this pool
    const messageCount = await prisma.message.count({
      where: { poolId, senderId: user.id },
    });

    if (messageCount >= 15) {
      return NextResponse.json({ error: 'Message limit reached (15 max)' }, { status: 403 });
    }
    // ----------------------

    // 2. Save the message to the database
    const message = await prisma.message.create({
      data: {
        text,
        poolId,
        senderId: user.id,
      },
      include: {
        sender: { select: { name: true } }, 
      },
    });

    // 3. Blast the message out via Pusher
    await pusher.trigger(poolId, 'new-message', message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poolId = searchParams.get('poolId');

    if (!poolId) return NextResponse.json([]);

    // Fetch all messages for this specific pool, in chronological order
    const messages = await prisma.message.findMany({
      where: { poolId },
      include: {
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Fetch chat error:', error);
    return NextResponse.json([], { status: 500 });
  }
}