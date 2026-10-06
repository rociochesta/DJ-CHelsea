import React from 'react';
import HostCameraPreview from './HostCameraPreview';

export default function QuizHostCamera({ hostId, isHost }) {
  return <details className="ml-auto w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-black/30">
    <summary className="cursor-pointer px-4 py-3 text-sm text-white/70">Host camera · show / hide</summary>
    <div className="aspect-video overflow-hidden"><HostCameraPreview hostIdentity={hostId} isHost={isHost} compact /></div>
  </details>;
}
