import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast'; // import this line

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: "B's Spelling Bee Organizer",
  description: "Organize and run your spelling bee rounds with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
<link rel="icon" href="/images/competitionPage/bee192.png" />
      </head>
      <body
        className={`${poppins.variable} antialiased`}
      >

        {children}

        <Toaster position="top-center" />
      </body>
    </html>
  );
}
