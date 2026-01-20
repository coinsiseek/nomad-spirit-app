
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-glass border border-glass rounded-xl p-6 backdrop-blur-xs text-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Nomad Spirit BJJ</h1>
        <p className="text-gray-300 mb-6">Track your gym passes and progress</p>
        <Link
          href="/login"
          className="inline-block py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded font-medium"
        >
          Log In / Sign Up
        </Link>
      </div>
    </div>
  );
}