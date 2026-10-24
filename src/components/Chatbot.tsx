import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Product, Collection } from '../types';
import {
  MessageCircle, X, Send, Sparkles, Bot, User, Clock, ArrowRight,
  ShieldCheck, RefreshCw, ExternalLink, HelpCircle, ShoppingBag,
  PhoneCall, Crown, Maximize2, Minimize2, CheckCircle2, Tag,
  Layers, Search, Eye, CreditCard, Truck, ChevronRight, Mic,
  MicOff, Volume2, VolumeX, PhoneOff, Radio, Play
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedProducts?: Product[];
}

interface ChatbotProps {
  products: Product[];
  collections?: Collection[];
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'chat' | 'call';
  onSelectProduct?: (product: Product) => void;
  onNavigate?: (section: string) => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({
  products = [],
  collections = [],
  isOpen,
  onClose,
  initialMode = 'chat',
  onSelectProduct,
  onNavigate
}) => {
  const [mode, setMode] = useState<'chat' | 'call'>(initialMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [callInputText, setCallInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Live Call states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ur-PK' | 'en-US'>('en-US');
  const speechLangRef = useRef<'ur-PK' | 'en-US'>('en-US');
  speechLangRef.current = speechLang;

  const [callTranscript, setCallTranscript] = useState<{ user: string; bot: string }>({
    user: '',
    bot: 'Ventures Luxury Watch Advisor connected. Tap the microphone or tap any question below to hear me speak in English (or say "talk in Urdu" anytime)!'
  });

  // State refs to prevent stale closure bugs in Speech Recognition
  const isCallActiveRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const lastSpokenQueryRef = useRef<string>('');

  // Audio Context for crystal-clear chime
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome-1',
    role: 'assistant',
    content: `✨ **Welcome to VENTURES WATCHES Luxury Watch Advisor** ✨\n\nI am your dedicated personal watch specialist. I converse in English by default, and I will gladly speak in Urdu whenever you ask me to speak in Urdu!\n\n• **Watch Recommendations by Company**: Tell me any company (Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier, Tag Heuer, etc.) and I will suggest the best model logically according to specs!\n• **Specs & Engineering**: 904L steel, sapphire glass, ceramic bezel, power reserve & 3 days warranty\n• **Price Ranges & Budgets**: Clear tier breakdown from PKR 8,500 to PKR 185,000+\n• **Live Voice Call (English by Default)**: Speak with me live anytime using the **🎙️ Live Call** option. If you prefer Urdu, simply say *"Talk in Urdu"* or tap the language toggle!\n• **🛒 How to Order**:\n  1. **Order directly from this website**: Use "Add to Bag" / "Buy Now" for fast online checkout and 3 days checking warranty.\n  2. **Order via WhatsApp**: Message our team at **0319 2265524** (+92 319 2265524) for live wrist photos/videos.\n\n*How may I assist you with your luxury timepiece selection today?*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const messagesRef = useRef<ChatMessage[]>([initialWelcomeMessage]);
  messagesRef.current = messages;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync mode with prop when opened
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'call') {
        setMode('call');
        startLiveCall();
      } else {
        setMode('chat');
      }
    } else {
      stopLiveCall();
    }
  }, [isOpen, initialMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, mode, messages]);

  // Sync refs with reactive state
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Voice Call Timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Play luxury crystal chime using Web Audio API
  const playConciergeChime = (type: 'connect' | 'reply' | 'listen' = 'reply') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'connect') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
      } else if (type === 'listen') {
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
      } else {
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.18); // C5
      }

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Text-To-Speech function using Web Speech Synthesis
  const speakText = (text: string) => {
    if (isSpeakerMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      playConciergeChime('reply');

      // Clean markdown tags and emojis for pristine voice pronunciation
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/•/g, '')
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .slice(0, 320); // Keep spoken answer prompt and punchy

      // Detect whether the text is explicitly in Urdu script or authentic Roman Urdu
      const isUrduScript = /[\u0600-\u06FF]/.test(cleanText);
      const isAuthenticUrduWords = /(\b(aap|hamari|ghari|ghariyan|ghariyo|karein|karna|hoga|shukriya|rabta|pesh|qeemat|rupay|tajweez|mojood|khareed)\b)/i.test(cleanText);
      const shouldUseUrduVoice = isUrduScript || (speechLangRef.current === 'ur-PK' && isAuthenticUrduWords);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();

      if (shouldUseUrduVoice) {
        utterance.rate = 0.94; // Natural cadence for Urdu
        utterance.lang = 'ur-PK';

        // 1. Search for genuine Pakistani Urdu voice (ur-PK or Urdu)
        let matchedVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase().replace('_', '-');
          const n = (v.name || '').toLowerCase();
          return l.startsWith('ur') || n.includes('urdu') || n.includes('pakistan');
        });

        // 2. If browser has no specific ur-PK voice installed, use Hindustani/South-Asian native voice
        // (hi-IN) which shares the exact same phonological system, avoiding English phonetic slaughter!
        if (!matchedVoice) {
          matchedVoice = voices.find(v => {
            const l = (v.lang || '').toLowerCase().replace('_', '-');
            const n = (v.name || '').toLowerCase();
            return l.startsWith('hi') || n.includes('hindi') || n.includes('kalpana') || n.includes('swara') || n.includes('madhur');
          });
        }

        // 3. Fallback: Indian English or multilingual voice rather than UK/US English for South Asian words
        if (!matchedVoice) {
          matchedVoice = voices.find(v => {
            const l = (v.lang || '').toLowerCase().replace('_', '-');
            const n = (v.name || '').toLowerCase();
            return l === 'en-in' || n.includes('india') || n.includes('veena') || n.includes('neerja');
          });
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang;
        }
      } else {
        utterance.rate = 1.0;
        utterance.lang = 'en-US';
        if (voices.length > 0) {
          const preferredVoice = voices.find(v =>
            v.name.includes('Natural') ||
            v.name.includes('Google UK English') ||
            v.name.includes('Google US English') ||
            v.name.includes('Daniel') ||
            v.name.includes('Arthur') ||
            v.name.includes('Samantha') ||
            (v.lang && v.lang.startsWith('en'))
          );
          if (preferredVoice) utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause microphone while bot is speaking so it doesn't transcribe its own voice
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        (window as any).__vw_active_utterance = null;
        // Resume listening automatically after speaking if call is active and not muted
        if (isCallActiveRef.current && !isMicMutedRef.current && !isLoadingRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                } else {
                  const recog = initSpeechRecognition();
                  if (recog) {
                    recognitionRef.current = recog;
                    recog.start();
                  }
                }
              } catch {}
            }
          }, 350);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        (window as any).__vw_active_utterance = null;
      };

      (window as any).__vw_active_utterance = utterance;

      // Workaround for Chrome speech cancellation race condition
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("speechSynthesis.speak error:", err);
        }
      }, 70);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  // Extract relevant products from store catalog
  const findRelevantProducts = (queryOrContent: string): Product[] => {
    if (!products || products.length === 0) return [];
    const textLower = queryOrContent.toLowerCase();

    const directMatches = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const col = (p.collectionName || '').toLowerCase();
      return (
        name.length > 3 && (textLower.includes(name) || name.split(' ').some(w => w.length > 3 && textLower.includes(w))) ||
        (sku && textLower.includes(sku)) ||
        (textLower.includes('clone') && col.includes('clone')) ||
        (textLower.includes('original') && col.includes('original')) ||
        (textLower.includes('copy') && col.includes('copy'))
      );
    });

    if (directMatches.length > 0) {
      return directMatches.slice(0, 3);
    }

    if (
      textLower.includes('recommend') ||
      textLower.includes('top') ||
      textLower.includes('best') ||
      textLower.includes('collection') ||
      textLower.includes('price') ||
      textLower.includes('watch')
    ) {
      return products.slice(0, 3);
    }

    return [];
  };

  // Instant, 100% accurate catalog-grounded answer generator for client-side fallback
  const getClientFallbackAnswer = (queryText: string, isVoice: boolean): string => {
    const q = (queryText || '').toLowerCase().trim();
    const isUrdu = /[\u0600-\u06FF]/.test(queryText) ||
      /(\burdu\b|talk in urdu|speak in urdu|urdu mein|urdu me|urdu please|urdu bolo)/i.test(queryText) ||
      (speechLangRef.current === 'ur-PK' && /(\b(aap|hamari|ghari|ghariyan|qeemat|rupay|rabta|shukriya|tajweez)\b)/i.test(queryText));

    if (q.includes('hear me') || q.includes('can you hear') || q.includes('listening') || q.includes('sun rahe') || q.includes('awaz')) {
      if (isUrdu) {
        return isVoice
          ? "Jee haan, main aap ko bilkul saaf sun sakta hoon! Main Ventures Watches ka luxury advisor hoon. Aap hamari website se ya WhatsApp 0319 2265524 se order kar sakte hain."
          : "Jee haan, main aap ko bilkul saaf sun sakta hoon! Main Ventures Watches ka advisor hoon. Aap hamari website se direct order kar sakte hain ya WhatsApp **0319 2265524** par order place kar sakte hain.";
      }
      return isVoice
        ? "Yes, I can hear you loud and clear! I am your Ventures Watches advisor. You can order directly from this website or via WhatsApp at 0319 2265524."
        : "Yes, I can hear you loud and clear! I am your Ventures Watches advisor. You can order directly from this website or via WhatsApp at **0319 2265524**.";
    }
    if (q.includes('story') || q.includes('kahani')) {
      return isVoice
        ? "In 1960, a Rolex Deep Sea Special descended 10,916 meters into the Mariana Trench on the bathyscaphe Trieste, surviving crushing oceanic pressure and returning ticking perfectly."
        : "Here is the legendary story of the **Rolex Submariner Deep Sea Special**: In 1960, a specially crafted Rolex timepiece attached to the exterior of the bathyscaphe *Trieste* descended 10,916 meters into the Mariana Trench and returned ticking perfectly.";
    }
    if (q.includes('order') || q.includes('sadapay') || q.includes('buy') || q.includes('pay') || q.includes('bank') || q.includes('khareed')) {
      if (isUrdu) {
        return isVoice
          ? "Aap hamari is website se direct Add to Bag kar ke order kar sakte hain, ya hamare WhatsApp number 0319 2265524 par message kar ke bhi order place kar sakte hain."
          : "Aap 2 asaan tareeqon se order kar sakte hain:\n\n1. **Is Website se Order**: 'Add to Bag' ya 'Buy Now' kar ke direct checkout karein (SadaPay, Bank Transfer, Cards).\n2. **WhatsApp se Order**: Hamare WhatsApp number **0319 2265524** par message karein.";
      }
      return isVoice
        ? "You can order directly from this website using Add to Bag or Buy Now, or place your order via WhatsApp at 0319 2265524."
        : "You can order directly from this website using **Add to Bag** / **Buy Now** checkout, or place your order via WhatsApp at **0319 2265524** (+92 319 2265524)!";
    }

    const knownBrands = ['rolex', 'patek', 'patek philippe', 'audemars', 'audemars piguet', 'ap', 'omega', 'cartier', 'hublot', 'richard mille'];
    const brand = knownBrands.find(b => q.includes(b));
    const matching = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const col = (p.collectionName || '').toLowerCase();
      if (brand) return name.includes(brand) || col.includes(brand);
      return false;
    });

    if (matching.length > 0) {
      const w = matching[0];
      const specs = w.specifications || {};
      if (isUrdu) {
        return isVoice
          ? `Hamari collection se main ${w.name} tajweez karta hoon, qeemat PKR ${Number(w.price).toLocaleString()} hai 3 days warranty ke sath. Aap website se ya WhatsApp 0319 2265524 par order kar sakte hain.`
          : `Hamari live store inventory se sab se behtareen ghari **${w.name}** (SKU: ${w.sku || 'VW-WATCH'}) hai:\n\n• **Qeemat**: **PKR ${Number(w.price).toLocaleString()}**\n• **Material**: ${specs.caseMaterial || '904L Steel'}\n• **Crystal**: ${specs.crystal || 'Sapphire Crystal'}\n• **Warranty**: ${(specs.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}\n\n**Aap is website se direct order kar sakte hain ya WhatsApp 0319 2265524 par order place kar sakte hain!**`;
      }
      return isVoice
        ? `From our live inventory, I recommend the ${w.name} priced at PKR ${Number(w.price).toLocaleString()} with 3 Days Warranty. You can order directly from this website or via WhatsApp at 0319 2265524.`
        : `From our live store inventory, we recommend the **${w.name}** (SKU: ${w.sku || 'VW-WATCH'}):\n\n• **Price**: **PKR ${Number(w.price).toLocaleString()}**\n• **Case & Material**: ${specs.caseMaterial || '904L Steel'}${specs.caseSize ? ` (${specs.caseSize})` : ''}${specs.caseThickness ? ` • Thickness: ${specs.caseThickness}` : ''}\n• **Crystal**: ${specs.crystal || 'Sapphire Crystal'}\n• **Warranty**: ${(specs.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}\n\n**How to Order**:\n1. **Order from this website**: Use "Add to Bag" / "Buy Now".\n2. **Order from WhatsApp**: Message **0319 2265524** (+92 319 2265524).`;
    }

    if (brand) {
      const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
      if (isUrdu) {
        return isVoice
          ? `Is waqt hamare paas ${brandName} ready stock mein nahi hai, lekin aap hamari website se available watches dekh sakte hain ya WhatsApp 0319 2265524 par custom order karwa sakte hain.`
          : `Is waqt hamare paas ${brandName} ready inventory mein mojood nahi hai. Hum strictly sirf wahi ghariyan dikhate hain jo hamare store mein active hain.\n\nAap website par active watches dekh sakte hain ya WhatsApp **0319 2265524** par custom order place karwa sakte hain.`;
      }
      return isVoice
        ? `We do not currently have ${brandName} in ready store inventory, but you can order available models on this website or request custom sourcing via WhatsApp at 0319 2265524.`
        : `We do not currently have ${brandName} in our ready store inventory. We strictly show only timepieces currently active in our store.\n\nYou can order available watches on this website or custom source via WhatsApp at **0319 2265524**.`;
    }

    if (products.length > 0) {
      const top = products[0];
      const specs = top.specifications || {};
      if (isUrdu) {
        return isVoice
          ? `Hamari collection se main ${top.name} tajweez karta hoon jis ki qeemat PKR ${Number(top.price).toLocaleString()} hai. Aap is website se direct order kar sakte hain ya WhatsApp 0319 2265524 se order karein.`
          : `Hamari current store collection se top recommended timepiece **${top.name}** (PKR ${Number(top.price).toLocaleString()}) hai:\n\n• **Case**: ${specs.caseMaterial || '904L Stainless Steel'}\n• **Crystal**: ${specs.crystal || 'Sapphire Crystal'}\n• **Warranty**: ${(specs.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}\n\n**Order from this website directly or contact WhatsApp 0319 2265524!**`;
      }
      return isVoice
        ? `From our current collection, I recommend the ${top.name} priced at PKR ${Number(top.price).toLocaleString()} with 3 Days Warranty. You can order directly from this website or via WhatsApp at 0319 2265524.`
        : `From our current store collection, the top recommended timepiece is the **${top.name}** (PKR ${Number(top.price).toLocaleString()}):\n\n• **Case**: ${specs.caseMaterial || '904L Stainless Steel'}\n• **Crystal**: ${specs.crystal || 'Sapphire Crystal'}\n• **Warranty**: ${(specs.warranty || '3 Days Warranty').replace(/guarantee/gi, 'Warranty')}\n\n**How to Order**:\n1. **Order from this website**: Click "Add to Bag" / "Buy Now".\n2. **Order via WhatsApp**: Contact **0319 2265524**!`;
    }

    return isVoice
      ? "Welcome to Ventures Watches. You can order directly from this website or order via WhatsApp at 0319 2265524."
      : "Welcome to **VENTURES WATCHES**! ✨ You can explore our collection and order directly from this website using 'Add to Bag' / 'Buy Now', or order via WhatsApp at **0319 2265524**!";
  };

  // Handle voice or quick-topic query on Live Call (Strict <2s Response Time)
  const handleLiveCallQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoadingRef.current) return;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    lastSpokenQueryRef.current = text;

    const lowerText = text.toLowerCase();
    if (lowerText.includes('talk in urdu') || lowerText.includes('speak in urdu') || lowerText.includes('in urdu') || lowerText.includes('urdu mein') || lowerText.includes('urdu me') || lowerText.includes('urdu please') || lowerText.includes('urdu bolo') || /[\u0600-\u06FF]/.test(text)) {
      setSpeechLang('ur-PK');
      speechLangRef.current = 'ur-PK';
      if (recognitionRef.current) recognitionRef.current.lang = 'ur-PK';
    } else if (lowerText.includes('talk in english') || lowerText.includes('speak in english') || lowerText.includes('in english') || lowerText.includes('english please')) {
      setSpeechLang('en-US');
      speechLangRef.current = 'en-US';
      if (recognitionRef.current) recognitionRef.current.lang = 'en-US';
    }

    setIsLoading(true);
    isLoadingRef.current = true;
    setIsListening(false);

    // Stop recognition during API processing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    setCallTranscript(prev => ({
      ...prev,
      user: text,
      bot: "Consulting watch collection and specifications..."
    }));

    // Client-side 2.2s safety abort controller to ensure sub-2-second answers
    const abortCtrl = new AbortController();
    const abortTimeout = setTimeout(() => abortCtrl.abort(), 2200);

    try {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          })),
          liveStoreProducts: products,
          liveStoreCollections: collections,
          isLiveCall: true
        })
      });

      clearTimeout(abortTimeout);
      const data = await res.json();
      const reply = data.reply || getClientFallbackAnswer(text, true);

      setCallTranscript({
        user: text,
        bot: reply
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: findRelevantProducts(text + ' ' + reply)
      };
      setMessages(prev => [...prev, botMsg]);

      // Speak back out loud immediately
      speakText(reply);
    } catch (err) {
      clearTimeout(abortTimeout);
      const fallbackReply = getClientFallbackAnswer(text, true);
      setCallTranscript({ user: text, bot: fallbackReply });
      speakText(fallbackReply);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setCallInputText('');
    }
  };

  // Setup Web Speech Recognition
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Clean, isolated single-sentence recognition prevents runaway history
      recognition.interimResults = true;
      recognition.lang = speechLangRef.current || 'ur-PK';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            currentTranscript += item[0].transcript + ' ';
            if (item.isFinal) isFinal = true;
          }
        }

        const trimmed = currentTranscript.trim();
        if (trimmed) {
          setCallTranscript(prev => ({ ...prev, user: trimmed }));

          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          if (isFinal) {
            // Rapid final dispatch (180ms) for snappy under 2s conversation
            silenceTimeoutRef.current = setTimeout(() => {
              if (trimmed.length > 1 && !isLoadingRef.current) {
                handleLiveCallQuery(trimmed);
              }
            }, 180);
          } else {
            silenceTimeoutRef.current = setTimeout(() => {
              if (trimmed.length > 2 && !isLoadingRef.current) {
                handleLiveCallQuery(trimmed);
              }
            }, 750);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if call is still active and not muted/speaking/loading
        if (isCallActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
          setTimeout(() => {
            try {
              if (isCallActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
                recognition.start();
              }
            } catch {}
          }, 300);
        }
      };

      return recognition;
    } catch (err) {
      console.warn("Could not create SpeechRecognition instance:", err);
      return null;
    }
  };

  const startLiveCall = async () => {
    setIsCallActive(true);
    isCallActiveRef.current = true;
    setMode('call');

    // Unlock speech synthesis on user click
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch {}
    }

    // Request browser audio permission if available
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      }
    } catch {}

    playConciergeChime('connect');

    const welcomeGreeting = speechLangRef.current === 'ur-PK'
      ? 'Welcome to Ventures Watches. Main aap ka luxury watch advisor hoon. Aap hamari website se direct order kar sakte hain ya WhatsApp 0319 2265524 par bhi rabta kar sakte hain. Mujh se Urdu mein kuch bhi poochein!'
      : 'Welcome to Ventures Watches. You can order directly from this website or order via WhatsApp at 0319 2265524. I am listening live, how can I assist you with our luxury timepieces today?';
    setCallTranscript({
      user: '',
      bot: welcomeGreeting
    });

    speakText(welcomeGreeting);

    const recog = initSpeechRecognition();
    if (recog) {
      recognitionRef.current = recog;
      if (isSpeakerMuted) {
        try {
          recog.start();
        } catch (e) {
          console.warn("Speech recognition start failed:", e);
        }
      }
    }
  };

  const stopLiveCall = () => {
    setIsCallActive(false);
    isCallActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  };

  const toggleMic = () => {
    const nextState = !isMicMuted;
    setIsMicMuted(nextState);
    isMicMutedRef.current = nextState;

    if (nextState) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current && isCallActiveRef.current && !isSpeakingRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    }
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  // Quick Action Pills with Company & Specific Topics (Spoken Out Loud)
  const liveVoiceTopics = [
    { label: "🇵🇰 آرڈر کیسے کریں؟ (Website / WhatsApp)", query: "Mujhe website aur WhatsApp se order karne ka tareeqa batayein" },
    { label: "👑 سب سے بہترین گھڑی", query: "Apni store collection mein se sab se achi ghari specs ke sath suggest karein" },
    { label: "👂 Can you hear me?", query: "Can you hear me?" },
    { label: "⌚ Rolex Watches in Store", query: "Aap ke store mein Rolex ki konsi ghari mojood hai?" },
    { label: "📖 Rolex Deep Sea Story", query: "Tell me the famous Rolex Deep Sea dive story" },
    { label: "💎 Website & WhatsApp Order", query: "How do I order from this website or WhatsApp?" },
    { label: "💰 Store Prices in PKR", query: "What are your watch prices in PKR?" },
    { label: "🛡️ 3-Days Warranty", query: "Tell me about your 3 days checking warranty" }
  ];

  // Text message handler for chat mode
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const lowerText = text.toLowerCase();
    if (lowerText.includes('talk in urdu') || lowerText.includes('speak in urdu') || lowerText.includes('in urdu') || lowerText.includes('urdu mein') || lowerText.includes('urdu me') || lowerText.includes('urdu please') || lowerText.includes('urdu bolo') || /[\u0600-\u06FF]/.test(text)) {
      setSpeechLang('ur-PK');
      speechLangRef.current = 'ur-PK';
      if (recognitionRef.current) recognitionRef.current.lang = 'ur-PK';
    } else if (lowerText.includes('talk in english') || lowerText.includes('speak in english') || lowerText.includes('in english') || lowerText.includes('english please')) {
      setSpeechLang('en-US');
      speechLangRef.current = 'en-US';
      if (recognitionRef.current) recognitionRef.current.lang = 'en-US';
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    const abortCtrl = new AbortController();
    const abortTimeout = setTimeout(() => abortCtrl.abort(), 2200);

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          messages: apiMessages,
          liveStoreProducts: products,
          liveStoreCollections: collections,
          isLiveCall: false
        })
      });

      clearTimeout(abortTimeout);
      const data = await res.json();
      const replyContent = data.reply || getClientFallbackAnswer(text, false);
      const suggestedProds = findRelevantProducts(text + ' ' + replyContent);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: suggestedProds.length > 0 ? suggestedProds : undefined
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      clearTimeout(abortTimeout);
      console.warn('Chat fast-path active:', err);
      const fallbackProds = findRelevantProducts(text);
      const fallbackReply = getClientFallbackAnswer(text, false);

      const fallbackMsg: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedProducts: fallbackProds.length > 0 ? fallbackProds : undefined
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectProduct = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const handleWhatsAppOrderProduct = (product: Product) => {
    const text = encodeURIComponent(
      `Hello VW-Ventures Watches, I am interested in purchasing:\n\n*Product*: ${product.name}\n*SKU*: ${product.sku}\n*Collection*: ${product.collectionName}\n*Price*: PKR ${product.price.toLocaleString()}\n\nPlease share 4K video and payment details for SadaPay.`
    );
    window.open(`https://wa.me/923192265524?text=${text}`, '_blank');
  };

  // Helper to render markdown bolding
  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} className="leading-relaxed">
          <span>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-semibold text-amber-300">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </span>
        </div>
      );
    });
  };

