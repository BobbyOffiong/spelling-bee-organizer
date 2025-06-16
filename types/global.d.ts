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

  const withPWA: (config: NextConfig & { pwa?: PWAOptions }) => NextConfig;
  export default withPWA;
}
