import React from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
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

  // Determine visibility and text for every hero element
  const showEyebrow = cmsData.heroShowSubtitle !== false && 
    (cmsData.heroSubtitle !== undefined ? cmsData.heroSubtitle.trim().length > 0 : true);
  const heroSubtitle = cmsData.heroSubtitle !== undefined ? cmsData.heroSubtitle : '100% Authentic Watches & High-End Clones';

  const showTitle = cmsData.heroShowTitle !== false && 
    (cmsData.heroTitle !== undefined ? cmsData.heroTitle.trim().length > 0 : true);
  const heroTitle = cmsData.heroTitle !== undefined ? cmsData.heroTitle : 'VENTURES WATCHES';

  const showStatement = cmsData.heroShowStatement !== false && 
    (cmsData.brandStatement !== undefined ? cmsData.brandStatement.trim().length > 0 : true);
  const brandStatement = cmsData.brandStatement !== undefined ? cmsData.brandStatement : 'Featuring Timepieces from the World’s Finest Brands. ⌚✨';

  const hasAnyHeroText = showEyebrow || showTitle || showStatement;

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

      {/* Hero Content */}
      {hasAnyHeroText && (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center text-white space-y-6 pt-16">
          {showEyebrow && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-[11px] sm:text-xs uppercase tracking-[0.25em] font-semibold text-amber-300 border border-amber-300/40 shadow-xl animate-fade-in hover:border-amber-300/60 transition-all duration-300">
              <Sparkles size={13} className="text-amber-300 shrink-0 animate-spin-slow" />
              <span className="tracking-[0.2em]">{heroSubtitle}</span>
            </div>
          )}

          {showTitle && (
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif tracking-[0.15em] font-light leading-none uppercase text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] animate-slide-up delay-100">
              {heroTitle}
            </h1>
          )}

          {showStatement && (
            <p className="text-sm sm:text-base md:text-lg font-light text-slate-100 max-w-2xl mx-auto tracking-wider leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] animate-slide-up delay-200">
              {brandStatement}
            </p>
          )}
        </div>
      )}

      {/* Scroll Down Indicator */}
      <div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-center text-white/70 hover:text-amber-300 transition-colors cursor-pointer animate-float" 
        onClick={onExplore}
      >
        <span className="block text-[9px] uppercase tracking-[0.3em] mb-1 font-light">Explore</span>
        <ArrowDown size={16} className="mx-auto animate-bounce" />
      </div>
    </section>
  );
};

