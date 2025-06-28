'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/auth/signup'); // 👈 change this to your actual start page
  }, [router]);

  return null;
}
