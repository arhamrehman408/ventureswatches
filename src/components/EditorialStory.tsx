import React from 'react';
import { CMSData } from '../types';
import { Compass, Shield, Award, Sparkles } from 'lucide-react';

interface EditorialStoryProps {
  cmsData: CMSData;
  onExplore: () => void;
}

export const EditorialStory: React.FC<EditorialStoryProps> = ({ cmsData, onExplore }) => {
  const editorialImageSrc = cmsData.editorialImage || '/uploads/vw-media-1787123090324-6787.jpeg';

  return (
    <section className="py-24 bg-[#0B192C] text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand Quote */}
        <div className="text-center max-w-4xl mx-auto mb-20 space-y-4">
          <span className="text-[10px] uppercase tracking-[0.35em] text-amber-400 font-semibold">
            Ventures Brand Manifesto
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif leading-tight font-light tracking-wide text-white">
            "{cmsData.brandStatement || 'VENTURES WATCHES COMBINES SWISS PRECISION ARCHITECTURE WITH UNCOMPROMISING LUXURY.'}"
          </h2>
          {cmsData.brandAuthor && (
            <p className="text-xs text-amber-300/80 font-mono tracking-widest uppercase">
              — {cmsData.brandAuthor}
            </p>
          )}
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Image with Overlay Badge */}
          <div className="lg:col-span-7 relative group">
            <div className="aspect-[16/10] bg-[#061536] overflow-hidden shadow-2xl relative border border-white/10 flex items-center justify-center rounded-sm">
              {editorialImageSrc ? (
                <img
                  src={editorialImageSrc}
                  alt="Ventures Watches Curated Timepieces"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('vw-media-1791469933635-3621.jpeg')) {
                      target.src = '/uploads/vw-media-1791469933635-3621.jpeg';
                    }
                  }}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0B192C] via-[#102a4e] to-[#061536] flex flex-col items-center justify-center p-8 text-center text-white space-y-3 group-hover:scale-105 transition-transform duration-700">
                  <div className="w-20 h-20 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center shadow-lg animate-float-gentle">
                    <Sparkles size={36} className="text-amber-400" />
                  </div>
                  <span className="text-sm font-serif tracking-widest text-amber-300">VENTURES WATCHES</span>
                  <span className="text-xs text-slate-400 max-w-sm font-light">Fine Curated Timepieces & Luxury Watches Showcase</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/40 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="absolute -bottom-6 -right-6 hidden sm:block bg-amber-500 text-slate-950 p-6 shadow-2xl max-w-xs font-serif rounded-sm animate-float">
              <div className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest font-bold mb-1">
                <Sparkles size={16} className="text-slate-950 animate-spin-slow" />
                <span>{cmsData.editorialBadgeTitle || 'FIND YOUR TIMEPIECE'}</span>
              </div>
              <p className="text-xs leading-relaxed font-sans font-medium text-slate-900">
                {cmsData.editorialBadgeText || 'Explore our collection and discover a watch that matches your style.'}
              </p>
            </div>
          </div>

          {/* Right Column: Editorial Text Content */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold block">
                {cmsData.editorialEyebrow || 'CURATED TIMEPIECES'}
              </span>
              <h3 className="text-3xl sm:text-4xl font-serif font-light leading-tight uppercase text-white">
                {cmsData.editorialTitle || 'TIMEPIECES WORTH DISCOVERING'}
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              <p>
                {cmsData.editorialText || 'From authentic luxury watches to meticulously selected high-end alternatives, Ventures Watches brings together an exceptional range of timepieces from renowned names in luxury watches.'}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors duration-300">
                <div className="p-2.5 bg-white/10 rounded-full text-amber-400 shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                    {cmsData.editorialFeature1Title || 'AUTHENTIC WATCHES'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cmsData.editorialFeature1Text || 'Genuine timepieces from established and sought-after brands.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors duration-300">
                <div className="p-2.5 bg-white/10 rounded-full text-amber-400 shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                    {cmsData.editorialFeature2Title || 'HIGH-END COLLECTION'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cmsData.editorialFeature2Text || '1:1 Super Clone Engineering matching authentic dimensions down to the micron.'}
                  </p>
                </div>
              </div>

              {(cmsData.editorialFeature3Title || cmsData.editorialFeature3Text) && (
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors duration-300">
                  <div className="p-2.5 bg-white/10 rounded-full text-amber-400 shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                      {cmsData.editorialFeature3Title || 'CHECKING WARRANTY'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cmsData.editorialFeature3Text?.replace(/7-day/gi, '3-day').replace(/7 days/gi, '3 days') || 'Comprehensive 3-day verification warranty backing every timepiece.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={onExplore}
                className="btn-luxury-action bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs uppercase tracking-[0.25em] font-semibold py-4 px-8 rounded transition-all shadow-xl font-mono"
              >
                {cmsData.editorialCtaText || 'EXPLORE CURATED CATALOGUE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
