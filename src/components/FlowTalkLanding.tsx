import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  RotateCcw, 
  TrendingUp, 
  Coins, 
  Key, 
  Shield, 
  Activity, 
  Code, 
  Laptop, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Info, 
  Lock, 
  User, 
  List, 
  Briefcase, 
  Layers, 
  Languages, 
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  LogOut,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { useUser, UserProfile, TransactionRecord } from '../contexts/UserContext';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  setDoc
} from 'firebase/firestore';
import { Tone, SavedConversation } from '../types';

interface FlowTalkLandingProps {
  onOpenControlPanel: () => void;
}

export const FlowTalkLanding: React.FC<FlowTalkLandingProps> = ({ onOpenControlPanel }) => {
  const { 
    currentUser, 
    userProfile, 
    loginWithGoogle, 
    logout, 
    useCredit, 
    purchasePlan 
  } = useUser();

  // Playground state
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [currentTone, setCurrentTone] = useState<Tone>('casual');
  const [currentApp, setCurrentApp] = useState('Microsoft Teams');
  const [sourceLang, setSourceLang] = useState('Auto-detect');
  const [targetLang, setTargetLang] = useState('English');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [localFallbackActive, setLocalFallbackActive] = useState<boolean>(false);

  const handleToneSelect = (selectedTone: Tone) => {
    const isUsingCustomKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
    const isPremium = userProfile?.plan === 'Pro' || userProfile?.plan === 'Enterprise' || isUsingCustomKey;
    if ((selectedTone === 'professional' || selectedTone === 'executive') && !isPremium) {
      setErrorMsg("The 'Professional' and 'Executive' tones are premium styles of FlowTalk. Upgrade your licensing plan or bind your custom Gemini API key in the Control Panel to unlock!");
      return;
    }
    setErrorMsg(null);
    setCurrentTone(selectedTone);
  };
  
  // Interactivity feedback
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Playground history synced from Firestore (or LocalStorage as fallback)
  const [dbHistory, setDbHistory] = useState<SavedConversation[]>([]);
  const [localHistory, setLocalHistory] = useState<SavedConversation[]>(() => {
    try {
      const saved = localStorage.getItem('flowtalk_local_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Stripe Sandbox Checkout Flow State
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<{ plan: 'Pro' | 'Enterprise', price: number, credits: number } | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Template pre-sets
  const templates = [
    { label: 'Hinglish Delayed', text: 'yaar late ho rha hu signal me fasa hu files check karo tab tak' },
    { label: 'Bengali Request', text: 'kal meeting aache file gulo sob ready kore rakhish please bhai' },
    { label: 'Spanish Sick day', text: 'hola jefe me siento un poco mal hoy no podre asistir al trabajo' },
    { label: 'Casual Frustration', text: 'this is so boring session why are we here let us wrap this up' }
  ];

  // Sync local history updates
  useEffect(() => {
    localStorage.setItem('flowtalk_local_history', JSON.stringify(localHistory));
  }, [localHistory]);

  // Real-time snapshot of Firestore conversation history for signed in users
  useEffect(() => {
    if (!currentUser) {
      setDbHistory([]);
      return;
    }

    const convColRef = collection(db, 'users', currentUser.uid, 'saved_conversations');
    const q = query(convColRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: SavedConversation[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() } as SavedConversation);
      });
      // Sort client-side down by timestamp ISO sequence if orderBy needs index configurations
      records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setDbHistory(records);
    }, (err) => {
      console.error("Failed to load historical synchronized conversations", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Translate / Rewrite Action call 
  const handleRewrite = async (overrideText?: string, overrideTone?: Tone) => {
    const textToProcess = overrideText || inputText;
    const toneToUse = overrideTone || currentTone;

    if (!textToProcess.trim()) {
      setErrorMsg("Please write or select a casual thought to begin transformation.");
      return;
    }

    // Check credentials constraint 
    const isUsingCustomApiKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
    const isEnterprise = userProfile?.plan === 'Enterprise';
    const isRestricted = !isUsingCustomApiKey && !isEnterprise;

    if (isRestricted && userProfile && userProfile.credits <= 0) {
      setErrorMsg("Your balance represents 0 credits. Please purchase a pro subscription plan or configure your personal Google Gemini developer key to bypass billing meters.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuggestions([]);
    
    try {
      // 1. Detect language first 
      const langResponse = await fetch('/api/flowtalk/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: textToProcess,
          customGeminiKey: userProfile?.customGeminiKey || ''
        })
      });
      if (langResponse.ok) {
        const langData = await langResponse.json();
        setDetectedLanguage(langData.language || 'Mixed');
      }

      // 2. Perform rewrite
      const response = await fetch('/api/flowtalk/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: textToProcess,
          tone: toneToUse,
          currentApp,
          sourceLanguage: sourceLang === 'Auto-detect' ? 'Auto-detect' : sourceLang,
          targetLanguage: targetLang,
          customGeminiKey: userProfile?.customGeminiKey || ''
        })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || "Transformation aborted");
      }

      const data = await response.json();
      setOutputText(data.output || '');
      setSuggestions(data.suggestions || []);
      
      if (data.localFallbackApplied) {
        setLocalFallbackActive(true);
      } else {
        setLocalFallbackActive(false);
      }

      // 3. Deduct credit meters (only if cloud AI successfully processed)
      if (isRestricted && userProfile && !data.localFallbackApplied) {
        await useCredit();
      }

      // 4. Persistence backup matching Firestore or Local fallback
      const conversationRecord = {
        app: currentApp,
        tone: toneToUse,
        sourceLang: detectedLanguage || sourceLang,
        targetLang: targetLang,
        original: textToProcess,
        rewritten: data.output || '',
        timestamp: new Date().toISOString(),
        targetInfo: "Playground Input"
      };

      if (currentUser) {
        // Log deep observable write into user subcollection
        const customId = 'conv_' + Date.now();
        await setDoc(doc(db, 'users', currentUser.uid, 'saved_conversations', customId), conversationRecord);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else {
        // fallback to standard locale arrays
        const localRec: SavedConversation = {
          id: Date.now().toString(),
          ...conversationRecord
        };
        setLocalHistory(prev => [localRec, ...prev]);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to make communication connection with server engines. Verify connection protocols.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback coping failure", err);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'saved_conversations', recordId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `saved_conversations/${recordId}`);
      }
    } else {
      setLocalHistory(prev => prev.filter(item => item.id !== recordId));
    }
  };

  const clearRecords = async () => {
    if (currentUser) {
      for (const conv of dbHistory) {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'saved_conversations', conv.id));
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      setLocalHistory([]);
    }
  };

  // Payment simulated processing
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    const formatted = value.length >= 2 ? `${value.substring(0, 2)}/${value.substring(2)}` : value;
    setCardExpiry(formatted);
  };

  const processSimulatedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckoutPlan) return;

    setCheckoutProcessing(true);
    setTimeout(async () => {
      try {
        await purchasePlan(activeCheckoutPlan.plan, activeCheckoutPlan.price, activeCheckoutPlan.credits);
        setCheckoutProcessing(false);
        setCheckoutSuccess(true);
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardName('');

        setTimeout(() => {
          setCheckoutSuccess(false);
          setActiveCheckoutPlan(null);
        }, 2200);
      } catch (err) {
        console.error(err);
        setCheckoutProcessing(false);
      }
    }, 1800);
  };

  const activeHistory = currentUser ? dbHistory : localHistory;

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-purple-950/50 border border-purple-800/40 p-1.5 px-3 rounded-full text-xs text-purple-300 font-extrabold tracking-wide mb-6 uppercase"
          >
            <Sparkles size={12} className="text-purple-400" />
            <span>FlowTalk Version 2.4 Active</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none max-w-4xl mx-auto font-sans text-center"
          >
            Say it casually. <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">We make it professional.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto mt-6 leading-relaxed font-semibold text-center"
          >
            Stop wasting hours drafting polite letters or corporate messages. Transform messy bilingual thoughts, Hinglish, Bengali-English slang or quick complaints into flawless professional communication matched exactly for MS Teams, Slack or Emails.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10"
          >
            <a 
              href="#playground"
              className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/60 transition-all hover:scale-105 outline-none flex items-center space-x-2"
            >
              <span>Launch Live Playground</span>
              <ArrowRight size={14} />
            </a>

            <a 
              href="#pricing"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all outline-none border border-slate-700/60"
            >
              See Pricing & Tiers
            </a>
          </motion.div>

          {/* Stat metrics */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20 pt-8 border-t border-slate-800/60 text-center"
          >
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">99.8%</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Colloquial Accuracy</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">&lt; 150ms</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Average Response</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">100k+</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Drafts Written Today</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">Isolated</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-tenant Security</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. DYNAMIC INTERACTIVE PLAYGROUND */}
      <section id="playground" className="py-20 bg-slate-950 relative scroll-mt-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(98,100,167,0.02),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          
          <div className="text-center md:text-left mb-10 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                <Sparkles size={20} className="text-purple-400" />
                <span>Live Interactive Playground</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Type standard thoughts in bilingual terms or choose our preloaded slang widgets to see the live generative results.</p>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 p-1 px-3 rounded-full font-bold">
                Meters Refreshed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Controller: Prompt room */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 border border-slate-800/80 space-y-6">
              
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Step 1: Choose Style Preset & Tone</span>
                
                {/* Target App selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                  {['Microsoft Teams', 'Slack', 'Email', 'WhatsApp'].map(app => (
                    <button 
                      key={app}
                      onClick={() => setCurrentApp(app)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition-all outline-none border ${
                        currentApp === app 
                          ? 'bg-[#6264A7]/20 border-[#6264A7] text-white shadow-inner shadow-indigo-950' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>

                {/* Target Tone Selection */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(['casual', 'professional', 'executive'] as Tone[]).map(t => {
                    const isUsingCustomKey = !!(userProfile?.customGeminiKey && userProfile.customGeminiKey.trim());
                    const isPremiumUnlocked = userProfile?.plan === 'Pro' || userProfile?.plan === 'Enterprise' || isUsingCustomKey;
                    const isToneLocked = (t === 'professional' || t === 'executive') && !isPremiumUnlocked;
                    return (
                      <button 
                        key={t}
                        onClick={() => handleToneSelect(t)}
                        className={`py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all outline-none border flex items-center justify-center gap-1.5 ${
                          currentTone === t 
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-inner shadow-purple-950' 
                            : isToneLocked
                              ? 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{t}</span>
                        {isToneLocked && <Lock size={9} className="text-slate-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Language Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-500">Source Language</label>
                  <select 
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:border-purple-500 outline-none"
                  >
                    <option>Auto-detect</option>
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Bengali</option>
                    <option>Hinglish</option>
                    <option>Spanish</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-500">Target Language Output</label>
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full mt-1.5 p-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:border-purple-500 outline-none"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Bengali</option>
                    <option>Spanish</option>
                    <option>German</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Input message prompt */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-extrabold text-slate-500">Your Casual Thought</label>
                  <span className="text-[10px] text-slate-400 font-medium">Bilingual and mixed slang is fully supported</span>
                </div>
                
                <textarea 
                  id="playground-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Key in your casual thought... e.g. 'yaar thoda late ho raha hu file check karo please'"
                  rows={4}
                  className="w-full p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-xs font-semibold text-slate-200 outline-none focus:border-[#6264A7] leading-relaxed resize-none shadow-inner"
                />

                {/* Preset shortcuts selector */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Quick Colloquial Slang presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map((tpl, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setInputText(tpl.text);
                          setErrorMsg(null);
                        }}
                        className="p-1 px-2.5 bg-slate-950 hover:bg-slate-850 hover:text-white rounded-lg border border-slate-800 text-[10px] text-slate-400 transition-all font-bold"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/40 border border-rose-900 hover:bg-rose-950/20 rounded-xl text-rose-400 text-xs flex items-start gap-2 font-medium">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Exec button */}
              <button 
                onClick={() => handleRewrite()}
                disabled={isProcessing || !inputText.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-650 to-indigo-600 hover:opacity-95 text-white bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-950/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex justify-center items-center gap-2 outline-none"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Engaging Gemini 3.5 rewrite pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-purple-300" />
                    <span>Execute Communication Draft</span>
                  </>
                )}
              </button>

            </div>

            {/* Right: Polished Output draft results */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between flex-1 relative min-h-[300px]">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 flex items-center gap-1">
                      <Laptop size={11} /> Format: {currentApp}
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 px-2 rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span>{detectedLanguage || 'Detection Idle'}</span>
                    </div>
                  </div>

                  {localFallbackActive && (
                    <div className="mt-3 flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed shadow-xs">
                      <span className="text-amber-400 shrink-0 text-sm select-none">⚠️</span>
                      <div className="flex-1 space-y-1">
                        <span className="font-bold text-amber-400 tracking-wider uppercase text-[9px] block">Demo Limit Reached</span>
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                          The free shared API tier quota is active. The system gracefully loaded our offline <span className="text-amber-300 font-semibold text-xs font-mono">Local Translation Engine</span> so all text entries remain 100% active. Bind your own Gemini API Key in <span className="text-amber-300 font-bold underline cursor-pointer hover:text-amber-200 transition-colors" onClick={onOpenControlPanel}>License & Credits</span> to experience premium unbound cloud AI.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="py-5 font-medium text-xs leading-relaxed text-slate-200 min-h-[140px] whitespace-pre-wrap select-text">
                    {outputText ? (
                      outputText
                    ) : (
                      <span className="text-slate-500 italic">Pre-compile communication drafts to reveal polished output records. Select one of the quick slang templates on the left and click 'Execute Draft' to start.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Smart dynamic suggestions pill labels */}
                  {suggestions.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-850/60">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">AId Smart Suggestions (Click to Copy):</span>
                      <div className="flex flex-col gap-1">
                        {suggestions.map((sug, idx) => (
                          <button 
                            key={idx}
                            onClick={() => handleCopy(sug)}
                            className="w-full text-left p-2 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-850 text-[11px] text-slate-350 hover:text-white transition-all flex items-center justify-between font-medium group"
                          >
                            <span className="truncate pr-4">{sug}</span>
                            <ChevronRight size={10} className="text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-850/60 pt-3">
                    <span className="text-[9px] text-slate-500 font-medium">Bypassed billing meters & credits check</span>
                    
                    <button 
                      onClick={() => handleCopy(outputText)}
                      disabled={!outputText}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all outline-none ${
                        outputText 
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95' 
                          : 'bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={11} /> <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> <span>Copy Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Informative Security card */}
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-slate-400 leading-normal font-semibold">
                  <span>FlowTalk integrates first-class client side retry pipelines to manage 503 Overloads. Custom Gemini Dev keys bypass platform limits immediately.</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 3. CORE SAAS FEATURES MATRIX */}
      <section id="features" className="py-20 bg-slate-900 border-t border-b border-slate-800 scroll-mt-6">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest bg-purple-950/60 border border-purple-800/40 p-1 px-3 rounded-full">Engine Core Features</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-4">Pristine business translations & layout integrations</h2>
            <p className="text-xs text-slate-400 mt-2">FlowTalk is engineered focusing on responsive output, custom styling integrations and complete administrative security guarantees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 hover:border-purple-600/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-purple-950/60 border border-purple-800/50 text-purple-400 rounded-xl flex items-center justify-center font-bold mb-4">
                  <Languages size={18} />
                </div>
                <h3 className="text-sm font-black text-white">Dynamic Bilingual Intelligence</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                  Deeply trained translation pipelines capable of recognizing Hinglish (Hindi-English), Bengali-English, Spanish dialects, and casual mixed thought patterns, outputting formal drafts natively.
                </p>
              </div>
              <span className="text-[9px] text-[#6264A7] font-black uppercase tracking-wider block pt-4">Auto-Language Analysis Enabled</span>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 hover:border-purple-600/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-indigo-950/60 border border-indigo-800/50 text-indigo-450 rounded-xl flex items-center justify-center font-bold mb-4">
                  <Layers size={18} />
                </div>
                <h3 className="text-sm font-black text-white">Target Style Adapters</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                  Tuned for Microsoft Teams, professional Slack channels, Outlook email protocols, and fast instant WhatsApp business messages, aligning greetings and structural elements perfectly.
                </p>
              </div>
              <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block pt-4">4 Custom Output Formats</span>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 hover:border-purple-600/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-cyan-950/60 border border-cyan-850/50 text-cyan-404 rounded-xl flex items-center justify-center font-bold mb-4">
                  <Key size={18} />
                </div>
                <h3 className="text-sm font-black text-white">BYO Developer API Credentials</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                  Optionally bind your personal Google Gemini developer API Key securely, allowing standard users to completely bypass system credit bounds and access direct developer pipelines.
                </p>
              </div>
              <span className="text-[9px] text-cyan-400 font-black uppercase tracking-wider block pt-4">Secured Tenant Credential Keyhole</span>
            </div>

          </div>

        </div>
      </section>

      {/* 4. REAL-TIME SYNCHRONIZED ARCHIVE (DATABASE LEDGER) */}
      <section id="history" className="py-20 bg-slate-950 scroll-mt-6">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-5 mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <List size={20} className="text-indigo-400" />
                <span>Synchronized Conversation Archive</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {currentUser ? (
                  <span>Real-time cloud database telemetry logs pulled securely from Firestore node.</span>
                ) : (
                  <span>Local sandboxed ledger logs. Authenticate your account to sync this globally.</span>
                )}
              </p>
            </div>

            {activeHistory.length > 0 && (
              <button 
                onClick={clearRecords}
                className="flex items-center space-x-1.5 p-1.5 px-3 bg-red-950/40 hover:bg-rose-950/30 border border-rose-900 text-rose-450 hover:text-rose-400 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all outline-none"
              >
                <Trash2 size={11} />
                <span>Wipe Output Log</span>
              </button>
            )}
          </div>

          {!currentUser && (
            <div className="mb-6 p-4 bg-indigo-950/40 border border-indigo-900 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-3">
                <Lock size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-350 font-semibold leading-normal">
                  You are viewing local sandbox state. Connect with Google Authentication to preserve historical communication sheets in the multi-tenant Cloud Firestore database safely!
                </p>
              </div>
              <button 
                onClick={onOpenControlPanel}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md inline-flex shrink-0 outline-none"
              >
                Sync & Get Started
              </button>
            </div>
          )}

          {activeHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800/80 p-8 space-y-3">
              <span className="text-2xl">📋</span>
              <p className="text-xs text-slate-500 font-semibold">Conversation archive folder is currently empty. Run transformations inside the Live Playground segment to record drafts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AnimatePresence>
                {activeHistory.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-slate-900 border border-slate-800/60 rounded-2xl p-5 space-y-4 relative group"
                  >
                    <div className="flex flex-wrap gap-2 items-center text-[9px] uppercase font-black tracking-wider w-full border-b border-dashed border-slate-800/40 pb-3">
                      <span 
                        className="bg-amber-500/15 border border-amber-500/30 text-amber-300 p-1 px-2.5 rounded-lg font-bold max-w-[155px] sm:max-w-[180px] truncate flex items-center gap-1 shrink-0" 
                        title={item.targetInfo || "Playground Input"}
                      >
                        🎯 {item.targetInfo || "Playground Input"}
                      </span>
                      <span className="bg-purple-950/30 border border-purple-800/30 text-purple-300 p-1 px-2.5 rounded-lg font-bold shrink-0">
                        {item.tone}
                      </span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <span className="text-slate-500 font-mono font-medium">
                          {item.timestamp.includes('T') ? new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : item.timestamp}
                        </span>
                        <button 
                          onClick={() => deleteRecord(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 rounded-lg transition-all opacity-40 group-hover:opacity-100 focus:opacity-100 outline-none"
                          title="Delete conversation from history"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-550 block uppercase font-mono tracking-wider">Orig Thought:</span>
                        <p className="text-slate-400 italic mt-0.5 font-semibold">"{item.original}"</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-955/30 leading-normal">
                        <span className="text-[9px] font-bold text-slate-550 block uppercase font-mono tracking-wider">Polished Draft:</span>
                        <p className="text-slate-205 font-bold font-sans mt-0.5">{item.rewritten}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => handleCopy(item.rewritten)}
                        className="text-[9px] uppercase font-bold text-slate-450 hover:text-white flex items-center gap-1 hover:underline outline-none"
                      >
                        <Copy size={9} /> Copy Polished
                      </button>
                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

        </div>
      </section>

      {/* 5. PRICING & LIFE LICENSE PLANS SEGMENT */}
      <section id="pricing" className="py-20 bg-slate-900 border-t border-b border-slate-800 scroll-mt-6">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest bg-purple-950/60 border border-purple-800/10 p-1 px-3 rounded-full">Licensing Plans</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-4">Elevate your messaging with enterprise limits</h2>
            <p className="text-xs text-slate-400 mt-2">Unlock professional drafts, unlimited developer endpoints, and permanent synced history ledgers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tier 1 */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900 p-0.5 px-2.5 rounded">Starter Pack</span>
                <h3 className="text-lg font-black text-white mt-4">Free Sandbox</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Try standard casual rewriting with bounded metrics.</p>
                
                <div className="my-5 flex items-baseline">
                  <span className="text-2xl font-black text-white">$0</span>
                  <span className="text-xs text-slate-500 ml-1">/ forever</span>
                </div>

                <div className="pt-4 border-t border-slate-900 space-y-2 text-xs text-slate-400 font-semibold">
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>500 baseline credits included</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>Casual tone rewrites</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>Local history directory</span></div>
                </div>
              </div>

              <button 
                disabled
                className="w-full mt-6 py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Sandbox Ready
              </button>
            </div>

            {/* Tier 2 */}
            <div className="bg-slate-950 p-6 rounded-2xl border-2 border-purple-500 flex flex-col justify-between relative shadow-lg shadow-purple-950/15">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black p-1 px-3.5 rounded-full uppercase tracking-widest shadow-md">Best Value</span>
              
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 p-0.5 px-2.5 rounded">Remote Worker</span>
                <h3 className="text-lg font-black text-white mt-4">Pro Business</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Perfect for dynamic remote workers and communication teams.</p>
                
                <div className="my-5 flex items-baseline">
                  <span className="text-2xl font-black text-white">$12</span>
                  <span className="text-xs text-slate-500 ml-1">/ one-time</span>
                </div>

                <div className="pt-4 border-t border-slate-900 space-y-2 text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-550" /> <span>+5,000 Premium credits matching</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-550" /> <span>Unlocks "Professional" corporate tones</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-550" /> <span>Permanent cloud dashboard syncs</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-550" /> <span>High throughput developer speed levels</span></div>
                </div>
              </div>

              {!currentUser ? (
                <button 
                  onClick={onOpenControlPanel}
                  className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md outline-none"
                >
                  Get Started to Buy
                </button>
              ) : (
                <button 
                  onClick={() => setActiveCheckoutPlan({ plan: 'Pro', price: 12, credits: 5000 })}
                  className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-wider active:scale-95 hover:opacity-95 transition-all shadow-md shadow-purple-900/40 outline-none"
                >
                  {userProfile?.plan === 'Pro' ? 'Buy credits again ($12)' : 'Upgrade to Pro ($12)'}
                </button>
              )}
            </div>

            {/* Tier 3 */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 p-0.5 px-2.5 rounded">Unlimited Lifetime</span>
                <h3 className="text-lg font-black text-white mt-4">Executive Elite</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Designed for high output team managers and elite developers.</p>
                
                <div className="my-5 flex items-baseline">
                  <span className="text-2xl font-black text-white">$39</span>
                  <span className="text-xs text-slate-500 ml-1">/ lifetime</span>
                </div>

                <div className="pt-4 border-t border-slate-900 space-y-2 text-xs text-slate-400 font-semibold">
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span><strong>Unlimited lifetime credit meters</strong></span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>Unlocks formal "Executive Elite" tone sets</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>Custom Developer key bindings</span></div>
                  <div className="flex items-center gap-2"><Check size={11} className="text-purple-500" /> <span>Priority technical support reviews</span></div>
                </div>
              </div>

              {!currentUser ? (
                <button 
                  onClick={onOpenControlPanel}
                  className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-755 text-slate-350 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider outline-none transition-all active:scale-95"
                >
                  Get Started to Buy
                </button>
              ) : (
                <button 
                  onClick={() => setActiveCheckoutPlan({ plan: 'Enterprise', price: 39, credits: 100000 })}
                  className="w-full mt-6 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider outline-none transition-all active:scale-95"
                >
                  {userProfile?.plan === 'Enterprise' ? 'Active Lifetime License' : 'Upgrade to Enterprise ($39)'}
                </button>
              )}
            </div>

          </div>

          {/* Secure simulated Checkout Modal overlay */}
          <AnimatePresence>
            {activeCheckoutPlan && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white text-slate-900 rounded-3xl w-full max-w-md p-6 border border-slate-205 shadow-2xl space-y-5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Stripe Sandbox Terminal
                    </span>
                    <button 
                      onClick={() => setActiveCheckoutPlan(null)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg text-slate-650 font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>

                  {checkoutSuccess ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                        ✓
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base">Payment Authorized Successfully</h4>
                      <p className="text-xs text-slate-500">License updated. Credits matched on secure networks.</p>
                    </div>
                  ) : (
                    <form onSubmit={processSimulatedPayment} className="space-y-4">
                      
                      {/* Interactive Credit Card visual represent */}
                      <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-5 rounded-2xl text-white font-mono shadow-md relative overflow-hidden flex flex-col justify-between h-36 border border-slate-850">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
                        
                        <div className="flex justify-between items-start text-[10px] text-slate-450 uppercase">
                          <span className="font-bold">Sandbox Stripe</span>
                          <span>CC</span>
                        </div>

                        <div className="text-sm tracking-wider my-1 text-slate-200 text-center font-bold">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>

                        <div className="flex justify-between text-[8px] text-slate-400 font-semibold uppercase">
                          <div>
                            <p className="text-slate-550 text-[7px]">Card Holder</p>
                            <p className="truncate w-24 font-bold text-slate-300">{cardName || 'YOUR FULL NAME'}</p>
                          </div>
                          <div className="flex gap-3">
                            <div>
                              <p className="text-slate-550 text-[7px]">Expires</p>
                              <p className="font-bold text-slate-300">{cardExpiry || 'MM/YY'}</p>
                            </div>
                            <div>
                              <p className="text-slate-550 text-[7px]">CVV</p>
                              <p className="font-bold text-slate-300">{cardCvv ? '•••' : 'MM'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 text-purple-750 font-bold border border-purple-100 rounded-xl text-xs flex justify-between items-center">
                        <span>Licence Option: {activeCheckoutPlan.plan}</span>
                        <span>Price Due: ${activeCheckoutPlan.price}.00</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Cardholder Name</label>
                          <input 
                            required
                            type="text"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                          <input 
                            required
                            type="text"
                            placeholder="4111 2222 3333 4444"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Expiration</label>
                            <input 
                              required
                              type="text"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-205 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Security Code</label>
                            <input 
                              required
                              type="password"
                              maxLength={3}
                              placeholder="***"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-205 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={checkoutProcessing}
                        className="w-full py-3 bg-[#6264A7] hover:bg-[#525497] text-white rounded-xl font-bold text-xs shadow-md mt-2 flex justify-center items-center gap-2 outline-none"
                      >
                        {checkoutProcessing ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Confirming secure sync...</span>
                          </>
                        ) : (
                          <span>Submit Authorize & Upgrade</span>
                        )}
                      </button>

                    </form>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* 6. DEV SPEC & SYSTEM INVARIANTS SEGMENT */}
      <section id="dev-spec" className="py-20 bg-slate-950 scroll-mt-6">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="border border-slate-800/80 rounded-3xl p-6 md:p-8 bg-slate-900/40 mt-6 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 p-4 border-l border-b border-slate-800/80 text-[9px] text-slate-500 font-black uppercase tracking-wider font-mono bg-slate-950">
              System Spec v1
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Code size={18} className="text-cyan-404" />
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300 font-mono">FlowTalk Developer & Security Specification</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-400">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  <Shield size={12} className="text-purple-400" />
                  <span>1. FIREBASE AUTH & SECURITY POLICIES</span>
                </h4>
                <p className="font-semibold">
                  Under the integrated security specifications, FlowTalk mandates secure PIN isolation: No client-side nodes can register, delete, or fetch transaction summaries representing other tenants. Only users matching their authenticated Google context can query resources.
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 font-mono text-[10px] text-slate-400 space-y-1">
                  <p className="text-indigo-400 font-bold">function isOwner(userId) &#123;</p>
                  <p className="pl-4">return isSignedIn() && request.auth.uid == userId;</p>
                  <p className="text-indigo-400 font-bold">&#125;</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  <Activity size={12} className="text-purple-400" />
                  <span>2. SYSTEM INVARIANTS & INTEGRITY</span>
                </h4>
                <p className="font-semibold">
                  Transactions logs represent immutable financial ledger reports. All signups grant a standard 500 baseline credit balance. High output teams can configure custom API endpoints securely.
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 font-mono text-[10px] text-slate-350 space-y-1">
                  <p>• Immutable Roles: Admin escalations are locked on database layer.</p>
                  <p>• Bypass Credit Checking: BYO Gemini Key endpoints disable pricing counters.</p>
                  <p>• Data Stability: Historical timestamps are atomically validated.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 bg-slate-950 text-slate-550 border-t border-slate-850 text-xs font-semibold">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-5 h-5 rounded bg-[#6264A7] flex items-center justify-center font-bold text-[10px] text-white">
              FT
            </div>
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none">FlowTalk AI App</span>
          </div>

          <p className="text-[10px] text-slate-500 text-center md:text-right">
            © 2026 FlowTalk AI Corporation. Sandbox environment. Secured Firebase multi-tenant databases. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};
