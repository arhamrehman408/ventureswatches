import React, { useState } from 'react';
import { CMSData } from '../types';
import { Award, Shield, Sparkles } from 'lucide-react';

interface CraftsmanshipSectionProps {
  cmsData: CMSData;
}

export const CraftsmanshipSection: React.FC<CraftsmanshipSectionProps> = ({ cmsData }) => {
  const [activeTab, setActiveTab] = useState(0);

  const pillars = [
    {
      id: 'original-watches',
      title: cmsData.originalWatchesTitle || 'Original Watches',
      subtitle: cmsData.originalWatchesSubtitle || 'Authentic Luxury Watches',
      icon: Award,
      description: cmsData.originalWatchesDesc || 'Genuine, manufacturer-verified timepieces sourced directly from world-renowned heritage houses. Every piece includes authenticated serial numbers, official documentation, and factory warranty.',
      image: cmsData.originalWatchesImage || '/uploads/vw-media-1791468942252-4107.jpeg'
    },
    {
      id: 'clone-watches',
      title: cmsData.cloneWatchesTitle || 'Clone Watches',
      subtitle: cmsData.cloneWatchesSubtitle || '1:1 Super Clone Engineering',
      icon: Shield,
      description: cmsData.cloneWatchesDesc || 'Meticulously crafted 1:1 super clones built with exact weight, genuine 904L stainless steel, ceramic bezel inserts, and clone-calibrated movements matching authentic dimensions down to the micron.',
      image: cmsData.cloneWatchesImage || '/uploads/vw-media-1791469041937-9926.jpeg'
    },
    {
      id: 'copy-watches',
      title: cmsData.copyWatchesTitle || 'Copy Watches',
      subtitle: cmsData.copyWatchesSubtitle || 'Accessible Style & Everyday Elegance',
      icon: Sparkles,
      description: cmsData.copyWatchesDesc || 'Stylish, high-value tribute designs combining iconic luxury aesthetics with reliable daily movements, durable stainless steel cases, and scratch-resistant crystals at accessible price points.',
      image: cmsData.copyWatchesImage || '/uploads/vw-media-1791469102846-3380.jpeg'
    }
  ];

  const currentPillar = pillars[activeTab];

  return (
    <section id="craftsmanship" className="py-24 bg-white text-[#0B192C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-semibold">
            {cmsData.craftsmanshipEyebrow || 'Watchmaking Standards'}
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-light text-[#0B192C]">
            {cmsData.craftsmanshipTitle || 'OUR WATCH CATEGORIES'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed">
            {cmsData.craftsmanshipText || 'Discover our carefully graded selection of luxury watches, offering clear transparency across authentic luxury timepieces, master super clones, and accessible homage designs.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center border-b border-gray-200">
          <div className="flex space-x-2 sm:space-x-8 overflow-x-auto pb-px">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={pillar.id}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-2 py-4 px-3 sm:px-4 text-xs uppercase tracking-[0.2em] font-medium border-b-2 transition-all duration-300 transform active:scale-95 ${
                    isActive
                      ? 'border-[#0B192C] text-[#0B192C] font-bold shadow-sm'
                      : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className={`transition-transform duration-300 ${isActive ? 'text-amber-600 scale-110' : ''}`} />
                  <span>{pillar.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Box */}
        <div 
          key={currentPillar.id}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-[#F9FAFB] p-8 sm:p-12 border border-gray-200 rounded-sm shadow-sm hover:shadow-md transition-all duration-500 animate-fade-in"
        >
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-block text-[10px] uppercase tracking-[0.25em] text-amber-700 font-bold px-2.5 py-1 bg-amber-50 rounded border border-amber-200/60 animate-fade-in">
              {currentPillar.subtitle}
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[#0B192C]">
              {currentPillar.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed">
              {currentPillar.description}
            </p>
          </div>

          <div className="lg:col-span-6 relative aspect-[4/3] bg-slate-900 border border-gray-200 overflow-hidden flex items-center justify-center rounded group shadow-inner">
            {currentPillar.image ? (
              <img
                src={currentPillar.image}
                alt={currentPillar.title}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('vw-media-1791468942252-4107.jpeg')) {
                    target.src = '/uploads/vw-media-1791468942252-4107.jpeg';
                  }
                }}
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0B192C] via-[#102540] to-[#0B192C] flex flex-col items-center justify-center p-8 text-center text-white space-y-4 group-hover:scale-105 transition-transform duration-700">
                <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shadow-inner animate-float-gentle">
                  {React.createElement(currentPillar.icon, { size: 32, className: "text-amber-400" })}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-semibold block">
                    {currentPillar.subtitle}
                  </span>
                  <h4 className="text-xl font-serif font-light text-white">{currentPillar.title}</h4>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
