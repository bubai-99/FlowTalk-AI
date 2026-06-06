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
  UserCircle,
  Copy,
  History,
  Trash2,
  Search,
  Chrome,
  Smartphone,
  Laptop,
  Download,
  ExternalLink,
  FileCode,
  Lock,
  ChevronDown,
  Globe
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Tone, SavedConversation } from '../types';
import { useUser } from '../contexts/UserContext';

const LANGUAGES = [
  { code: 'Auto-detect', name: 'Auto', desc: 'AI Detect', flag: '✨' },
  { code: 'English', name: 'English', desc: 'US/UK', flag: '🇺🇸' },
  { code: 'Bengali', name: 'Bengali', desc: 'বাংলা', flag: '🇧🇩' },
  { code: 'Hindi', name: 'Hindi', desc: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Spanish', name: 'Spanish', desc: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'French', desc: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'German', desc: 'Deutsch', flag: '🇩🇪' },
];

const HistoryItemCard: React.FC<{
  item: SavedConversation;
  onInsert: () => void;
  onDelete: () => void;
}> = ({ item, onInsert, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.rewritten);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative border border-slate-100 hover:border-indigo-100/50 rounded-2xl bg-white p-3.5 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      {/* Context info header info banner */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-dashed border-slate-100 flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
          <span
            className="text-[9px] px-2 py-0.5 rounded-lg font-bold bg-amber-50 text-amber-700 border border-amber-200/50 uppercase tracking-widest leading-none truncate max-w-[170px]"
            title={item.targetInfo || "General Text"}
          >
            🎯 {item.targetInfo || "General Text"}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            {item.timestamp.includes('T') ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.timestamp}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 leading-none">
            {item.tone}
          </span>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-40 group-hover:opacity-100 focus:opacity-100 outline-none"
            title="Delete custom rewrites"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Texts layout */}
      <div className="space-y-2.5">
        <div className="bg-slate-50/70 p-2.5 rounded-xl text-slate-500 text-xs italic leading-relaxed">
          <p className="text-[8px] font-extrabold uppercase text-slate-400 not-italic mb-1 tracking-wider leading-none">Thought</p>
          "{item.original}"
        </div>
        <div className="bg-indigo-50/30 border border-indigo-50 p-2.5 rounded-xl text-slate-800 text-sm font-semibold leading-relaxed">
          <p className="text-[8px] font-extrabold uppercase text-indigo-500 not-italic mb-1 tracking-wider leading-none">Polished</p>
          "{item.rewritten}"
        </div>
      </div>

      {/* Button controls under card */}
      <div className="flex items-center justify-end space-x-2 mt-3 pt-2.5 border-t border-slate-100/50">
        <button
          onClick={handleCopy}
          className="px-2.5 py-1.5 text-[10px] font-bold border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all rounded-lg flex items-center space-x-1 text-slate-600 outline-none"
        >
          {copied ? (
            <>
              <Check size={10} className="text-green-600 font-bold" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <Copy size={10} className="text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>

        <button
          onClick={onInsert}
          className="px-2.5 py-1.5 text-[10px] font-bold bg-[#6264A7] hover:bg-[#4b4d8d] text-white transition-all rounded-lg flex items-center space-x-1 shadow-sm outline-none"
        >
          <span>Use & Insert</span>
          <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
};

interface FlowTalkOverlayProps {
  onInsert: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  bubblePosition?: { x: number; y: number } | null;
}

export const FlowTalkOverlay: React.FC<FlowTalkOverlayProps> = ({ onInsert, isOpen, onClose, bubblePosition }) => {
  const { userProfile, useCredit } = useUser();
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
  const [dragBounds, setDragBounds] = useState({ top: 10, left: 10, right: 300, bottom: 505 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const updateBounds = () => {
      const w = typeof size.width === 'number' ? size.width : 380;
      setDragBounds({
        top: 10,
        left: 10,
        right: window.innerWidth - w - 10,
        bottom: window.innerHeight - (isMinimized ? 64 : 100)
      });
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [size.width, isMinimized]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const detectTimer = useRef<NodeJS.Timeout | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'source' | 'target' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Track the most recently active/focused input element (excluding elements inside FlowTalk overlay itself)
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const [targetInfo, setTargetInfo] = useState<string>("No target selected (Click an input)");

  useEffect(() => {
    const handleGlobalFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isTextInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.hasAttribute('contenteditable') ||
        target.isContentEditable;

      if (!isTextInput) return;

      // Exclude FlowTalk Overlay, FlowTalk Bubble, or any modal of our own
      const isInsideOverlay =
        target.closest('#flowtalk-overlay') ||
        target.closest('#flowtalk-bubble') ||
        target.closest('[id*="flowtalk"]') ||
        target.closest('.flowtalk-overlay') ||
        target.closest('.flowtalk-bubble');

      if (isInsideOverlay) return;

      lastActiveElementRef.current = target;

      const placeholder = target.getAttribute('placeholder');
      if (placeholder) {
        const truncated = placeholder.length > 25 ? placeholder.substring(0, 22) + '...' : placeholder;
        setTargetInfo(`Target: "${truncated}"`);
      } else if (target.id) {
        setTargetInfo(`Target: #${target.id}`);
      } else if (target.getAttribute('name')) {
        setTargetInfo(`Target: [${target.getAttribute('name')}]`);
      } else {
        setTargetInfo(`Target: <${target.tagName.toLowerCase()}>`);
      }
    };

    document.addEventListener('focusin', handleGlobalFocus);
    const handleGlobalMousedown = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (active) {
          handleGlobalFocus({ target: active } as any);
        }
      }, 50);
    };
    document.addEventListener('mousedown', handleGlobalMousedown);

    // Run custom focus scanner on load
    setTimeout(() => {
      const active = document.activeElement as HTMLElement;
      if (active) {
        handleGlobalFocus({ target: active } as any);
      }
    }, 100);

    return () => {
      document.removeEventListener('focusin', handleGlobalFocus);
      document.removeEventListener('mousedown', handleGlobalMousedown);
    };
  }, []);

  const [history, setHistory] = useState<SavedConversation[]>(() => {
    try {
      const saved = localStorage.getItem('flowtalk_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'rewrite' | 'history' | 'integration'>('rewrite');
  const [integrationSubTab, setIntegrationSubTab] = useState<'extension' | 'desktop' | 'mobile'>('extension');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('flowtalk_history', JSON.stringify(history));
  }, [history]);

  const filteredHistory = history.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.original.toLowerCase().includes(q) ||
      item.rewritten.toLowerCase().includes(q) ||
      item.app.toLowerCase().includes(q) ||
      item.tone.toLowerCase().includes(q)
    );
  });

  const saveToHistory = (originalText: string, rewrittenText: string) => {
    if (!originalText.trim() || !rewrittenText.trim()) return;

    // Check if the exact same rewrite exists already in matching context
    const isDuplicate = history.some(item =>
      item.original.trim() === originalText.trim() &&
      item.rewritten.trim() === rewrittenText.trim() &&
      item.tone === tone &&
      item.app === currentApp
    );
    if (isDuplicate) return;

    const newConversation: SavedConversation = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      app: currentApp,
      tone,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      original: originalText,
      rewritten: rewrittenText,
      targetInfo: targetInfo
    };

    setHistory(prev => [newConversation, ...prev]);
  };

  const deleteConversation = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
    if (!input.trim() || input.trim().length < 3) {
      setDetectedLanguage(null);
      return;
    }

    if (isOpen && !isMinimized) {
      if (detectTimer.current) clearTimeout(detectTimer.current);
      detectTimer.current = setTimeout(() => {
        handleDetectLanguage(input);
      }, 600);
    }

    return () => {
      if (detectTimer.current) clearTimeout(detectTimer.current);
    };
  }, [input, isOpen, isMinimized]);

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
  const [localFallbackActive, setLocalFallbackActive] = useState<boolean>(false);

  const handleRewrite = async (overrideTone?: Tone) => {
    const activeTone = overrideTone || tone;
    if (!input.trim()) return;

    const isUsingCustomKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
    const isEnterprise = userProfile?.plan === 'Enterprise';
    const isRestricted = !isUsingCustomKey && !isEnterprise;

    if (isRestricted && userProfile && userProfile.credits <= 0) {
      setErrorMsg("Insufficient Credits. Please purchase additional processing credits or configure your personal Gemini API key in the Control Panel.");
      setIsProcessing(false);
      setOutput("");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setLocalFallbackActive(false);
    try {
      const response = await fetch('/api/flowtalk/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          tone: activeTone,
          currentApp,
          sourceLanguage,
          targetLanguage,
          customGeminiKey: userProfile?.customGeminiKey || ''
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rewrite");
      }

      setOutput(data.output);
      setSuggestions(data.suggestions || []);

      if (data.localFallbackApplied) {
        setLocalFallbackActive(true);
      } else {
        setLocalFallbackActive(false);
      }

      if (data.output) {
        saveToHistory(input, data.output);
        if (isRestricted && userProfile && !data.localFallbackApplied) {
          await useCredit();
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error processing. Please try again.");
      setOutput("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToneChange = (newTone: Tone) => {
    const isUsingCustomKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
    const isPremium = userProfile?.plan === 'Pro' || userProfile?.plan === 'Enterprise' || isUsingCustomKey;
    if ((newTone === 'professional' || newTone === 'executive') && !isPremium) {
      setErrorMsg("The 'Pro' (Professional) and 'Exec' (Executive) tones are premium styles. Upgrade your subscription plan or bind your custom Gemini API key in the Control Panel to unlock!");
      return;
    }
    setErrorMsg(null);
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

  const handleInsert = (text: string) => {
    let insertedSuccessfully = false;

    if (lastActiveElementRef.current) {
      const el = lastActiveElementRef.current;

      try {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
          const start = inputEl.selectionStart ?? inputEl.value.length;
          const end = inputEl.selectionEnd ?? inputEl.value.length;
          const oldVal = inputEl.value;
          const newVal = oldVal.substring(0, start) + text + oldVal.substring(end);

          // Find prototype and use descriptor/setter if possible for React element sync
          const prototype = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
          if (descriptor && descriptor.set) {
            descriptor.set.call(inputEl, newVal);
          } else {
            inputEl.value = newVal;
          }

          // Dispatch native change/input events to trigger React onChange states
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));

          inputEl.focus();

          // Place cursor immediately following the newly inserted text
          const nextCursorPos = start + text.length;
          if (typeof inputEl.setSelectionRange === 'function') {
            inputEl.setSelectionRange(nextCursorPos, nextCursorPos);
          }
          insertedSuccessfully = true;
        } else if (el.isContentEditable) {
          el.focus();

          // Use modern clipboard input if supported, falls back to inner text insertion
          try {
            document.execCommand('insertText', false, text);
          } catch {
            el.innerText = text;
          }

          el.dispatchEvent(new Event('input', { bubbles: true }));
          insertedSuccessfully = true;
        }
      } catch (err) {
        console.warn("Direct input insertion error, falling back:", err);
      }
    }

    if (!insertedSuccessfully) {
      onInsert(text);
    } else {
      onClose(); // Auto close the rewrite overlay on successful conversion insertion
    }

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'flowtalk-insert', text }, '*');
      }
    } catch (e) {
      console.warn("Could not postMessage to parent window:", e);
    }
  };

  const downloadManifestFile = () => {
    const manifest = {
      manifest_version: 3,
      name: "FlowTalk AI - Real-time Chat Assistant",
      version: "1.0.0",
      description: "Generates smart real-time rewrites in English, Bengali, Hindi, Spanish and more.",
      permissions: ["activeTab"],
      content_scripts: [
        {
          matches: [
            "*://*.whatsapp.com/*",
            "*://*.teams.microsoft.com/*",
            "*://*.slack.com/*",
            "*://mail.google.com/*",
            "*://*.messenger.com/*",
            "*://*.telegram.org/*"
          ],
          js: ["content.js"],
          run_at: "document_end"
        }
      ]
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "manifest.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadContentScriptFile = () => {
    const code = `// FlowTalk Extension Loader Content Script
console.log("FlowTalk Assistant Enabled successfully.");

const floatBubble = document.createElement("div");
floatBubble.id = "flowtalk-ext-bubble";
floatBubble.style.cssText = "position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, #6264A7, #8B5CF6); box-shadow:0 10px 25px rgba(98,100,167,0.5); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:999999; border:2px solid rgba(255,255,255,0.4); transition:all 0.3s ease;";
floatBubble.innerHTML = \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>\`;

document.body.appendChild(floatBubble);

const frameContainer = document.createElement("div");
frameContainer.id = "flowtalk-ext-frame";
frameContainer.style.cssText = "position:fixed; bottom:92px; right:24px; width:400px; height:580px; border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.18); border:1px solid rgba(140,140,140,0.15); z-index:999998; overflow:hidden; display:none; background:#ffffff; transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);";
frameContainer.innerHTML = \`<iframe src="https://ais-pre-jwi62uh5cecmsd3gz7cpq7-168680539223.asia-east1.run.app" style="width:100%; height:100%; border:none;" referrerpolicy="no-referrer"></iframe>\`;

document.body.appendChild(frameContainer);

floatBubble.onclick = () => {
  if (frameContainer.style.display === "none" || !frameContainer.style.display) {
    frameContainer.style.display = "block";
    floatBubble.style.transform = "scale(0.95) rotate(45deg)";
  } else {
    frameContainer.style.display = "none";
    floatBubble.style.transform = "scale(1) rotate(0deg)";
  }
};

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "flowtalk-insert") {
    const activeTextarea = document.activeElement;
    if (activeTextarea) {
      if (activeTextarea.tagName === "INPUT" || activeTextarea.tagName === "TEXTAREA") {
        activeTextarea.value = event.data.text;
        activeTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (activeTextarea.isContentEditable) {
        activeTextarea.innerText = event.data.text;
        activeTextarea.innerHTML = event.data.text;
        activeTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }
});`;

    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "content.js";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDetectLanguage = async (text: string) => {
    if (!text.trim() || text.trim().length < 3) {
      setDetectedLanguage(null);
      return;
    }
    setIsDetectingLanguage(true);
    try {
      const response = await fetch('/api/flowtalk/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          customGeminiKey: userProfile?.customGeminiKey || ''
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setDetectedLanguage(data.language);
      }
    } catch (err) {
      console.error("Error detecting language:", err);
    } finally {
      setIsDetectingLanguage(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="flowtalk-overlay"
          drag
          dragMomentum={false}
          dragConstraints={dragBounds}
          initial={{ opacity: 0, scale: 0.9, x: overlayPos.x, y: overlayPos.y + 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: overlayPos.x,
            y: overlayPos.y,
            height: isMinimized ? 64 : (size.height === 'auto' ? 'auto' : size.height)
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            width: size.width,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 40px)',
            display: 'flex',
            flexDirection: 'column'
          }}
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
                  {!isMinimized && <p className="text-[9px] opacity-80 uppercase tracking-widest font-medium truncate" title={targetInfo}>{targetInfo}</p>}
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
                  <div ref={dropdownRef} className="relative flex items-center bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 space-x-2 transition-all">
                    {/* Source Language Button */}
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'source' ? null : 'source')}
                      className="flex items-center space-x-1 text-white text-[10px] font-bold tracking-tight uppercase hover:text-white/90 transition-all outline-none cursor-pointer"
                      title="Source Language"
                    >
                      <span className="text-xs">{LANGUAGES.find(l => l.code === sourceLanguage)?.flag}</span>
                      <span>{LANGUAGES.find(l => l.code === sourceLanguage)?.name}</span>
                      <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${activeDropdown === 'source' ? 'rotate-180' : ''}`} />
                    </button>

                    <span className="text-[10px] opacity-40 font-bold text-white select-none">→</span>

                    {/* Target Language Button */}
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'target' ? null : 'target')}
                      className="flex items-center space-x-1 text-white text-[10px] font-bold tracking-tight uppercase hover:text-white/90 transition-all outline-none cursor-pointer"
                      title="Target Language"
                    >
                      <span className="text-xs">{LANGUAGES.find(l => l.code === targetLanguage)?.flag}</span>
                      <span>{LANGUAGES.find(l => l.code === targetLanguage)?.name}</span>
                      <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${activeDropdown === 'target' ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Floating custom dropdown list */}
                    <AnimatePresence>
                      {activeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1.5 w-48 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-[200] max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5 ring-1 ring-black/5"
                        >
                          <p className="text-[9px] font-extrabold uppercase text-slate-400 px-2.5 py-1.5 tracking-wider border-b border-slate-100 select-none">
                            Select {activeDropdown === 'source' ? 'Source' : 'Target'}
                          </p>
                          <div className="py-1 space-y-0.5">
                            {LANGUAGES.map((lang) => {
                              const isSelected = activeDropdown === 'source' ? sourceLanguage === lang.code : targetLanguage === lang.code;
                              return (
                                <button
                                  key={lang.code}
                                  onClick={() => {
                                    if (activeDropdown === 'source') {
                                      setSourceLanguage(lang.code);
                                    } else {
                                      setTargetLanguage(lang.code);
                                    }
                                    setActiveDropdown(null);
                                  }}
                                  className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 text-xs rounded-xl transition-all outline-none cursor-pointer ${isSelected
                                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm select-none">{lang.flag}</span>
                                    <div className="flex flex-col">
                                      <span className="font-semibold leading-none text-slate-800 text-[11px]">{lang.name}</span>
                                      <span className="text-[9px] text-slate-400 leading-none mt-1">{lang.desc}</span>
                                    </div>
                                  </div>
                                  {isSelected && <Check size={12} className="text-indigo-600 font-bold shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Real-time Language Detection Indicator */}
                  {input.trim().length >= 3 && (
                    <div className="flex items-center space-x-1 bg-white/15 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm" title="Real-time Detected Language">
                      {isDetectingLanguage ? (
                        <>
                          <RefreshCw size={8} className="animate-spin text-white/70" />
                          <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest leading-none">DETECTING...</span>
                        </>
                      ) : detectedLanguage ? (
                        <>
                          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">
                            {detectedLanguage}
                          </span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsCompact(!isCompact)}
                  className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1.5 ${isCompact ? 'bg-white text-[#6264A7] shadow-sm' : 'hover:bg-white/10 text-white/70 hover:text-white'
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`${isCompact ? 'p-3 space-y-3' : 'p-5 space-y-5'} flex-1 cursor-default overflow-y-auto custom-scrollbar`}
                onPointerDown={e => e.stopPropagation()}
              >
                {/* Tab Selector */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl mb-3" onPointerDown={e => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveTab('rewrite')}
                    className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 ${activeTab === 'rewrite'
                        ? 'bg-white shadow-sm text-indigo-150 text-indigo-650'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Sparkles size={11} className={activeTab === 'rewrite' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className={activeTab === 'rewrite' ? 'text-indigo-700 font-extrabold' : ''}>Rewrite</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 relative ${activeTab === 'history'
                        ? 'bg-white shadow-sm text-indigo-700'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <History size={11} className={activeTab === 'history' ? 'text-indigo-650' : 'text-slate-400'} />
                    <span className={activeTab === 'history' ? 'text-indigo-700 font-extrabold' : ''}>History</span>
                    {history.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-500 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center ring-1 ring-white">
                        {history.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('integration')}
                    className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 ${activeTab === 'integration'
                        ? 'bg-white shadow-sm text-purple-650'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Chrome size={11} className={activeTab === 'integration' ? 'text-purple-650' : 'text-slate-400'} />
                    <span className={activeTab === 'integration' ? 'text-purple-750 font-black animate-pulse' : 'text-purple-600/80 font-bold'}>Use Anywhere</span>
                  </button>
                </div>

                {activeTab === 'history' ? (
                  <div className="space-y-4">
                    {/* Account details synced as binugede@gmail.com */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl border border-indigo-100/30 p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
                          BG
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-800 leading-tight">binugede@gmail.com</h4>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Account Sync On</p>
                        </div>
                      </div>
                      {history.length > 0 && (
                        <button
                          onClick={clearHistory}
                          className="px-2.5 py-1 text-[9px] font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 hover:border-red-500 transition-all rounded-lg outline-none"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search past thoughts or rewrites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 text-[10px] text-slate-400 hover:text-slate-600 outline-none font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* List area */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredHistory.length === 0 ? (
                        <div className="text-center py-8 px-4 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                          <div className="mx-auto w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                            <History size={14} />
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            {searchQuery ? "No matches found" : "No saved conversations."}
                          </p>
                          <p className="text-[10px] text-slate-300 mt-1">
                            {searchQuery ? "Try altering your query" : "Successful rewrites auto-save here"}
                          </p>
                        </div>
                      ) : (
                        filteredHistory.map((item) => (
                          <HistoryItemCard
                            key={item.id}
                            item={item}
                            onInsert={() => {
                              handleInsert(item.rewritten);
                              setOutput(item.rewritten);
                              setActiveTab('rewrite');
                            }}
                            onDelete={() => deleteConversation(item.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ) : activeTab === 'integration' ? (
                  <div className="space-y-4">
                    {/* Sub-selector */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/30">
                      <button
                        onClick={() => setIntegrationSubTab('extension')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${integrationSubTab === 'extension'
                            ? 'bg-white text-purple-600 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-850'
                          }`}
                      >
                        <Chrome size={12} className={integrationSubTab === 'extension' ? 'text-purple-650' : 'text-slate-405'} />
                        <span>Chrome Ext</span>
                      </button>
                      <button
                        onClick={() => setIntegrationSubTab('desktop')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${integrationSubTab === 'desktop'
                            ? 'bg-white text-purple-600 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-850'
                          }`}
                      >
                        <Laptop size={12} className={integrationSubTab === 'desktop' ? 'text-purple-650' : 'text-slate-405'} />
                        <span>Desktop App</span>
                      </button>
                      <button
                        onClick={() => setIntegrationSubTab('mobile')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${integrationSubTab === 'mobile'
                            ? 'bg-white text-purple-600 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-850'
                          }`}
                      >
                        <Smartphone size={12} className={integrationSubTab === 'mobile' ? 'text-purple-650' : 'text-slate-405'} />
                        <span>Mobile Sync</span>
                      </button>
                    </div>

                    {/* Content panels */}
                    {integrationSubTab === 'extension' && (
                      <div className="space-y-3.5 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 p-4 rounded-2xl border border-purple-100/50">
                        <div>
                          <span className="text-[9px] font-bold text-white uppercase px-2 py-0.5 bg-purple-600 rounded-lg tracking-wider">Chrome Extension Guide</span>
                          <h4 className="text-sm font-extrabold text-slate-850 mt-2">Floating Assistant in Real Chats</h4>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            Inject the floating FlowTalk Bubble into top web apps like <strong>WhatsApp Web</strong>, <strong>Slack Chat</strong>, and <strong>Teams Web</strong>. Smart rewrites will insert directly into any chat input!
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Developer Install Code</h5>

                          <div className="flex flex-col space-y-1.5 pt-1">
                            <button
                              onClick={downloadManifestFile}
                              className="w-full flex items-center justify-between px-3.5 py-2 bg-white hover:bg-slate-55 border border-slate-200 hover:border-purple-300 rounded-xl font-bold text-xs text-slate-700 transition-all shadow-sm outline-none"
                            >
                              <div className="flex items-center space-x-2">
                                <FileCode size={14} className="text-purple-650" />
                                <span>1. Download <strong>manifest.json</strong></span>
                              </div>
                              <Download size={14} className="text-slate-400" />
                            </button>

                            <button
                              onClick={downloadContentScriptFile}
                              className="w-full flex items-center justify-between px-3.5 py-2 bg-white hover:bg-slate-55 border border-slate-200 hover:border-purple-300 rounded-xl font-bold text-xs text-slate-700 transition-all shadow-sm outline-none"
                            >
                              <div className="flex items-center space-x-2">
                                <FileCode size={14} className="text-indigo-650" />
                                <span>2. Download <strong>content.js</strong></span>
                              </div>
                              <Download size={14} className="text-slate-400" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed space-y-1">
                          <p className="font-bold text-slate-800">Quick Setup Instructions:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-slate-550">
                            <li>Place both downloaded files into a new folder on your computer named <code className="bg-slate-150 px-1 rounded text-purple-650 font-bold font-mono">flowtalk-ext</code>.</li>
                            <li>Open Chrome and navigate to <code className="bg-slate-150 px-1 rounded text-slate-700 font-semibold font-mono">chrome://extensions</code>.</li>
                            <li>Turn on <strong>Developer Mode</strong> (toggle in top-right corner).</li>
                            <li>Click <strong>Load unpacked</strong> and select your folder.</li>
                          </ol>
                          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">⭐ Ready to rewrite anywhere on the web!</p>
                        </div>
                      </div>
                    )}

                    {integrationSubTab === 'desktop' && (
                      <div className="space-y-4 bg-gradient-to-br from-[#F5F3FF] to-white p-4 rounded-2xl border border-indigo-100/60">
                        <div>
                          <span className="text-[9px] font-bold text-white uppercase px-2 py-0.5 bg-indigo-500 rounded-lg tracking-wider">Independent Desktop App</span>
                          <h4 className="text-sm font-extrabold text-slate-850 mt-2">Installable Standalone Floating Window</h4>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            Run FlowTalk as an independent borderless app, floating nicely next to Telegram, Skype, or Discord.
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-100">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-[10px] text-indigo-600 mt-0.5">1</span>
                            <div className="text-xs">
                              <p className="font-bold text-slate-850">Browser Address Bar Install</p>
                              <p className="text-slate-500 mt-0.5">Click the "App Install" icon next to the URL star in Google Chrome, Microsoft Edge, or Arc browser.</p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-100">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-[10px] text-indigo-600 mt-0.5">2</span>
                            <div className="text-xs">
                              <p className="font-bold text-slate-850">Floating Overlay Window</p>
                              <p className="text-slate-500 mt-0.5">Tick <strong>"Open as window"</strong> when installing so it runs standalone instead of a browser tab.</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Supported Platform Integrations</span>
                          <div className="flex space-x-2 font-bold text-[9px] text-[#555]">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">MACOS</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">WINDOWS</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">LINUX</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {integrationSubTab === 'mobile' && (
                      <div className="space-y-4 bg-gradient-to-br from-indigo-50/50 to-white p-4 rounded-2xl border border-indigo-100/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-bold text-white uppercase px-2 py-0.5 bg-green-500 rounded-lg tracking-wider">Universal Mobile Sync</span>
                            <h4 className="text-sm font-extrabold text-slate-850 mt-1.5">Scan to Use Context On Your Phone</h4>
                          </div>
                          <div className="flex items-center space-x-1.5 bg-green-50 px-2 py-0.5 rounded-lg border border-green-200/60 shadow-sm shrink-0">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-green-700 uppercase tracking-widest leading-none font-sans">SYNCED</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100">
                          <div className="w-[110px] h-[110px] bg-slate-50 rounded-lg flex items-center justify-center p-1 border border-slate-100 flex-shrink-0">
                            <img
                              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fais-pre-jwi62uh5cecmsd3gz7cpq7-168680539223.asia-east1.run.app"
                              alt="Universal Applet Link QR Code"
                              className="w-24 h-24"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="text-xs space-y-1 leading-normal">
                            <p className="font-extrabold text-slate-850">Scan Phone Camera</p>
                            <p className="text-slate-500">Scan this code to load FlowTalk AI into your iPhone or Android browser instantly.</p>
                            <p className="text-[10px] text-slate-400 pt-1 font-semibold">Uses your mobile Native Speech-to-Text for ultra-fluent voice input in Hindi & Bengali anywhere!</p>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1 text-[11px] text-slate-600">
                          <div className="flex justify-between items-center text-slate-800 font-bold mb-1">
                            <span>Universal Cloud Sync Key</span>
                            <span className="text-[9px] bg-slate-200 text-slate-605 px-1.5 py-0.5 rounded font-mono">SECURE</span>
                          </div>
                          <p>All rewrites made using your email <strong className="text-indigo-600 font-bold">binugede@gmail.com</strong> align automatically across mobile Safari, Desktop App, and the Chrome Extension instantly.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              if (debounceTimer.current) clearTimeout(debounceTimer.current);
                              handleRewrite();
                            }
                          }}
                          placeholder={isCompact ? "Type..." : "Type naturally... (⌘+Enter to rewrite)"}
                          className={`w-full ${isCompact ? 'h-16 text-xs p-2.5' : 'h-24 text-xs md:text-sm p-3.5'} bg-slate-50 border border-slate-100 rounded-xl font-medium italic focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-300 pr-10 overflow-y-auto custom-scrollbar`}
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
                          className={`absolute ${isCompact ? 'bottom-2 right-2 p-1.5' : 'bottom-3 right-3 p-2'} rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600'
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
                        <div className="relative px-2">
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
                              { id: 'professional', label: 'Pro', premium: true },
                              { id: 'casual', label: 'Casual', premium: false },
                              { id: 'executive', label: 'Exec', premium: true }
                            ].map((t) => {
                              const isUsingCustomKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
                              const isPremiumUnlocked = userProfile?.plan === 'Pro' || userProfile?.plan === 'Enterprise' || isUsingCustomKey;
                              const isToneLocked = t.premium && !isPremiumUnlocked;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => handleToneChange(t.id as Tone)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all flex items-center gap-0.5 ${tone === t.id
                                      ? 'bg-white shadow-sm text-indigo-600'
                                      : isToneLocked
                                        ? 'text-slate-350 hover:text-slate-500'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                  <span>{t.label}</span>
                                  {isToneLocked && <Lock size={7} className="text-slate-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {localFallbackActive && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-[10.5px] text-amber-800 leading-normal font-medium shadow-xs">
                          <span className="text-amber-500 font-extrabold shrink-0 select-none text-xs">⚠️</span>
                          <div>
                            <span className="font-bold text-amber-900 block mb-0.5 uppercase tracking-wider text-[9px]">Demo Limit Active</span>
                            <span className="text-amber-700 font-medium leading-relaxed">Shared limit reached. Running local translation. Configure a personal key in options to bypass.</span>
                          </div>
                        </div>
                      )}
                      <div className={`bg-indigo-50/40 border border-indigo-100 ${isCompact ? 'p-3 min-h-[60px] max-h-[100px]' : 'p-4 min-h-[80px] max-h-[150px]'} rounded-xl relative group overflow-y-auto custom-scrollbar`}>
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
                              className={`${isCompact ? 'text-[11px]' : 'text-xs md:text-sm'} text-slate-800 leading-relaxed font-semibold`}
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
                              onClick={() => {
                                setOutput(s);
                                saveToHistory(input, s);
                              }}
                              className="text-left p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-all text-[11px] text-slate-600 italic leading-snug hover:border-indigo-200"
                            >
                              "{s}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className={`${isCompact ? 'pt-0.5' : 'pt-2'} flex items-center space-x-2`}>
                      <button
                        onClick={() => handleInsert(output)}
                        disabled={!output}
                        className={`flex-1 bg-[#6264A7] hover:bg-[#4b4d8d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold ${isCompact ? 'py-1.5 rounded-lg' : 'py-2.5 rounded-xl'} shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98] group`}
                      >
                        <span className={isCompact ? 'text-xs' : 'text-sm'}>Insert Message</span>
                        <ArrowRight size={isCompact ? 14 : 16} className="group-hover:translate-x-1 transition-transform" />
                      </button>

                      <button
                        onClick={handleCopy}
                        disabled={!output}
                        className={`bg-slate-100 hover:bg-slate-200 disabled:opacity-55 disabled:cursor-not-allowed text-slate-700 font-bold ${isCompact ? 'py-1.5 px-3 rounded-lg text-xs' : 'py-2.5 px-4 rounded-xl text-sm'} border border-slate-200 flex items-center justify-center space-x-1.5 transition-all transform active:scale-[0.98] outline-none shrink-0`}
                        title="Copy rewritten message to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check size={isCompact ? 14 : 16} className="text-green-600 font-bold" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={isCompact ? 14 : 16} className="text-slate-600" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
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
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        opacity: isOpen ? 0 : 1,
        scale: isOpen ? 0 : 1,
        pointerEvents: isOpen ? 'none' : 'auto'
      }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-12 right-4 md:right-12 z-50 group cursor-grab active:cursor-grabbing"
      id="flowtalk-bubble"
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
          <div className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center relative border-4 transition-all duration-300 ${isOpen ? 'bg-white border-indigo-200' : 'bg-white border-indigo-100'
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
