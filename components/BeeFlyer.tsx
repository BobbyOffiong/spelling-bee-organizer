'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function BeeFlyer({ onFinish }: { onFinish: () => void }) {
  const [start, setStart] = useState(false);

  useEffect(() => {
    setStart(true);
    const timer = setTimeout(() => {
      onFinish();
    }, 6000); // animation duration
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-green-50 flex items-center justify-start overflow-hidden">
      <div
        className={`w-60 h-60 animate-buzz 
        transition-transform duration-[6000ms] ease-in-out
        ${start ? 'translate-x-[100vw]' : 'translate-x-0'}`}
      >
        <Image
          src="/images/competitionPage/bee2.png"
          alt="Bee"
          width={100}
          height={100}
          className="w-full h-full"
          priority
        />
      </div>
    </div>
  );
}
