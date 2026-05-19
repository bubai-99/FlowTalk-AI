import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  X, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  MessageCircle,
  Command,
  Zap,
  Briefcase,
  UserCircle
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Tone } from '../types';

interface FlowTalkOverlayProps {
  onInsert: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  bubblePosition?: { x: number; y: number } | null;
}

export const FlowTalkOverlay: React.FC<FlowTalkOverlayProps> = ({ onInsert, isOpen, onClose, bubblePosition }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tone, setTone] = useState<Tone>('professional');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [currentApp, setCurrentApp] = useState('Microsoft Teams');
  const [sourceLanguage, setSourceLanguage] = useState('Auto-detect');
  const [targetLanguage, setTargetLanguage] = useState('Auto-detect');
  const [size, setSize] = useState({ width: 380, height: 'auto' as number | 'auto' });
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (input.trim() && isOpen && !isMinimized) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        handleRewrite();
      }, 1000);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [input, tone, sourceLanguage, targetLanguage]);

  useEffect(() => {
    if (isOpen && bubblePosition) {
      // Calculate position relative to bubble based on available space
      const overlayWidth = size.width;
      const estimatedHeight = isMinimized ? 64 : (isCompact ? 350 : 500);
      const overlayHeight = typeof size.height === 'number' ? size.height : estimatedHeight;
      
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const padding = 20;
      const gap = 15;
      const bubbleSize = 64; 

      let finalX = 0;
      let finalY = 0;

      // Priority 1: Top of bubble
      if (bubblePosition.y > overlayHeight + gap + padding) {
        finalY = bubblePosition.y - overlayHeight - gap;
        if (bubblePosition.x + bubbleSize / 2 < vw / 2) {
          finalX = bubblePosition.x;
        } else {
          finalX = bubblePosition.x + bubbleSize - overlayWidth;
        }
      } 
      // Priority 2: Bottom of bubble
      else if (vh - (bubblePosition.y + bubbleSize) > overlayHeight + gap + padding) {
        finalY = bubblePosition.y + bubbleSize + gap;
        if (bubblePosition.x + bubbleSize / 2 < vw / 2) {
          finalX = bubblePosition.x;
        } else {
          finalX = bubblePosition.x + bubbleSize - overlayWidth;
        }
      }
      // Priority 3: Left of bubble
      else if (bubblePosition.x > overlayWidth + gap + padding) {
        finalX = bubblePosition.x - overlayWidth - gap;
        finalY = Math.max(padding, Math.min(vh - overlayHeight - padding, bubblePosition.y + bubbleSize / 2 - overlayHeight / 2));
      }
      // Priority 4: Right of bubble
      else if (vw - (bubblePosition.x + bubbleSize) > overlayWidth + gap + padding) {
        finalX = bubblePosition.x + bubbleSize + gap;
        finalY = Math.max(padding, Math.min(vh - overlayHeight - padding, bubblePosition.y + bubbleSize / 2 - overlayHeight / 2));
      }
      // Fallback: Corner with most space
      else {
        const topSpace = bubblePosition.y;
        const bottomSpace = vh - (bubblePosition.y + bubbleSize);
        const leftSpace = bubblePosition.x;
        const rightSpace = vw - (bubblePosition.x + bubbleSize);

        if (topSpace > bottomSpace) {
          finalY = Math.max(padding, bubblePosition.y - overlayHeight - gap);
        } else {
          finalY = Math.min(vh - overlayHeight - padding, bubblePosition.y + bubbleSize + gap);
        }

        if (leftSpace > rightSpace) {
          finalX = Math.max(padding, bubblePosition.x - overlayWidth - gap);
        } else {
          finalX = Math.min(vw - overlayWidth - padding, bubblePosition.x + bubbleSize + gap);
        }
      }

      // Final clamping
      finalX = Math.max(padding, Math.min(vw - overlayWidth - padding, finalX));
      finalY = Math.max(padding, Math.min(vh - overlayHeight - padding, finalY));

      setOverlayPos({ x: finalX, y: finalY });
    }
  }, [isOpen, bubblePosition]); // Removed isMinimized, isCompact, size.width, size.height

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRewrite = async (overrideTone?: Tone) => {
    const activeTone = overrideTone || tone;
    if (!input.trim()) return;
    
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/flowtalk/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          tone: activeTone,
          currentApp,
          sourceLanguage,
          targetLanguage
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to rewrite");
      }

      setOutput(data.output);
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error processing. Please try again.");
      setOutput("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Mock voice detection
      setTimeout(() => {
        setInput("meeting sesh hole pathiye debo");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, x: overlayPos.x, y: overlayPos.y + 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: overlayPos.x, 
              y: overlayPos.y,
              height: isMinimized ? 64 : (size.height === 'auto' ? 'auto' : size.height)
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{ width: size.width, maxWidth: 'calc(100vw - 32px)' }}
            className="fixed top-0 left-0 bg-white/90 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white/40 overflow-hidden z-[100] flex flex-col ring-1 ring-black/5"
            onDragEnd={(_, info) => {
              setOverlayPos({ x: overlayPos.x + info.offset.x, y: overlayPos.y + info.offset.y });
            }}
          >
            {/* Drag Handle & Header */}
            <div className={`px-4 bg-gradient-to-r from-[#6264A7] to-[#8B5CF6] text-white flex flex-col cursor-move active:cursor-grabbing select-none shrink-0 transition-all ${isMinimized ? 'h-16 justify-center' : 'py-3 min-h-[72px]'}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <div className="bg-white p-1 rounded-lg shadow-sm shrink-0">
                    <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-1">
                      <select 
                        value={currentApp}
                        onChange={(e) => setCurrentApp(e.target.value)}
                        onPointerDown={e => e.stopPropagation()}
                        className="bg-transparent border-none font-bold text-sm leading-tight tracking-tight text-white outline-none cursor-pointer appearance-none pr-1 truncate max-w-[120px]"
                      >
                        <option value="Microsoft Teams" className="text-gray-900">FlowTalk AI</option>
                        <option value="Slack" className="text-gray-900">FlowTalk for Slack</option>
                        <option value="WhatsApp" className="text-gray-900">FlowTalk for WhatsApp</option>
                        <option value="Gmail" className="text-gray-900">FlowTalk for Gmail</option>
                      </select>
                      {!isMinimized && <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                    </div>
                    {!isMinimized && <p className="text-[9px] opacity-80 uppercase tracking-widest font-medium truncate">Context: {currentApp}</p>}
                  </div>
                </div>

                <div className="flex items-center space-x-1" onPointerDown={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="hover:bg-white/10 p-1.5 rounded-full transition-colors opacity-60 hover:opacity-100 flex items-center justify-center outline-none"
                    title={isMinimized ? "Expand" : "Minimize"}
                  >
                    {isMinimized ? <Sparkles size={16} className="animate-pulse" /> : <Command size={16} />}
                  </button>

                  <button 
                    onClick={onClose} 
                    className="hover:bg-white/10 p-1.5 rounded-full transition-colors opacity-60 hover:opacity-100 outline-none"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/10 w-full" onPointerDown={e => e.stopPropagation()}>
                  <div className="flex items-center space-x-1.5">
                    <div className="flex items-center bg-white/10 rounded-lg px-1.5 py-0.5 space-x-1">
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="bg-transparent border-none py-0.5 text-[9px] font-bold tracking-tight uppercase outline-none cursor-pointer appearance-none max-w-[65px] overflow-hidden truncate text-white/90"
                        title="Source Language"
                      >
                        <option value="Auto-detect" className="text-gray-900">Auto</option>
                        <option value="English" className="text-gray-900">English</option>
                        <option value="Bengali" className="text-gray-900">Bengali</option>
                        <option value="Hindi" className="text-gray-900">Hindi</option>
                        <option value="Spanish" className="text-gray-900">Spanish</option>
                        <option value="French" className="text-gray-900">French</option>
                        <option value="German" className="text-gray-900">German</option>
                      </select>
                      <span className="text-[9px] opacity-40 font-bold">→</span>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-transparent border-none py-0.5 text-[9px] font-bold tracking-tight uppercase outline-none cursor-pointer appearance-none max-w-[65px] overflow-hidden truncate text-white"
                        title="Target Language"
                      >
                        <option value="Auto-detect" className="text-gray-900">Auto</option>
                        <option value="English" className="text-gray-900">English</option>
                        <option value="Bengali" className="text-gray-900">Bengali</option>
                        <option value="Hindi" className="text-gray-900">Hindi</option>
                        <option value="Spanish" className="text-gray-900">Spanish</option>
                        <option value="French" className="text-gray-900">French</option>
                        <option value="German" className="text-gray-900">German</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsCompact(!isCompact)}
                    className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
                      isCompact ? 'bg-white text-[#6264A7] shadow-sm' : 'hover:bg-white/10 text-white/70 hover:text-white'
                    }`}
                    title={isCompact ? "Full View" : "Compact View"}
                  >
                    <Zap size={10} className={isCompact ? 'fill-[#6264A7]' : ''} />
                    <span className="text-[9px] font-bold tracking-wider uppercase">{isCompact ? 'Compact' : 'Standard'}</span>
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {!isMinimized && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`${isCompact ? 'p-3 space-y-3' : 'p-5 space-y-5'} flex-1 cursor-default overflow-y-auto custom-scrollbar`} 
                  onPointerDown={e => e.stopPropagation()}
                >
            {/* Input Section */}
            <div className="space-y-1">
              {!isCompact && (
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                    Native Thought
                  </label>
                  {isListening && (
                    <span className="text-[9px] text-indigo-600 font-bold animate-pulse">Speaking...</span>
                  )}
                </div>
              )}
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isCompact ? "Type..." : "Type naturally..."}
                  className={`w-full ${isCompact ? 'h-16 text-sm p-2.5' : 'h-24 text-base p-3.5'} bg-slate-50 border border-slate-100 rounded-xl font-medium italic focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-300 pr-10`}
                />
                <div className="absolute top-2 right-2 flex flex-col space-y-1">
                  {input && (
                    <button 
                      onClick={() => { setInput(''); setOutput(''); setSuggestions([]); }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                      title="Clear input"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={toggleVoice}
                  className={`absolute ${isCompact ? 'bottom-2 right-2 p-1.5' : 'bottom-3 right-3 p-2'} rounded-full shadow-md transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  <Mic size={isCompact ? 14 : 16} />
                </button>
              </div>
              {input.trim() && !isProcessing && !errorMsg && (
                <div className="flex items-center space-x-1 px-1">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
                  <span className="text-[8px] text-slate-400 font-medium">Smart Rewrite Active</span>
                </div>
              )}
            </div>

            {/* AI Divider Overlay look from design */}
            {!isCompact && (
              <div className="flex justify-center relative scale-90">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative bg-white/50 px-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <span className="text-indigo-600 text-xs">↓</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Output Section */}
            <div className="space-y-1.5">
              {!isCompact && (
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Professional Rewrite
                  </label>
                  <div className="flex bg-slate-100/80 p-0.5 rounded-full items-center">
                    {[
                      { id: 'professional', label: 'Pro' },
                      { id: 'casual', label: 'Casual' },
                      { id: 'executive', label: 'Exec' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleToneChange(t.id as Tone)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                          tone === t.id 
                            ? 'bg-white shadow-sm text-indigo-600' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={`bg-indigo-50/40 border border-indigo-100 ${isCompact ? 'p-3 min-h-[60px]' : 'p-4 min-h-[80px]'} rounded-xl relative group overflow-hidden`}>
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col space-y-2 py-1"
                    >
                      <div className="h-4 bg-indigo-200/50 rounded w-full animate-pulse" />
                      <div className="h-4 bg-indigo-200/50 rounded w-2/3 animate-pulse" />
                    </motion.div>
                  ) : errorMsg ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-start space-x-2 text-red-500"
                    >
                      <X size={14} className="mt-1 shrink-0" />
                      <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} font-medium`}>
                        {errorMsg}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.p 
                      key="content"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`${isCompact ? 'text-sm' : 'text-base'} text-slate-800 leading-relaxed font-medium`}
                    >
                      {output ? `"${output}"` : isCompact ? "Rewrite..." : "Waiting for rewrite..."}
                    </motion.p>
                  )}
                </AnimatePresence>
                {!isProcessing && output && (
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={`absolute ${isCompact ? 'top-1 right-1' : 'top-1.5 right-1.5'} bg-green-500 text-white p-1 rounded-full shadow-lg`}
                  >
                    <Check size={isCompact ? 6 : 8} />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Smart Suggestions */}
            {!isCompact && suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Variations</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.slice(0, 1).map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => setOutput(s)}
                      className="text-left p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-all text-[11px] text-slate-600 italic leading-snug hover:border-indigo-200"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className={`${isCompact ? 'pt-0.5' : 'pt-2'}`}>
              <button 
                onClick={() => onInsert(output)}
                disabled={!output}
                className={`w-full bg-[#6264A7] hover:bg-[#4b4d8d] text-white font-bold ${isCompact ? 'py-1.5 rounded-lg' : 'py-2.5 rounded-xl'} shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98] group`}
              >
                <span className={isCompact ? 'text-xs' : 'text-sm'}>Insert Message</span>
                <ArrowRight size={isCompact ? 14 : 16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize Handle at Modal Corner (Inside the modal, but outside content area to avoid occlusion) */}
      {!isMinimized && (
        <div 
          className="absolute bottom-0 right-0 w-10 h-10 cursor-nwse-resize flex items-center justify-center z-[110] select-none group/resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = size.width;
            const startHeight = inputRef.current?.closest('.fixed')?.clientHeight || 500;
            
            const onPointerMove = (moveEvent: PointerEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;
              const newWidth = Math.max(320, Math.min(800, startWidth + deltaX));
              const newHeight = Math.max(400, Math.min(1000, startHeight + deltaY));
              setSize({ width: newWidth, height: newHeight });
            };
            
            const onPointerUp = () => {
              document.removeEventListener('pointermove', onPointerMove);
              document.removeEventListener('pointerup', onPointerUp);
            };
            
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
          }}
        >
          <div className="w-4 h-4 flex flex-col items-end justify-end space-y-0.5 pr-2 pb-2 opacity-40 group-hover/resize:opacity-100 transition-opacity">
            <div className="w-1.5 h-0.5 bg-slate-400 rotate-[-45deg] translate-y-[2px]" />
            <div className="w-2.5 h-0.5 bg-slate-400 rotate-[-45deg] translate-y-[-1px]" />
            <div className="w-3.5 h-0.5 bg-slate-400 rotate-[-45deg] translate-y-[-4px]" />
          </div>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>
  );
};

