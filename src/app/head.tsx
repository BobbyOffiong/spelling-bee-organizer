// app/head.tsx
export default function Head() {
  return (
    <>
      <title>B's Spelling Bee Organizer</title>
      <meta name="description" content="Organize and manage spelling bees with ease!" />
      <meta name="theme-color" content="#10B981" />

      {/* PWA Essentials */}
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </>
  );
}
