'use client';

import BackgroundRemover from '@/components/BackgroundRemover';

export default function RemoveBackgroundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white py-8">
      <BackgroundRemover />
    </div>
  );
}
