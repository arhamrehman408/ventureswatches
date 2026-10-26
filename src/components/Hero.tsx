import React from 'react';
import { ArrowDown } from 'lucide-react';
import { CMSData } from '../types';
import { BackgroundVideo } from './BackgroundVideo';

interface HeroProps {
  cmsData: CMSData;
  onExplore: () => void;
  onCraftsmanship?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ cmsData, onExplore }) => {
  // Use video that was uploaded or set from the Admin Dashboard / Console
  const hasUploadedVideo = Boolean(
    cmsData.heroVideoUrl && cmsData.heroVideoUrl.trim().length > 0
  );
  const watchVideoUrl = hasUploadedVideo ? cmsData.heroVideoUrl.trim() : '';

  // Hero Video Overlay Transparency configured from Admin Dashboard CMS
  // Default is 0 (100% transparent, crystal clear video)
  const overlayMode = cmsData.heroVideoOverlay || 'transparent';
  const overlayOpacity = typeof cmsData.heroVideoOpacity === 'number'
    ? cmsData.heroVideoOpacity
    : (overlayMode === 'transparent' ? 0 : overlayMode === 'translucent' ? 25 : 60);

  return (
    <section className="relative w-full h-screen min-h-[650px] flex items-center justify-center overflow-hidden bg-[#0B192C]">
      {/* Background Watch Video Artifact (Active when set via Admin Dashboard) */}
      <div className="absolute inset-0 z-0 bg-[#070e18]">
        {hasUploadedVideo ? (
          <BackgroundVideo
            videoUrl={watchVideoUrl}
            isMuted={true}
            isPlaying={true}
            className="w-full h-full object-cover scale-105 transition-transform duration-1000"
          />
        ) : cmsData.heroImageUrl ? (
          <img
            src={cmsData.heroImageUrl}
            alt="Ventures Watches – Luxury Timepieces in Pakistan"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#070e18] via-[#0B192C] to-[#04080e]" />
        )}

        {/* Video Overlay Layer: Transparent by default (0% overlay) or Translucent / Dark per Admin Dashboard */}
        {hasUploadedVideo ? (
          overlayOpacity > 0 ? (
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/90 via-black/50 to-black/60 pointer-events-none transition-opacity duration-500"
              style={{ opacity: overlayOpacity / 100 }}
            />
          ) : null
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-black/50 to-black/70 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(11,25,44,0.7)_100%)] pointer-events-none" />
          </>
        )}
      </div>

      {/* Scroll Down Indicator (Clean icon only - No text in hero) */}
      <div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-center text-white/70 hover:text-amber-300 transition-colors cursor-pointer animate-float" 
        onClick={onExplore}
        aria-label="Explore Collection"
      >
        <ArrowDown size={18} className="mx-auto animate-bounce" />
      </div>
    </section>
  );
};

