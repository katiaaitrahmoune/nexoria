"use client";

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues
const SeismicMap = dynamic(() => import('../components/SeismicMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export default function GISMapPage() {
  return <SeismicMap />;
}