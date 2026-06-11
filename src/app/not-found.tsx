import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pitch-dark to-pitch-green flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl font-black mb-2">404</h1>
        <p className="text-green-100 mb-6">This page is out of bounds.</p>
        <Link
          href="/"
          className="bg-white text-pitch-dark font-bold px-6 py-2 rounded-full hover:bg-green-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
