import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionName = searchParams.get('competitionName');
    const passkey = searchParams.get('passkey');
    const round = searchParams.get('round');

    if (!competitionName || !passkey || !round) {
      return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'competitions', `${passkey}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Competition file not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const rounds = data.rounds || {};

    const roundKey = `Round ${round}`;
    const words = rounds[roundKey] || [];

    return NextResponse.json({ words });
  } catch (error) {
    console.error('Error reading words:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
