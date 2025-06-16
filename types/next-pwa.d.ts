// types/next-pwa.d.ts
declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAOptions {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    swSrc?: string;
    [key: string]: any;
  }

  type WithPWA = (config: NextConfig & { pwa?: PWAOptions }) => NextConfig;

  const withPWA: WithPWA;
  export default withPWA;
}

// 🔥 ADD THIS LINE!
export {};
