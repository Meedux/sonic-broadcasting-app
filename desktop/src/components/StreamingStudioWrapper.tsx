// VideoSDK wrapper component for client-side only rendering
'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Define the props for the StreamingStudio component
interface StreamingStudioProps {
  meetingId: string;
  onStreamingEnd: () => void;
}

// Dynamically import the StreamingStudio component
const StreamingStudioWrapper = dynamic(
  () => import('./StreamingStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Streaming Studio...</h2>
        </div>
      </div>
    ),
  }
) as ComponentType<StreamingStudioProps>;

export default StreamingStudioWrapper;