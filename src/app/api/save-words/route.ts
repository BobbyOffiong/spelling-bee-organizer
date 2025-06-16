import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming body:', JSON.stringify(body, null, 2));

    const { competitionName, passkey, rounds } = body;

    if (
      !competitionName ||
      !passkey ||
      typeof rounds !== 'object' ||
      Array.isArray(rounds)
    ) {
      throw new Error(
        "Invalid input: competitionName, passkey, and rounds are required"
      );
    }

    const dirPath = path.join(process.cwd(), 'data', 'competitions');
    const filePath = path.join(dirPath, `${passkey}.json`);

    // Ensure the directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Load existing data if file exists, else create fresh structure
    let existingData = { competitionName, passkey, rounds: {} };
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (err) {
      console.log('No existing file found, creating a new one.');
    }

    // Merge the incoming rounds with existing rounds (update only rounds sent)
    for (const [roundName, wordList] of Object.entries(rounds)) {
      // Clean and renumber the incoming word list for this round
     const extractWord = (input: any): string => {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    if (typeof input.word === 'string') return input.word;
    if (input.word && typeof input.word === 'object') return extractWord(input.word);
  }
  return String(input);
};

const cleanedWords = (wordList as any[]).map((w, idx) => ({
  number: idx + 1,
  word: extractWord(w),
}));


      // Update just this round in existing data
      existingData.rounds[roundName] = cleanedWords;
    }

    // Save updated data back to file
    await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
