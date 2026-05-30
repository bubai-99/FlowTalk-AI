import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Laptop, 
  Chrome, 
  Terminal, 
  Check, 
  Copy, 
  ArrowRight, 
  ExternalLink,
  Shield, 
  Info, 
  Settings, 
  Video, 
  Layers, 
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface FlowTalkInstallProps {
  onBackToDemo?: () => void;
}

export const FlowTalkInstall: React.FC<FlowTalkInstallProps> = ({ onBackToDemo }) => {
  // Desktop Download simulator states
  const [downloadingOS, setDownloadingOS] = useState<'mac' | 'win' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  // Teams Manifest Customizer inputs
  const [orgName, setOrgName] = useState('My Enterprise Org');
  const [teamsDomain, setTeamsDomain] = useState('company.placeholder.com');
  const [appId, setAppId] = useState('6fcbd2a5-e701-4229-ade6-854c333d1c22');
  const [copiedManifest, setCopiedManifest] = useState(false);

  // Chrome sideload step checklist
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([false, false, false, false]);

  // Terminal commands copy feedback
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Start simulated native desktop client download
  const handleSimulateDownload = (os: 'mac' | 'win') => {
    if (downloadingOS) return;
    setDownloadingOS(os);
    setDownloadProgress(0);
    setDownloadComplete(false);

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloadComplete(true);
          setTimeout(() => {
            setDownloadingOS(null);
            setDownloadProgress(0);
          }, 4000);
          return 100;
        }
        // Random incremental speeds
        const step = Math.floor(Math.random() * 15) + 10;
        return Math.min(prev + step, 100);
      });
    }, 200);
  };

  const toggleChecklistStep = (index: number) => {
    const updated = [...checkedSteps];
    updated[index] = !updated[index];
    setCheckedSteps(updated);
  };

  const handleCopyText = async (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate customized Microsoft Teams app developer manifest on-the-fly
  const generateManifestJSON = () => {
    return `{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  "manifestVersion": "1.11",
  "version": "2.4.0",
  "id": "${appId}",
  "packageName": "com.flowtalk.teams.app",
  "developer": {
    "name": "${orgName}",
    "websiteUrl": "https://${teamsDomain}",
    "privacyUrl": "https://${teamsDomain}/privacy",
    "termsOfUseUrl": "https://${teamsDomain}/terms"
  },
  "name": {
    "short": "FlowTalk AI",
    "full": "FlowTalk AI Communication Advisor"
  },
  "description": {
    "short": "Transforms casual and bilingual communication outputs directly inside Teams channels",
    "full": "Bilingual AI translation helper. Direct input listener transforming raw casual thoughts (Bengali, Hinglish, Spanish dialects) into formal executives."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#6264A7",
  "configurableTabs": [],
  "staticTabs": [
    {
      "entityId": "flowtalkHome",
      "name": "FlowTalk Advisor",
      "contentUrl": "https://${teamsDomain}/embedded-overlay",
      "scopes": ["personal", "group", "team"]
    }
  ],
  "permissions": [
    "identity",
    "messageRead"
  ]
}`;
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans overflow-x-hidden selection:bg-purple-600 selection:text-white pb-20">
      
      {/* HEADER HERO */}
      <section className="relative overflow-hidden pt-16 pb-12 md:pt-20 md:pb-16 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-650/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6264A7] bg-[#6264A7]/10 p-1.5 px-3 rounded-full border border-[#6264A7]/30 inline-block mb-4">
            Deployment Hub
          </span>
          
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Download & Installation Guides
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto font-semibold mt-3 leading-relaxed">
            Choose your communication adapter. Deploy FlowTalk AI native desktop clients, side-load Teams enterprise manifests, or inject overlays on Chrome browsers.
          </p>

          {onBackToDemo && (
            <button 
              onClick={onBackToDemo}
              className="mt-6 text-xs text-indigo-400 hover:text-white font-black uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto hover:underline transition-all outline-none"
            >
              <span>← Return to Product Playground</span>
            </button>
          )}
        </div>
      </section>

      {/* THREE PATHS OF INSTALLATION */}
      <section className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT NAV BAR SUB SEGMENTS */}
        <div className="lg:col-span-4 bg-slate-950 p-6 rounded-3xl border border-slate-850/60 space-y-4">
          <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider font-mono">Deployment Methods</h3>
          
          <div className="space-y-2">
            <a href="#desktop-native" className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-850 rounded-xl transition-all border border-slate-850/40 text-xs font-bold font-sans">
              <Laptop size={14} className="text-purple-400 shrink-0" />
              <div className="text-left">
                <p className="text-white">Desktop Clients</p>
                <p className="text-[10px] text-slate-500 font-medium">Native standalone Windows & macOS</p>
              </div>
            </a>

            <a href="#teams-sideload" className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-850 rounded-xl transition-all border border-slate-850/40 text-xs font-bold font-sans">
              <Layers size={14} className="text-indigo-400 shrink-0" />
              <div className="text-left">
                <p className="text-white">MS Teams Package</p>
                <p className="text-[10px] text-slate-500 font-medium">Enterprise custom manifest builder</p>
              </div>
            </a>

            <a href="#chrome-extension" className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-850 rounded-xl transition-all border border-slate-850/40 text-xs font-bold font-sans">
              <Chrome size={14} className="text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-white">Chrome Sideload</p>
                <p className="text-[10px] text-slate-500 font-medium">Browser rich-text inputs overlay</p>
              </div>
            </a>

            <a href="#cli-setup" className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-850 rounded-xl transition-all border border-slate-850/40 text-xs font-bold font-sans">
              <Terminal size={14} className="text-cyan-404 shrink-0" />
              <div className="text-left">
                <p className="text-white">Terminal CLI Client</p>
                <p className="text-[10px] text-slate-500 font-medium">Fast install script for DevOps</p>
              </div>
            </a>
          </div>

          <div className="p-4 bg-purple-950/20 border border-purple-900/40 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase text-purple-300 flex items-center gap-1">
              <Shield size={12} fill="currentColor" className="opacity-80" /> Bypassed Code Signs?
            </h4>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-semibold">
              Because this represents a localized sandboxed enterprise package, standard user gatekeepers may trigger warnings. Choose to "Bypass SmartScreen" to run binary packages.
            </p>
          </div>
        </div>

        {/* RIGHT FULL CONTENT GUIDES */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* SEC 1: DESKTOP CLIENTS */}
          <div id="desktop-native" className="bg-slate-950 rounded-3xl p-6 md:p-8 border border-slate-850 scroll-mt-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850/60 pb-3">
              <Laptop className="text-purple-400" size={18} />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">1. Native Standalone Desktop Clients</h2>
            </div>

            <p className="text-xs text-slate-450 leading-relaxed font-semibold mb-6">
              Download our modern system-level global overlay. Access local keyboard shortcut sequences (e.g., <kbd className="px-1.5 py-0.5 bg-slate-850 text-white font-mono rounded text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-850 text-white font-mono rounded text-[10px]">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-850 text-white font-mono rounded text-[10px]">F</kbd>) anywhere on your system to immediately compile raw bilingual thoughts inside of native apps!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* macOS Package */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-white">macOS Premium</span>
                    <span className="text-[9px] text-slate-500 font-mono">v2.4.0 (dmg)</span>
                  </div>
                  <ul className="text-[10px] text-slate-450 space-y-1.5 mt-4 font-semibold">
                    <li className="flex items-center gap-1.5">• Support Apple M1, M2, M3 and Intel</li>
                    <li className="flex items-center gap-1.5">• Deep floating menu integrations</li>
                    <li className="flex items-center gap-1.5">• Dark theme matched native style</li>
                  </ul>
                </div>

                <div className="mt-6">
                  {downloadingOS === 'mac' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Downloading DMG...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full transition-all duration-150" style={{ width: `${downloadProgress}%` }} />
                      </div>
                    </div>
                  ) : downloadComplete && downloadingOS === null ? (
                    <div className="py-2 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 rounded-xl text-center text-[11px] font-bold">
                      ✓ Bundle Downloaded!
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSimulateDownload('mac')}
                      className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex justify-center items-center gap-1.5 outline-none"
                    >
                      <Download size={12} />
                      <span>Download Apple Silicon / Intel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Windows Package */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-white">Windows Standalone</span>
                    <span className="text-[9px] text-slate-500 font-mono">v2.4.0 (msi)</span>
                  </div>
                  <ul className="text-[10px] text-slate-450 space-y-1.5 mt-4 font-semibold">
                    <li className="flex items-center gap-1.5">• Windows 10 & 11 x64 systems</li>
                    <li className="flex items-center gap-1.5">• Background system tray process</li>
                    <li className="flex items-center gap-1.5">• Direct Microsoft Store signed sandbox</li>
                  </ul>
                </div>

                <div className="mt-6">
                  {downloadingOS === 'win' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Downloading MSI...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full transition-all duration-150" style={{ width: `${downloadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSimulateDownload('win')}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex justify-center items-center gap-1.5 outline-none border border-slate-700/60"
                    >
                      <Download size={12} />
                      <span>Download Windows Client</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-2xl text-[10px] text-slate-450 mt-5 leading-relaxed font-semibold">
              <span className="font-extrabold text-white">Pro Tip: </span> Simply launch the application block to load automatically inside your login processes. Custom configuration profiles will sync across native and cloud databases natively.
            </div>
          </div>

          {/* SEC 2: MS TEAMS APP CUSTOM PACK BUILDER */}
          <div id="teams-sideload" className="bg-slate-950 rounded-3xl p-6 md:p-8 border border-slate-850 scroll-mt-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850/60 pb-3">
              <Layers className="text-indigo-400" size={18} />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">2. Microsoft Teams Custom Package Builder</h2>
            </div>

            <p className="text-xs text-slate-455 leading-relaxed font-semibold mb-6">
              Sideload FlowTalk directly inside your enterprise Microsoft Teams workspace. Define your target configuration metadata below, and we represent the dynamic structured app manifest payload ready for your Admin Developer upload!
            </p>

            {/* Customizer parameters inputs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">Organization Name</label>
                <input 
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full mt-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl outline-none text-xs text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">Tenant Landing Domain</label>
                <input 
                  type="text"
                  value={teamsDomain}
                  onChange={(e) => setTeamsDomain(e.target.value)}
                  className="w-full mt-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl outline-none text-xs text-slate-200 font-bold"
                />
              </div>
            </div>

            {/* Simulated Live Manifest XML/JSON code viewer */}
            <div className="relative group">
              <span className="absolute top-3 right-3 text-[9px] text-indigo-400 font-bold font-mono tracking-wider bg-indigo-950/60 p-1 px-2.5 rounded-lg border border-indigo-900/40">
                manifest.json
              </span>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono text-[9px] text-slate-350 max-h-60 overflow-y-auto leading-normal whitespace-pre">
                {generateManifestJSON()}
              </pre>

              <div className="absolute bottom-3 right-3 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100">
                <button 
                  onClick={() => handleCopyText(generateManifestJSON(), setCopiedManifest)}
                  className="bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg p-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-indigo-400 hover:scale-105 active:scale-95 transition-all outline-none"
                >
                  {copiedManifest ? (
                    <>
                      <Check size={11} /> <span>Copied Manifest!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> <span>Copy Manifest JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sideload Instruction steps */}
            <div className="space-y-3.5 mt-8 border-t border-slate-850/60 pt-6">
              <h4 className="text-xs font-black text-indigo-300">How to Sideload Manifest into Microsoft Teams:</h4>
              <ol className="text-xs text-slate-400 space-y-3 font-semibold text-left">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">1</span>
                  <span>Copy our generated <code className="text-white font-mono bg-slate-900 font-normal p-0.5 px-1.5 border border-slate-800 rounded">manifest.json</code> from above and save it inside a compressed directory named <strong className="text-white">FlowTalkManifest.zip</strong> next to app icons.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">2</span>
                  <span>Navigate to your organization's <strong className="text-indigo-400">Microsoft Teams Admin Center</strong> (or developer portal at dev.teams.microsoft.com).</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">3</span>
                  <span>Select <strong className="text-white">Teams Apps &gt; Manage Apps</strong>, then click <strong className="text-white">“Upload Custom App”</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">4</span>
                  <span>Confirm sideload authorization. FlowTalk advisor will immediately appear as a companion panel option on chat feeds for members!</span>
                </li>
              </ol>
            </div>
          </div>

          {/* SEC 3: CHROME EXTENSION SECTION */}
          <div id="chrome-extension" className="bg-slate-950 rounded-3xl p-6 md:p-8 border border-slate-850 scroll-mt-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850/60 pb-3">
              <Chrome className="text-emerald-400" size={18} />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">3. Google Chrome Extensions (Sideload)</h2>
            </div>

            <p className="text-xs text-slate-455 leading-relaxed font-semibold mb-6">
              Because of our sandbox preview constraints, you can sideload the FlowTalk browser workspace helper using Developer Sideload tools to instantly inject floating triggers inside online web sheets.
            </p>

            {/* Checklist guide */}
            <div className="space-y-3 bg-slate-900 p-5 rounded-2xl border border-slate-800/80">
              <h4 className="text-[11px] uppercase font-mono text-emerald-400 font-black tracking-wider">Browser extension checklist checklist:</h4>
              
              <div className="space-y-2">
                {[
                  'Enable "Developer Mode" toggle on chrome://extensions page.',
                  'Unzip downloaded FlowTalk crx sandbox directory.',
                  'Click "Load Unpacked" button inside the extensions panel page.',
                  'Confirm workspace overlay trigger displays on rich text editors.'
                ].map((step, idx) => (
                  <button 
                    key={idx}
                    onClick={() => toggleChecklistStep(idx)}
                    className="w-full text-left p-3 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-850 text-xs font-semibold text-slate-350 hover:text-white transition-all flex items-center gap-3 outline-none"
                  >
                    <span className={`w-4 h-4 border rounded-md flex items-center justify-center ${checkedSteps[idx] ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900 text-transparent'}`}>
                      ✓
                    </span>
                    <span className={checkedSteps[idx] ? 'line-through text-slate-500 font-medium' : ''}>{step}</span>
                  </button>
                ))}
              </div>

              {checkedSteps.every(Boolean) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-emerald-950/30 border border-emerald-900 text-emerald-400 text-[11px] rounded-xl font-bold flex items-center justify-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>Your local web extension settings look fully optimized!</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* SEC 4: CLI COMMAND SCRIPT */}
          <div id="cli-setup" className="bg-slate-950 rounded-3xl p-6 md:p-8 border border-slate-850 scroll-mt-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850/60 pb-3">
              <Terminal className="text-cyan-404" size={18} />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">4. Fast Terminal Shell Script Installation</h2>
            </div>

            <p className="text-xs text-slate-455 leading-relaxed font-semibold mb-6">
              For command-line power users or DevOps system builders, install the lightweight globally active FlowTalk command line daemon in seconds.
            </p>

            <div className="relative">
              <span className="absolute top-3 right-3 text-[9px] text-cyan-400 font-bold font-mono tracking-wider bg-cyan-950/60 p-1 px-2.5 rounded-lg border border-cyan-900/40">
                sh / curl script
              </span>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono text-[10px] text-slate-350 overflow-x-auto select-text">
                {`curl -fsSL https://ais-pre-jwi62uh5cecmsd3gz7cpq7-168680539223.asia-east1.run.app/api/install.sh | sh`}
              </pre>

              <button 
                onClick={() => handleCopyText(`curl -fsSL https://ais-pre-jwi62uh5cecmsd3gz7cpq7-168680539223.asia-east1.run.app/api/install.sh | sh`, setCopiedCurl)}
                className="absolute bottom-3 right-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:text-white rounded-lg p-2 px-3 text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all outline-none"
              >
                {copiedCurl ? (
                  <>
                    <Check size={11} className="text-emerald-450" /> <span>Copied Commands!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} /> <span>Copy CLI script</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
};
