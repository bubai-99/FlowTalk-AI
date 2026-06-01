/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlowTalkLanding } from './components/FlowTalkLanding';
import { FlowTalkInstall } from './components/FlowTalkInstall';
import { FlowTalkAuth } from './components/FlowTalkAuth';
import { FlowTalkDashboard } from './components/FlowTalkDashboard';
import { FlowTalkOverlay, FlowTalkBubble } from './components/FlowTalkOverlay';
import { DashboardPortal } from './components/DashboardPortal';
import { useUser } from './contexts/UserContext';
import { INITIAL_MESSAGES, Message } from './types';
import { Coins, Shield, Settings, Lock, Skull, Download } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const { currentUser, userProfile, isAdmin, loginWithGoogle, logout } = useUser();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTab, setCurrentTab] = useState<'product' | 'install' | 'login' | 'register' | 'dashboard'>('product');

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const handleInsertFromAI = (text: string) => {
    setInputValue(text);
    setIsOverlayOpen(false);
  };

  // 1. Suspension Gate matching real-time admin blocking controls
  if (userProfile?.blocked) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-center p-6 select-none font-sans">
        <div className="w-20 h-20 bg-rose-950/40 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10 mb-6 animate-pulse">
          <Skull size={36} />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Access Suspended</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          Your account identity (<strong className="text-rose-450">{userProfile.email}</strong>) has been put on hold by system administrators due to service policy checks.
        </p>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl max-w-sm mt-5 text-[11px] text-slate-450 font-medium">
          Contact administrative support at <strong className="text-indigo-400 font-bold block mt-1">binugede@gmail.com</strong> for clearance review.
        </div>
        <button 
          onClick={logout}
          className="mt-8 px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-800 active:scale-95"
        >
          Sign Out of Account
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-900 flex flex-col">
      
      {/* 2. FlowTalk Executive Control Hub Header Bar */}
      <div className="h-11 bg-slate-950 text-white px-4 flex items-center justify-between border-b border-indigo-950 select-none shrink-0 font-sans shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-extrabold text-[10px] text-white">
            F
          </div>
          <span className="text-[11px] font-black tracking-wide text-white uppercase hidden sm:inline mr-2">FlowTalk Professional</span>
          
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button 
              onClick={() => setCurrentTab('product')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                currentTab === 'product' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Home & Playground
            </button>
            <button 
              onClick={() => setCurrentTab('install')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
                currentTab === 'install' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download size={10} className="shrink-0" />
              <span>Download & Install</span>
            </button>
            <button 
              onClick={() => {
                if (currentUser) {
                  setCurrentTab('dashboard');
                } else {
                  setCurrentTab('login');
                }
              }}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                currentTab === 'dashboard' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>My Workspace</span>
            </button>
          </div>
        </div>

        {currentUser ? (
          <div className="flex items-center space-x-5 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800/80 px-3 py-1 rounded-full text-[10px] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${userProfile?.plan === 'Enterprise' ? 'bg-cyan-400 animate-pulse' : userProfile?.plan === 'Pro' ? 'bg-purple-400' : 'bg-slate-500'}`} />
              <span className="uppercase text-slate-250 font-black">{userProfile?.plan || 'Free'} Plan</span>
            </div>

            <div className="flex items-center space-x-1 font-semibold text-[10px] text-slate-350">
              <Coins size={11} className="text-amber-400" />
              <span>Balance: <strong>{userProfile?.plan === 'Enterprise' ? 'Unlimited' : `${userProfile?.credits || 0} Credits`}</strong></span>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-1 bg-emerald-950/50 text-emerald-450 border border-emerald-900 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                <Shield size={10} />
                <span>Admin Suite</span>
              </div>
            )}

            <button 
              onClick={() => setIsDashboardOpen(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-[#6264A7] hover:bg-[#525497] text-white text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-400/20 shadow-md shadow-indigo-950 transition-all outline-none"
            >
              <Settings size={10} />
              <span>Control Panel</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-sans">
            <button 
              onClick={() => setCurrentTab('login')}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                currentTab === 'login' ? 'bg-purple-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setCurrentTab('register')}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                currentTab === 'register' ? 'bg-purple-600 text-white' : 'bg-gradient-to-r from-purple-650 to-indigo-650 text-white hover:opacity-90'
              }`}
            >
              <span>Register</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <AnimatePresence mode="wait">
          {currentTab === 'product' ? (
            <motion.div
              key="product"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto"
            >
              {/* Deeply integrated high-converting FlowTalk product website with Live Playground */}
              <FlowTalkLanding onOpenControlPanel={() => {
                if (currentUser) {
                  setCurrentTab('dashboard');
                } else {
                  setCurrentTab('login');
                }
              }} />
            </motion.div>
          ) : currentTab === 'install' ? (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <FlowTalkInstall onBackToDemo={() => setCurrentTab('product')} />
            </motion.div>
          ) : currentTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <FlowTalkDashboard 
                onBackToDemo={() => setCurrentTab('product')} 
                onNavigateToInstall={() => setCurrentTab('install')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <FlowTalkAuth 
                initialMode={currentTab === 'register' ? 'register' : 'login'} 
                onSuccess={() => {
                  setCurrentTab('dashboard');
                }}
                onBack={() => setCurrentTab('product')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Supplementary FlowTalk AI Overlay trigger */}
        <FlowTalkOverlay 
          isOpen={isOverlayOpen} 
          onClose={() => setIsOverlayOpen(false)} 
          onInsert={handleInsertFromAI}
          bubblePosition={bubblePosition}
        />

        {/* Floating Trigger Bubble */}
        <FlowTalkBubble 
          onClick={() => setIsOverlayOpen(!isOverlayOpen)} 
          isOpen={isOverlayOpen}
          onPositionChange={setBubblePosition}
        />

        {/* Account and administrative control Portal */}
        <DashboardPortal 
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
        />
      </div>
    </div>
  );
}


