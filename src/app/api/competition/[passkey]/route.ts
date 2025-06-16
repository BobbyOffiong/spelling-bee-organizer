import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: Request, { params }: { params: { passkey: string } }) {
  const { passkey } = params;

  const filePath = path.join(process.cwd(), 'data', 'competitions', `${passkey}.json`);

  try {
    const fileContents = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(fileContents));
  } catch (error) {
    return NextResponse.json({ error: 'Competition not found.' }, { status: 404 });
  }
}