export const FlowTalkBubble: React.FC<{ onClick: () => void; isOpen: boolean; onPositionChange?: (pos: { x: number; y: number }) => void }> = ({ onClick, isOpen, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bubbleRef.current && onPositionChange) {
      const rect = bubbleRef.current.getBoundingClientRect();
      onPositionChange({ x: rect.left, y: rect.top });
    }
  }, []);

  return (
    <motion.div
      ref={bubbleRef}
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setTimeout(() => setIsDragging(false), 50);
        if (bubbleRef.current && onPositionChange) {
          const rect = bubbleRef.current.getBoundingClientRect();
          onPositionChange({ x: rect.left, y: rect.top });
        }
      }}
      initial={{ x: 0, y: 0 }}
      className="fixed bottom-12 right-4 md:right-12 z-50 group cursor-grab active:cursor-grabbing"
    >
      <motion.button
        onTap={() => {
          if (!isDragging) {
            onClick();
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative pointer-events-none">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center relative border-4 transition-all duration-300 ${
            isOpen ? 'bg-white border-indigo-200' : 'bg-white border-indigo-100'
          }`}>
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="open" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X size={28} className="text-indigo-600" />
                </motion.div>
              ) : (
                <motion.div 
                  key="closed" 
                  initial={{ scale: 0.5, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-inner shadow-white/20"
                />
              )}
            </AnimatePresence>
          </div>
          {!isOpen && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white shadow-sm flex items-center space-x-1 ring-offset-0">
               <span className="w-1 h-1 bg-white rounded-full animate-ping" />
               <span>LIVE</span>
            </div>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
};
