import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { pusher } from '../../lib/pusher';
import {
  AuthError,
  requireSessionUser,
  getOrCreateUser,
  assertPoolMember,
} from '../../../lib/auth-helpers';
import { poolChannel } from '../../../lib/pusher-channels';

export async function POST(req: Request) {
  try {
    const { email, name } = await requireSessionUser()
    const { poolId, text } = await req.json();

    if (!poolId || !text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    await assertPoolMember(poolId, email)

    const user = await getOrCreateUser(email, name)

    const messageCount = await prisma.message.count({
      where: { poolId, senderId: user.id },
    });

    if (messageCount >= 15) {
      return NextResponse.json({ error: 'Message limit reached (15 max)' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        poolId,
        senderId: user.id,
      },
      include: {
        sender: { select: { name: true } }, 
      },
    });

    await pusher.trigger(poolChannel(poolId), 'new-message', message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { email } = await requireSessionUser()
    const { searchParams } = new URL(req.url);
    const poolId = searchParams.get('poolId');

    if (!poolId) return NextResponse.json([]);

    await assertPoolMember(poolId, email)

    const messages = await prisma.message.findMany({
      where: { poolId },
      include: {
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Fetch chat error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
