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
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`}>
        {children}
      </body>
    </html>
  );
}