// lib/auth.ts
import { promises as fs } from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  password: string;
}

const USERS_FILE = path.join(process.cwd(), 'data/user-data', 'users.json');

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const users: User[] = JSON.parse(data);
    return users.find((user) => user.email === email) || null;
  } catch {
    return null;
  }
}

export async function saveUser(user: User): Promise<void> {
  try {
    // Ensure the folder exists
    const dir = path.dirname(USERS_FILE);
    await fs.mkdir(dir, { recursive: true });

    let users: User[] = [];

    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      users = JSON.parse(data);
    } catch {
      // File might not exist — that's okay
      users = [];
    }

    users.push(user);

    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Failed to save user:', error);
    throw new Error('Could not save user');
  }
}
