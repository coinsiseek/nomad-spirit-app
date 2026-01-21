import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logonomad.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#18181b" />
        {/* iOS homescreen icon support */}
        <link rel="apple-touch-icon" sizes="192x192" href="/logonomad%20(192).png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/logonomad%20(512).png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`}>
        {children}
      </body>
    </html>
  );
}