// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { saveUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const hashedPassword = await hash(password, 10);

  await saveUser({
    id: uuidv4(),
    email,
    password: hashedPassword,
  });

  return NextResponse.json({ success: true });
}