  const masterWhatsAppUrl = "https://wa.me/923192265524?text=Hi%20Ventures%20Watches,%20I'm%20inquiring%20about%20your%20luxury%20watch%20collection.";

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 flex flex-col overflow-hidden text-slate-100 font-sans shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-amber-500/40 rounded-2xl bg-[#040914]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isExpanded
          ? 'inset-3 sm:inset-8 max-w-5xl mx-auto h-auto'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[96vw] sm:w-[560px] md:w-[620px] h-[700px] max-h-[95vh]'
      }`}
    >
      {/* Luxury Gold Trim Header */}
      <header className="relative bg-gradient-to-r from-[#071324] via-[#0B1C33] to-[#071324] border-b border-amber-500/30 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Crown size={19} className="text-amber-300" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0B1C33] rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs uppercase tracking-widest font-serif font-bold text-amber-100">
                Ventures Watches
              </h3>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-semibold tracking-wider">
                VOICE & CHAT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{isCallActive ? `Live Voice Call Connected (${formatTimer(callDuration)})` : 'Watch Specialist Online'}</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher: Chat vs Live Call */}
        <div className="flex items-center gap-1.5">
          <div className="bg-[#050D1A] p-0.5 rounded-lg border border-amber-500/30 flex items-center">
            <button
              onClick={() => {
                if (isCallActive) stopLiveCall();
                setMode('chat');
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1 ${
                mode === 'chat'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle size={11} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => {
                setMode('call');
                if (!isCallActive) startLiveCall();
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider uppercase transition-all flex items-center gap-1 ${
                mode === 'call'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Radio size={11} className={isCallActive ? "animate-pulse" : ""} />
              <span>Live Call</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors hidden sm:inline-flex"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={() => {
              if (isCallActive) stopLiveCall();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* MODE 1: DIRECT LIVE VOICE CALL INTERFACE */}
      {mode === 'call' ? (
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#06101E] via-[#040914] to-[#081528] relative overflow-y-auto no-scrollbar">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status & Live Audio Check */}
          <div className="text-center space-y-1 z-10 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-mono tracking-widest text-amber-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Audio Desk Live • {formatTimer(callDuration)}</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[9px] font-mono text-emerald-300 font-bold tracking-wide">
                <span>⚡ &lt;2s Instant Answers</span>
              </div>
            </div>
            <h4 className="text-sm sm:text-base font-serif font-bold text-white tracking-wide">
              Ventures Luxury Watch Advisor
            </h4>
          </div>

          {/* Center: Interactive Pulsing Microphone & Acoustic Visualizer */}
          <div className="my-2 relative flex flex-col items-center justify-center z-10">
            {/* Concentric Pulsing Sound Rings */}
            <div className={`absolute w-44 h-44 rounded-full border border-amber-500/20 transition-transform duration-700 ${isSpeaking || isListening ? 'scale-125 opacity-60 animate-ping' : 'opacity-20'}`} />
            <div className={`absolute w-32 h-32 rounded-full border border-amber-400/40 transition-transform duration-500 ${isSpeaking ? 'scale-110 opacity-75' : 'opacity-30'}`} />

            {/* Central Interactive Tap-to-Talk Button */}
            <button
              onClick={() => {
                if (isListening) {
                  // If listening, submit current speech or stop
                  if (callTranscript.user && callTranscript.user.trim().length > 1) {
                    handleLiveCallQuery(callTranscript.user);
                  } else {
                    toggleMic();
                  }
                } else if (!isSpeaking) {
                  if (isMicMuted) toggleMic();
                  try {
                    playConciergeChime('listen');
                    if (recognitionRef.current) recognitionRef.current.start();
                    setIsListening(true);
                  } catch (e) {
                    toggleMic();
                  }
                }
              }}
              className={`relative w-24 h-24 rounded-full transition-all duration-300 flex flex-col items-center justify-center cursor-pointer shadow-2xl group active:scale-95 ${
                isSpeaking
                  ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 border-2 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.5)]'
                  : isListening
                  ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.7)] animate-pulse'
                  : 'bg-gradient-to-br from-[#0B1E38] via-[#06101E] to-[#02050A] border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:border-amber-300'
              }`}
              title={isListening ? "Tap to send your speech" : "Tap to Speak"}
            >
              <div className="absolute inset-0 rounded-full border border-dashed border-amber-400/30 animate-[spin_16s_linear_infinite]" />
              {isSpeaking ? (
                <Volume2 size={32} className="text-white animate-bounce" />
              ) : isListening ? (
                <Mic size={34} className="text-white animate-pulse" />
              ) : (
                <Mic size={32} className="text-amber-300 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[9px] uppercase font-mono tracking-tighter mt-1 font-bold text-white/90">
                {isSpeaking ? "Speaking" : isListening ? "Listening" : "Tap to Talk"}
              </span>
            </button>

            {/* Live Audio Visualizer Equalizer */}
            <div className="flex items-center gap-1.5 mt-3 h-6">
              {[40, 75, 100, 60, 90, 45, 80, 55, 95, 65].map((height, i) => (
                <span
                  key={i}
                  style={{
                    height: isSpeaking || isListening ? `${height}%` : '20%',
                    transition: 'height 0.15s ease-in-out'
                  }}
                  className={`w-1 rounded-full ${
                    isSpeaking
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      : isListening
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Status Indicator text */}
            <div className="text-xs font-serif mt-2 text-center px-4">
              {isSpeaking ? (
                <span className="text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                  <Volume2 size={14} className="animate-bounce" /> Advisor is speaking to you now...
                </span>
              ) : isListening ? (
                <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <Mic size={14} className="animate-pulse" /> Listening... Speak freely or ask any question
                </span>
              ) : isLoading ? (
                <span className="text-amber-400 italic flex items-center justify-center gap-1.5">
                  <Sparkles size={13} className="animate-spin" /> Preparing logical specs and prices...
                </span>
              ) : (
                <span className="text-slate-300 font-medium">
                  Tap microphone or select a question below to hear voice response.
                </span>
              )}
            </div>
          </div>

          {/* Quick Voice Questions Bar: Instantly triggers Advisor to SPEAK */}
          <div className="w-full z-10 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-amber-400/90 uppercase tracking-wider font-semibold">
              <span>Instant Voice Questions (Tap to hear):</span>
              <button
                onClick={() => speakText("Testing voice sound. Ventures Watches audio desk is connected and speaking clearly.")}
                className="text-slate-400 hover:text-white flex items-center gap-1 lowercase text-[9px] hover:underline"
                title="Test audio speakers"
              >
                <Volume2 size={10} />
                <span>test voice</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {liveVoiceTopics.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleLiveCallQuery(topic.query)}
                  disabled={isLoading}
                  className="p-2 bg-[#081528] hover:bg-[#0E2442] border border-amber-500/25 hover:border-amber-400/50 rounded-lg text-left text-[11px] text-slate-200 transition-all flex items-center justify-between group active:scale-98 shadow-sm"
                >
                  <span className="truncate font-medium">{topic.label}</span>
                  <Play size={10} className="text-amber-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Live Subtitles & Transcript Prompter Box (Wide, Clear & Easily Readable) */}
          <div className="w-full bg-[#050B14]/95 border border-amber-500/40 rounded-2xl p-4 my-2.5 text-xs sm:text-sm leading-relaxed max-h-36 sm:max-h-48 overflow-y-auto text-slate-200 z-10 shadow-2xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Conversation Prompter
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = speechLang === 'ur-PK' ? 'en-US' : 'ur-PK';
                  setSpeechLang(next);
                  if (recognitionRef.current) recognitionRef.current.lang = next;
                }}
                className="text-[10px] font-mono text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-colors"
                title="Toggle Urdu / English speech"
              >
                {speechLang === 'ur-PK' ? '🇵🇰 اردو (Proper Accent)' : '🇬🇧 English'}
              </button>
            </div>
            {callTranscript.user && (
              <div className="text-amber-200 font-medium mb-2.5 bg-amber-500/10 border-l-2 border-amber-400 pl-3 py-1.5 rounded-r">
                <span className="text-amber-400 text-[10px] uppercase font-mono tracking-wider block font-bold mb-0.5">You:</span>
                <p className="break-words font-light">"{callTranscript.user}"</p>
              </div>
            )}
            <div className="text-slate-100 bg-white/5 border-l-2 border-emerald-400 pl-3 py-1.5 rounded-r">
              <span className="text-emerald-400 text-[10px] uppercase font-mono tracking-wider block font-bold mb-0.5">Advisor:</span>
              <p className="break-words font-light leading-relaxed">{callTranscript.bot}</p>
            </div>
          </div>

          {/* Direct Speech/Text Input Field for Live Call */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (callInputText.trim()) handleLiveCallQuery(callInputText);
            }}
            className="w-full flex items-center gap-1.5 z-10 mb-2"
          >
            <input
              type="text"
              value={callInputText}
              onChange={(e) => setCallInputText(e.target.value)}
              placeholder="Or type any question to hear him speak..."
              disabled={isLoading}
              className="flex-1 bg-[#050D1A] border border-slate-700 focus:border-amber-400 text-xs px-3 py-2 rounded-xl text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!callInputText.trim() || isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              title="Send & Speak"
            >
              <Send size={14} />
            </button>
          </form>

          {/* Live Call Control Dock */}
          <div className="w-full pt-2 flex items-center justify-around z-10 border-t border-slate-800">
            {/* Mic Mute / Listen Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full border transition-all ${
                isMicMuted
                  ? 'bg-rose-900/40 border-rose-500 text-rose-400'
                  : isListening
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMicMuted ? <MicOff size={17} /> : <Mic size={17} />}
            </button>

            {/* Speaker Sound Toggle */}
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full border transition-all ${
                isSpeakerMuted
                  ? 'bg-rose-900/40 border-rose-500 text-rose-400'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
              title={isSpeakerMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isSpeakerMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Switch to Chat */}
            <button
              onClick={() => {
                stopLiveCall();
                setMode('chat');
              }}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 transition-all"
              title="Switch to Text Chat"
            >
              <MessageCircle size={17} />
            </button>

            {/* Direct WhatsApp Call */}
            <a
              href="https://wa.me/923192265524?text=Hello%20Ventures%20Watches,%20I'd%20like%20to%20request%20a%20live%20call%20or%20video%20call%20for%20watches."
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-500/40 text-white transition-all shadow-md"
              title="Call Human Advisor on WhatsApp (0319 2265524)"
            >
              <PhoneCall size={17} />
            </a>

            {/* End Call Button */}
            <button
              onClick={() => {
                stopLiveCall();
                setMode('chat');
              }}
              className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all"
              title="End Voice Call"
            >
              <PhoneOff size={17} />
            </button>
          </div>
        </div>
      ) : (
        /* MODE 2: CHAT INTERFACE WITH QUICK RESPONSES & LUXURY PRODUCT CARDS */
        <>
          {/* Quick Action Pill Tray */}
          <div className="bg-[#040A14] border-b border-amber-500/20 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1 flex-shrink-0 font-bold">
              ⚡ &lt;2s Fast AI
            </span>

            {/* Quick Live Call Pill */}
            <button
              onClick={() => {
                setMode('call');
                startLiveCall();
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 whitespace-nowrap flex items-center gap-1 transition-all shadow-sm flex-shrink-0"
            >
              <Radio size={11} className="animate-pulse" />
              <span>🎙️ Live Call</span>
            </button>

            <button
              onClick={() => handleSendMessage("Can you hear me?")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all flex-shrink-0"
            >
              👂 Can you hear me?
            </button>

            <button
              onClick={() => handleSendMessage("Suggest me the best story")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all flex-shrink-0"
            >
              📖 Best Watch Story
            </button>

            <button
              onClick={() => handleSendMessage("Suggest me the best Rolex watch according to specifications and price")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 whitespace-nowrap transition-all flex-shrink-0"
            >
              👑 Best Rolex Model
            </button>

            <button
              onClick={() => handleSendMessage("Suggest me the best Patek Philippe watch according to specs")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all flex-shrink-0"
            >
              ✨ Patek Philippe
            </button>

            <button
              onClick={() => handleSendMessage("What are the price ranges across your watch collections in PKR?")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all flex-shrink-0"
            >
              💰 Price Ranges
            </button>

            <button
              onClick={() => handleSendMessage("How can I order and pay using SadaPay or Bank Transfer?")}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all flex-shrink-0"
            >
              🛒 How to Order
            </button>
          </div>

          {/* Chat Messages History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gradient-to-b from-[#040914] to-[#060D1A]">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-in fade-in duration-300`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[88%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                        isBot
                          ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold border border-amber-300/40'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isBot ? <Crown size={14} /> : <User size={13} />}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-lg ${
                        isBot
                          ? 'bg-[#0A1628]/90 text-slate-200 border border-amber-500/25 rounded-tl-sm'
                          : 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-medium rounded-tr-sm'
                      }`}
                    >
                      {renderFormattedContent(msg.content)}

                      {/* Optional Voice Read Button for Bot messages */}
                      {isBot && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                          <button
                            onClick={() => speakText(msg.content)}
                            className="flex items-center gap-1 hover:text-amber-300 transition-colors"
                            title="Hear spoken aloud"
                          >
                            <Volume2 size={11} className="text-amber-400" />
                            <span>Listen to voice</span>
                          </button>
                          <span>{msg.timestamp}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Embedded Luxury Product Recommendation Cards */}
                  {isBot && msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                    <div className="w-full mt-3 pl-9 pr-2 space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
                        <Sparkles size={11} />
                        <span>Recommended Timepieces in Collection:</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.suggestedProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-[#071324] border border-amber-500/30 rounded-xl p-2.5 hover:border-amber-400 transition-all flex gap-2.5 items-center group shadow-md"
                          >
                            <img
                              src={prod.images?.[0] || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=300'}
                              alt={prod.name}
                              className="w-14 h-14 object-cover rounded-lg border border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                                {prod.name}
                              </h5>
                              <p className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                                PKR {Number(prod.price).toLocaleString()}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <button
                                  onClick={() => handleInspectProduct(prod)}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 transition-all"
                                >
                                  <Eye size={10} />
                                  <span>360° View</span>
                                </button>
                                <button
                                  onClick={() => handleWhatsAppOrderProduct(prod)}
                                  className="text-[10px] bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 transition-all"
                                >
                                  <ExternalLink size={10} />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-amber-400 italic pl-9 animate-pulse">
                <Sparkles size={13} className="animate-spin text-amber-400" />
                <span>Consulting watch catalog specifications & prices...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky WhatsApp Help Bar */}
          <div className="px-4 py-1.5 bg-[#03070E] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-amber-400" />
              <span>3-Day Checking Warranty • SadaPay Verified</span>
            </span>
            <a
              href={masterWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <PhoneCall size={11} />
              <span>0319 2265524</span>
            </a>
          </div>

          {/* Input Chat Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#071324] border-t border-amber-500/30 flex items-center gap-2 flex-shrink-0"
          >
            {/* Quick Live Call Voice Button */}
            <button
              type="button"
              onClick={() => {
                setMode('call');
                startLiveCall();
              }}
              className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 transition-all active:scale-95 shadow-sm"
              title="Switch to Live Audio Call"
            >
              <Mic size={16} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about Rolex, Patek, specs, PKR price, or orders..."
              disabled={isLoading}
              className="flex-1 bg-[#050D1A] border border-slate-700 focus:border-amber-400 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 p-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95 shadow-md flex items-center justify-center"
              title="Send Inquiry"
            >
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
