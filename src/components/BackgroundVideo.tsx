import React, { useState, useEffect, useRef } from 'react';

interface BackgroundVideoProps {
  videoUrl: string;
  posterUrl?: string;
  isMuted?: boolean;
  isPlaying?: boolean;
  className?: string;
  onVideoError?: () => void;
}

export interface VideoSourceInfo {
  type: 'youtube' | 'vimeo' | 'drive' | 'pixabay' | 'streamable' | 'dailymotion' | 'tiktok' | 'loom' | 'wistia' | 'iframe' | 'direct';
  url: string;
  embedUrl?: string;
  videoId?: string;
}

export function parseVideoUrl(inputUrl: string): VideoSourceInfo {
  if (!inputUrl) return { type: 'direct', url: '' };

  let url = inputUrl.trim();

  // 1. Raw <iframe> HTML tag paste extraction
  if (url.includes('<iframe')) {
    const srcMatch = url.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1];
    }
  }

  // Pixabay Direct CDN or Page Link
  if (url.includes('cdn.pixabay.com')) {
    return {
      type: 'direct',
      url
    };
  }

  if (url.includes('pixabay.com')) {
    // Map of known Pixabay watch & clock video IDs directly to CDN MP4 streams
    const pixabayIdMap: Record<string, string> = {
      '207863': 'https://cdn.pixabay.com/video/2024/04/13/207863_large.mp4',
      '83907': 'https://cdn.pixabay.com/video/2021/08/04/83907-584742721_large.mp4',
      '133682': 'https://cdn.pixabay.com/video/2022/10/05/133682-757832822_large.mp4',
      '37731': 'https://cdn.pixabay.com/video/2020/05/01/37731-415510659_large.mp4',
      '5361': 'https://cdn.pixabay.com/video/2016/09/21/5361-183788398_large.mp4',
      '25890': 'https://cdn.pixabay.com/video/2019/08/11/25890-353272911_large.mp4',
      '103859': 'https://cdn.pixabay.com/video/2022/01/08/103859-664426868_large.mp4',
      '159424': 'https://cdn.pixabay.com/video/2023/04/18/159424-818780791_large.mp4',
      '62077': 'https://cdn.pixabay.com/video/2021/01/15/62077-501869382_large.mp4',
      '48731': 'https://cdn.pixabay.com/video/2020/08/30/48731-455431690_large.mp4',
      '16559': 'https://cdn.pixabay.com/video/2018/06/07/16559-273578768_large.mp4',
    };

    const idMatch = url.match(/-(?:video-)?(\d+)\/?$/i) || url.match(/\/(\d+)\/?$/);
    if (idMatch && idMatch[1] && pixabayIdMap[idMatch[1]]) {
      return {
        type: 'direct',
        url: pixabayIdMap[idMatch[1]]
      };
    }

    return {
      type: 'pixabay',
      url
    };
  }

  // 2. YouTube matchers (watch, shorts, embed, live, youtu.be, m.youtube)
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      url,
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&playsinline=1&disablekb=1&autohide=1`
    };
  }

  // 3. Vimeo matchers
  const vimeoRegex = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+))/i;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      url,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1&autopause=0&playsinline=1`
    };
  }

  // 4. Google Drive matchers
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_\-]+)/i;
  const driveMatch = url.match(driveRegex);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: 'drive',
      url,
      videoId: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`
    };
  }

  // 5. Loom matchers
  const loomRegex = /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i;
  const loomMatch = url.match(loomRegex);
  if (loomMatch && loomMatch[1]) {
    const id = loomMatch[1];
    return {
      type: 'loom',
      url,
      videoId: id,
      embedUrl: `https://www.loom.com/embed/${id}?autoplay=1&muted=1&hide_owner=true&hide_share=true&hide_title=true`
    };
  }

  // 6. Wistia matchers
  const wistiaRegex = /(?:wistia\.com|fast\.wistia\.net)\/(?:medias|embed\/iframe)\/([a-zA-Z0-9]+)/i;
  const wistiaMatch = url.match(wistiaRegex);
  if (wistiaMatch && wistiaMatch[1]) {
    const id = wistiaMatch[1];
    return {
      type: 'wistia',
      url,
      videoId: id,
      embedUrl: `https://fast.wistia.net/embed/iframe/${id}?autoPlay=true&muted=true`
    };
  }

  // 7. Streamable matchers
  const streamableRegex = /streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/i;
  const streamableMatch = url.match(streamableRegex);
  if (streamableMatch && streamableMatch[1]) {
    const code = streamableMatch[1];
    return {
      type: 'streamable',
      url,
      videoId: code,
      embedUrl: `https://streamable.com/e/${code}?autoplay=1&muted=1&nocontrols=1`
    };
  }

  // 8. Dailymotion matchers
  const dmRegex = /(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i;
  const dmMatch = url.match(dmRegex);
  if (dmMatch && dmMatch[1]) {
    const videoId = dmMatch[1];
    return {
      type: 'dailymotion',
      url,
      videoId,
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1&controls=0&ui-logo=0`
    };
  }

  // 9. TikTok matchers
  const tiktokRegex = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i;
  const tiktokMatch = url.match(tiktokRegex);
  if (tiktokMatch && tiktokMatch[1]) {
    const videoId = tiktokMatch[1];
    return {
      type: 'tiktok',
      url,
      videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`
    };
  }

  // 10. Dropbox direct link transform
  if (url.includes('dropbox.com')) {
    const directUrl = url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1').replace('dl=0', 'dl=1');
    return {
      type: 'direct',
      url: directUrl
    };
  }

  // 11. OneDrive transform
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    const directUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
    return {
      type: 'direct',
      url: directUrl
    };
  }

  // 12. Imgur gifv transform
  if (url.endsWith('.gifv')) {
    return {
      type: 'direct',
      url: url.replace('.gifv', '.mp4')
    };
  }

  // 13. Direct embed URL check
  if (url.includes('/embed') || url.includes('player.')) {
    return {
      type: 'iframe',
      url,
      embedUrl: url
    };
  }

  return {
    type: 'direct',
    url
  };
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  videoUrl,
  posterUrl,
  isMuted = true,
  isPlaying = true,
  className = "w-full h-full object-cover",
  onVideoError
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryWithProxy, setRetryWithProxy] = useState(false);
  const [resolvedPixabayUrl, setResolvedPixabayUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const parsed = parseVideoUrl(videoUrl);

  // Handle Pixabay page URL resolution if needed
  useEffect(() => {
    if (parsed.type === 'pixabay' && parsed.url) {
      fetch(`/api/pixabay-resolve?url=${encodeURIComponent(parsed.url)}`)
        .then(res => res.json())
        .then(data => {
          if (data?.directUrl) {
            setResolvedPixabayUrl(data.directUrl);
          } else {
            setResolvedPixabayUrl(null);
          }
        })
        .catch(() => {
          setResolvedPixabayUrl(null);
        });
    } else {
      setResolvedPixabayUrl(null);
    }
  }, [videoUrl, parsed.type, parsed.url]);

  let activeVideoUrl = resolvedPixabayUrl || parsed.url || '';
  if (activeVideoUrl.includes('mixkit-mechanical-clock-gears-turning-41551') || activeVideoUrl.includes('207863_large.mp4')) {
    activeVideoUrl = '';
  }

  // If initial load failed, try our server video stream proxy
  if (retryWithProxy && activeVideoUrl.startsWith('http') && !activeVideoUrl.startsWith('/')) {
    activeVideoUrl = `/api/video-stream?url=${encodeURIComponent(activeVideoUrl)}`;
  }

  if (!activeVideoUrl) {
    return posterUrl ? (
      <img src={posterUrl} alt="Background" className={className} />
    ) : null;
  }

  const isDirect = parsed.type === 'direct' || Boolean(resolvedPixabayUrl) || retryWithProxy || activeVideoUrl.endsWith('.mp4');

  // Handle autoplay and playback state changes cleanly
  useEffect(() => {
    setHasError(false);
    const video = videoRef.current;
    if (!isDirect || !video) return;

    const attemptPlay = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.volume = 0;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('autoplay', '');
      if (isPlaying && v.paused) {
        const p = v.play();
        if (p !== undefined) {
          p.catch(() => {
            // Browser autoplay policy deferred until user gesture or buffer ready
          });
        }
      }
    };

    // Immediate attempt
    attemptPlay();

    // Aggressive watchdog: attempt play every 250ms until video is confirmed playing
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const v = videoRef.current;
      if (!v || (!v.paused && v.currentTime > 0) || attempts > 24) {
        if (!v?.paused) {
          clearInterval(interval);
        }
        return;
      }
      attemptPlay();
    }, 250);

    return () => clearInterval(interval);
  }, [activeVideoUrl, isPlaying, isDirect, isMuted]);

  // Comprehensive User Interaction Fallback for video play across all devices & browsers
  useEffect(() => {
    if (!isDirect) return;

    const handleInteraction = () => {
      const v = videoRef.current;
      if (v && isPlaying && v.paused) {
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.volume = 0;
        v.play().catch(() => {});
      }
    };

    const events = [
      'touchstart',
      'touchend',
      'scroll',
      'click',
      'keydown',
      'mousemove',
      'pointerdown',
      'mousedown',
      'visibilitychange',
      'focus',
      'pageshow'
    ];
    events.forEach(evt => window.addEventListener(evt, handleInteraction, { passive: true }));
    events.forEach(evt => document.addEventListener(evt, handleInteraction, { passive: true }));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleInteraction));
      events.forEach(evt => document.removeEventListener(evt, handleInteraction));
    };
  }, [isDirect, isPlaying, isMuted]);

  const handleError = () => {
    if (!retryWithProxy && activeVideoUrl.startsWith('http') && !activeVideoUrl.startsWith('/api/')) {
      // Retry once via server video streaming proxy
      setRetryWithProxy(true);
    } else {
      setHasError(true);
      if (onVideoError) onVideoError();
    }
  };

  const renderIframeBackground = (src: string, title = "Background Video") => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <iframe
        src={src}
        className="w-[300%] h-[300%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover pointer-events-none border-none opacity-100 scale-105"
        allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
        title={title}
      />
    </div>
  );

  if (hasError) {
    return posterUrl ? (
      <img src={posterUrl} alt="Background" className={className} />
    ) : null;
  }

  // Render iframe embeds for YouTube, Vimeo, Drive, Loom, Wistia, Streamable, Dailymotion, TikTok, custom iframe
  if (parsed.type === 'youtube' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "YouTube Background Video");
  }

  if (parsed.type === 'vimeo' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Vimeo Background Video");
  }

  if (parsed.type === 'drive' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Google Drive Background Video");
  }

  if (parsed.type === 'loom' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Loom Background Video");
  }

  if (parsed.type === 'wistia' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Wistia Background Video");
  }

  if (parsed.type === 'streamable' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Streamable Background Video");
  }

  if (parsed.type === 'dailymotion' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Dailymotion Background Video");
  }

  if (parsed.type === 'tiktok' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "TikTok Background Video");
  }

  if (parsed.type === 'iframe' && parsed.embedUrl) {
    return renderIframeBackground(parsed.embedUrl, "Embedded Background Video");
  }

  // Direct MP4/WebM/MOV/AVI/MKV/3GP/Pixabay/Data URL/Server Stream Video
  return (
    <video
      key={activeVideoUrl}
      ref={(el) => {
        if (el) {
          el.muted = true;
          el.defaultMuted = true;
          el.playsInline = true;
          el.volume = 0;
          el.setAttribute('muted', '');
          el.setAttribute('playsinline', '');
          el.setAttribute('webkit-playsinline', '');
          el.setAttribute('autoplay', '');
          if (isPlaying && el.paused) {
            el.play().catch(() => {});
          }
        }
        (videoRef as any).current = el;
      }}
      src={activeVideoUrl}
      autoPlay={isPlaying}
      loop
      muted
      playsInline
      preload="auto"
      onError={handleError}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.volume = 0;
        if (isPlaying && v.paused) v.play().catch(() => {});
      }}
      onCanPlay={(e) => {
        const v = e.currentTarget;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.volume = 0;
        if (isPlaying && v.paused) v.play().catch(() => {});
      }}
      onCanPlayThrough={(e) => {
        const v = e.currentTarget;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.volume = 0;
        if (isPlaying && v.paused) v.play().catch(() => {});
      }}
      onLoadedData={(e) => {
        const v = e.currentTarget;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.volume = 0;
        if (isPlaying && v.paused) v.play().catch(() => {});
      }}
      onPause={(e) => {
        const v = e.currentTarget;
        if (isPlaying && v.paused) {
          v.play().catch(() => {});
        }
      }}
      poster={posterUrl}
      className={className}
    >
      <source src={activeVideoUrl} type="video/mp4" />
    </video>
  );
};

