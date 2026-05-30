import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, UserProfile, TransactionRecord } from '../contexts/UserContext';
import { 
  User as UserIcon, 
  Settings, 
  Key, 
  ShieldCheck, 
  Coins, 
  TrendingUp, 
  Clock, 
  Check, 
  Copy, 
  Database, 
  Lock, 
  Laptop, 
  Terminal, 
  Sparkles,
  RefreshCw,
  LogOut,
  Mail,
  UserCheck,
  Shield,
  LayoutDashboard,
  Eye,
  EyeOff,
  Code,
  DollarSign,
  Upload,
  Camera,
  Trash2,
  CreditCard
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface FlowTalkDashboardProps {
  onBackToDemo?: () => void;
  onNavigateToInstall?: () => void;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_DIM = 300;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file content.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed reading avatar binary file.'));
    reader.readAsDataURL(file);
  });
};

export const FlowTalkDashboard: React.FC<FlowTalkDashboardProps> = ({ 
  onBackToDemo,
  onNavigateToInstall 
}) => {
  const { 
    currentUser, 
    userProfile, 
    loading, 
    isAdmin, 
    updateCustomApiKey, 
    updateDisplayName, 
    updateProfilePicture,
    purchasePlan,
    transactions,
    logout,
    allUsers,
    allTransactions,
    refreshAdminData
  } = useUser();

  // Selected tab inside the workspace dashboard
  const [activePane, setActivePane] = useState<'profile' | 'plans' | 'developer' | 'billing' | 'admin'>('profile');

  // Checkout and flow billing state elements
  const [showCheckout, setShowCheckout] = useState<{ plan: 'Pro' | 'Enterprise', price: number, credits: number } | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Input states
  const [displayNameInput, setDisplayNameInput] = useState(userProfile?.displayName || '');
  const [customKeyInput, setCustomKeyInput] = useState(userProfile?.customGeminiKey || '');
  const [showKey, setShowKey] = useState(false);

  // Drag-and-drop & File Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Unsupported file type. Please upload a standard image resource.', 'error');
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const base64Url = await resizeImage(file);
      await updateProfilePicture(base64Url);
      showToast('Developer profile avatar updated successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Error parsing and saving avatar credentials.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadingAvatar(true);
    try {
      await updateProfilePicture('');
      showToast('Developer profile avatar safely removed.');
    } catch (err: any) {
      showToast('Failed to unlink profile avatar.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Status logs feedback
  const [updateFeedback, setUpdateFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin states
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(500);

  // Sync state inputs when profile finishes loading
  useEffect(() => {
    if (userProfile) {
      setDisplayNameInput(userProfile.displayName || '');
      setCustomKeyInput(userProfile.customGeminiKey || '');
    }
  }, [userProfile]);

  // Synchronize administrative user and transaction data when viewing oversight panel
  useEffect(() => {
    if (activePane === 'admin' && userProfile?.isAdmin) {
      refreshAdminData();
    }
  }, [activePane, userProfile?.isAdmin]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setUpdateFeedback({ text, type });
    setTimeout(() => {
      setUpdateFeedback(null);
    }, 4000);
  };

  const processSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckout) return;
    setLoadingAction(true);
    try {
      // Simulate real processing network delay 1.2s
      await new Promise(resolve => setTimeout(resolve, 1200));
      await purchasePlan(showCheckout.plan, showCheckout.price, showCheckout.credits);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setShowCheckout(null);
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setActivePane('billing'); // Redirect to receipts Ledger!
      }, 2000);
    } catch (err) {
      showToast('Simulated Stripe connection timeout.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9]/g, '');
    if (input.length > 16) input = input.substring(0, 16);
    const groups = input.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : input);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9]/g, '');
    if (input.length > 4) input = input.substring(0, 4);
    if (input.length >= 2) {
      setCardExpiry(input.substring(0, 2) + '/' + input.substring(2));
    } else {
      setCardExpiry(input);
    }
  };

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '');
    setCardCvv(input.substring(0, 3));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) {
      showToast('Profile display name cannot be blank.', 'error');
      return;
    }

    setLoadingAction(true);
    try {
      await updateDisplayName(displayNameInput.trim());
      showToast('Workspace profile settings saved successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update display credentials.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBindKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      await updateCustomApiKey(customKeyInput.trim());
      showToast(
        customKeyInput.trim() 
          ? 'Custom Gemini Key bound successfully! Rewriting will now use your own billing plan.' 
          : 'Custom Gemini Key removed. Switched back to secure platform credits.'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to bind developer custom credentials.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Administrative Quick Management functions
  const handleAdminUpdatePlan = async (targetUser: UserProfile, newPlan: 'Free' | 'Pro' | 'Enterprise') => {
    setLoadingAction(true);
    try {
      if (currentUser?.uid.startsWith('guest_')) {
        const savedMockUsersRaw = localStorage.getItem('flowtalk_guest_mock_users');
        if (savedMockUsersRaw) {
          const usersList: UserProfile[] = JSON.parse(savedMockUsersRaw);
          const idx = usersList.findIndex(u => u.uid === targetUser.uid);
          if (idx > -1) {
            usersList[idx] = { ...usersList[idx], plan: newPlan, updatedAt: new Date().toISOString() };
            if (targetUser.uid === currentUser.uid) {
              const updatedProfile = { ...userProfile!, plan: newPlan, updatedAt: new Date().toISOString() };
              localStorage.setItem('flowtalk_guest_profile', JSON.stringify(updatedProfile));
            }
            localStorage.setItem('flowtalk_guest_mock_users', JSON.stringify(usersList));
          }
        }
        setSelectedUser({ ...targetUser, plan: newPlan });
        await refreshAdminData();
        showToast(`Upgraded subscription license class to ${newPlan} for ${targetUser.displayName}.`);
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        plan: newPlan,
        updatedAt: new Date().toISOString()
      });
      setSelectedUser({ ...targetUser, plan: newPlan });
      await refreshAdminData();
      showToast(`Upgraded subscription license class to ${newPlan} for ${targetUser.displayName}.`);
    } catch (err) {
      showToast('Admin license tier modification failed.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdminAdjustCredits = async (targetUser: UserProfile, amount: number) => {
    setLoadingAction(true);
    try {
      const newBalance = Math.max(0, targetUser.credits + amount);
      if (currentUser?.uid.startsWith('guest_')) {
        const savedMockUsersRaw = localStorage.getItem('flowtalk_guest_mock_users');
        if (savedMockUsersRaw) {
          const usersList: UserProfile[] = JSON.parse(savedMockUsersRaw);
          const idx = usersList.findIndex(u => u.uid === targetUser.uid);
          if (idx > -1) {
            usersList[idx] = { ...usersList[idx], credits: newBalance, updatedAt: new Date().toISOString() };
            if (targetUser.uid === currentUser.uid) {
              const updatedProfile = { ...userProfile!, credits: newBalance, updatedAt: new Date().toISOString() };
              localStorage.setItem('flowtalk_guest_profile', JSON.stringify(updatedProfile));
            }
            localStorage.setItem('flowtalk_guest_mock_users', JSON.stringify(usersList));
          }
        }
        setSelectedUser({ ...targetUser, credits: newBalance });
        await refreshAdminData();
        showToast(`Injected balance adjustment successfully for ${targetUser.displayName}.`);
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        credits: newBalance,
        updatedAt: new Date().toISOString()
      });
      setSelectedUser({ ...targetUser, credits: newBalance });
      await refreshAdminData();
      showToast(`Injected balance adjustment successfully for ${targetUser.displayName}.`);
    } catch (err) {
      showToast('Administrative ledger update errored out.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdminToggleBlock = async (targetUser: UserProfile) => {
    setLoadingAction(true);
    try {
      const newBlockedState = !targetUser.blocked;
      if (currentUser?.uid.startsWith('guest_')) {
        const savedMockUsersRaw = localStorage.getItem('flowtalk_guest_mock_users');
        if (savedMockUsersRaw) {
          const usersList: UserProfile[] = JSON.parse(savedMockUsersRaw);
          const idx = usersList.findIndex(u => u.uid === targetUser.uid);
          if (idx > -1) {
            usersList[idx] = { ...usersList[idx], blocked: newBlockedState, updatedAt: new Date().toISOString() };
            if (targetUser.uid === currentUser.uid) {
              const updatedProfile = { ...userProfile!, blocked: newBlockedState, updatedAt: new Date().toISOString() };
              localStorage.setItem('flowtalk_guest_profile', JSON.stringify(updatedProfile));
            }
            localStorage.setItem('flowtalk_guest_mock_users', JSON.stringify(usersList));
          }
        }
        setSelectedUser({ ...targetUser, blocked: newBlockedState });
        await refreshAdminData();
        showToast(newBlockedState ? 'User session access strictly suspended.' : 'User session clearance restored!');
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        blocked: newBlockedState,
        updatedAt: new Date().toISOString()
      });
      setSelectedUser({ ...targetUser, blocked: newBlockedState });
      await refreshAdminData();
      showToast(newBlockedState ? 'User session access strictly suspended.' : 'User session clearance restored!');
    } catch (err) {
      showToast('Admin lock state update failed.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Syncing Cloud Workspace State...</p>
      </div>
    );
  }

  const filteredAdminUsers = allUsers.filter(u => 
    u.email.toLowerCase().includes(adminSearch.toLowerCase()) || 
    u.displayName.toLowerCase().includes(adminSearch.toLowerCase())
  );

  const totalAdminRevenue = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans selection:bg-purple-600 selection:text-white pb-24">
      
      {/* MAIN BANNER HEADER */}
      <section className="relative overflow-hidden pt-12 pb-10 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-650/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-950/40 p-1 px-2.5 rounded-md border border-purple-900/40 inline-flex items-center gap-1.5 mb-3.5">
              <LayoutDashboard size={10} /> My Executive Workspace
            </span>
            <h1 className="text-2xl md:text-3.5xl font-black text-white tracking-tight">
              Developer Settings & Profile Control
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-semibold mt-1">
              Bind API licenses, manage display keys, trace pricing credits, or leverage administrator diagnostics dashboards.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {onBackToDemo && (
              <button 
                onClick={onBackToDemo}
                className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 outline-none"
              >
                ← Back to Playground
              </button>
            )}
            <button 
              onClick={onNavigateToInstall}
              className="px-4 py-2 bg-gradient-to-r from-purple-650 to-indigo-650 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 outline-none hover:shadow-indigo-950/50 hover:shadow-lg"
            >
              Get Custom App Adapters
            </button>
          </div>
        </div>
      </section>

      {/* BODY SEGMENTS */}
      <section className="max-w-6xl mx-auto px-6 mt-10">
        
        {/* INTERACTIVE TOAST NOTICE */}
        <AnimatePresence>
          {updateFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl mb-8 text-xs font-semibold flex items-start gap-3 border shadow-md ${
                updateFeedback.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              }`}
            >
              <span className="mt-0.5 font-bold">
                {updateFeedback.type === 'success' ? '✓ SYSTEM CONFIRMED:' : '⚠ SYSTEM WARNING:'}
              </span>
              <span>{updateFeedback.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* METRIC BADGES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          <div className="p-5 bg-slate-950 border border-slate-850 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl" />
            <div className="flex items-center gap-4">
              {userProfile?.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  alt="Profile badge" 
                  className="w-12 h-12 rounded-full ring-2 ring-purple-500/20 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <UserIcon size={16} className="text-slate-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono block">Platform Identity</span>
                <p className="text-white font-extrabold text-sm truncate mt-1 leading-none">{userProfile?.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate mt-1 leading-none">{userProfile?.email}</p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-900 flex justify-between items-baseline">
              <span className="text-[10px] text-slate-450 font-bold uppercase">Member Since</span>
              <span className="font-mono text-[9px] text-slate-400 font-semibold">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Active Session'}
              </span>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-850 rounded-3xl relative overflow-hidden flex flex-col justify-between animate-pulse">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">License Status</span>
              <p className="text-indigo-400 font-extrabold text-lg mt-2 leading-none uppercase tracking-wide">
                {userProfile?.plan || 'Free'} Tier
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                {userProfile?.plan === 'Enterprise' ? 'Unlimited lifetime overrides' : 'Regular playground privileges'}
              </p>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-900 flex justify-between items-baseline">
              <span className="text-[10px] text-slate-450 font-bold uppercase">Auth Sync</span>
              <span className="text-[9px] text-emerald-400 font-black uppercase flex items-center gap-0.5">
                <ShieldCheck size={10} /> Firebase Secured
              </span>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-850 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Token Balances</span>
              <div className="flex items-center gap-1.5 mt-2">
                <Coins size={16} className="text-amber-400" />
                <p className="text-white font-black text-xl leading-none">
                  {userProfile?.plan === 'Enterprise' ? '∞' : (userProfile?.credits ?? 0).toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Platform units allocated dynamically</p>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-900 flex justify-between items-baseline">
              <span className="text-[10px] text-slate-450 font-bold uppercase">Dynamic Source</span>
              <span className="text-[10px] text-slate-400 font-bold">
                {userProfile?.customGeminiKey ? 'Custom Developer Billing' : 'Cloud Pool'}
              </span>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-850 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Endpoint Keys Bound</span>
              <p className="text-white font-extrabold text-sm truncate mt-2 leading-none font-mono">
                {userProfile?.customGeminiKey ? '••••••••••••••••' : 'None Activated'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1.5 font-semibold">
                {userProfile?.customGeminiKey ? 'Direct Google Cloud sync' : 'Using free trial tier proxy keys'}
              </p>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-900 flex justify-between items-baseline">
              <span className="text-[10px] text-slate-450 font-bold uppercase">Encryption</span>
              <span className="text-[9px] text-[#6264A7] font-black uppercase font-mono">SHA-256 AES</span>
            </div>
          </div>

        </div>

        {/* WORKSPACE DETAILED LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* NAVIGATION SIDEBAR */}
          <div className="lg:col-span-3 bg-slate-955 p-5 rounded-3xl border border-slate-850/60 space-y-4">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-mono block">Control Panels</span>
            
            <div className="space-y-1.5">
              <button 
                onClick={() => setActivePane('profile')}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-sans rounded-xl transition-all border outline-none text-left ${
                  activePane === 'profile' 
                    ? 'bg-slate-900 text-white border-slate-800' 
                    : 'bg-transparent text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <UserIcon size={14} className="text-purple-400 shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">Developer Profile</p>
                  <p className="text-[9px] text-slate-550 font-medium">Primary display configurations</p>
                </div>
              </button>

              <button 
                onClick={() => setActivePane('plans')}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-sans rounded-xl transition-all border outline-none text-left ${
                  activePane === 'plans' 
                    ? 'bg-slate-900 text-white border-slate-800' 
                    : 'bg-transparent text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Sparkles size={14} className="text-pink-400 shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">Upgrade & Licenses</p>
                  <p className="text-[9px] text-slate-550 font-medium font-bold text-pink-400">Unlock executive draft tier</p>
                </div>
              </button>

              <button 
                onClick={() => setActivePane('developer')}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-sans rounded-xl transition-all border outline-none text-left ${
                  activePane === 'developer' 
                    ? 'bg-slate-900 text-white border-slate-800' 
                    : 'bg-transparent text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Key size={14} className="text-[#6264A7] shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">Secure API Keys</p>
                  <p className="text-[9px] text-slate-550 font-medium">Bypass credit caps securely</p>
                </div>
              </button>

              <button 
                onClick={() => setActivePane('billing')}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-sans rounded-xl transition-all border outline-none text-left ${
                  activePane === 'billing' 
                    ? 'bg-slate-900 text-white border-slate-800' 
                    : 'bg-transparent text-slate-400 hover:text-white border-transparent'
                }`}
              >
                <Clock size={14} className="text-amber-400 shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">Billing Ledger</p>
                  <p className="text-[9px] text-slate-550 font-medium">Historical receipts ledger</p>
                </div>
              </button>

              {isAdmin && (
                <button 
                  onClick={() => setActivePane('admin')}
                  className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-sans rounded-xl transition-all border outline-none text-left border-t border-slate-900/60 mt-4 pt-4 ${
                    activePane === 'admin' 
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' 
                      : 'bg-transparent text-emerald-450 hover:text-emerald-300 border-transparent'
                  }`}
                >
                  <Shield size={14} className="text-emerald-500 shrink-0 animate-spin-slow" />
                  <div>
                    <p className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-400">System Oversight</p>
                    <p className="text-[9px] text-slate-550 font-medium">Admin database controller</p>
                  </div>
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-[10px] text-slate-450 leading-relaxed font-semibold">
              <span className="font-bold text-white">Security Sync notice:</span> Profile settings and Google API endpoint authorizations update securely on Firestore. Disconnecting the active session automatically revokes runtime access keys.
            </div>

            <button 
              onClick={logout}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <LogOut size={11} />
              <span>Disconnect Session</span>
            </button>
          </div>

          {/* ACTIVE CONTENT WORKSPACE */}
          <div className="lg:col-span-9 bg-slate-950 rounded-3xl p-6 md:p-8 border border-slate-850">
            
            {/* PANE 1: DEVELOPER PROFILE */}
            {activePane === 'profile' && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <UserIcon size={16} className="text-purple-400" /> Primary Developer Profile
                  </h3>
                  <p className="text-xs text-slate-450 font-medium mt-1">Configure your personal name or avatar tokens for professional system reports.</p>
                </div>

                {/* PROFILE PICTURE DRAG-AND-DROP UPLOADER */}
                <div className="bg-slate-900 border border-slate-850/80 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                  {/* Avatar Preview circle */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-800 hover:border-purple-500 overflow-hidden bg-slate-950 flex items-center justify-center transition-all bg-cover bg-center"
                      style={userProfile?.profilePicture ? { backgroundImage: `url(${userProfile.profilePicture})` } : {}}>
                      {!userProfile?.profilePicture && (
                        <div className="text-center p-2">
                          <UserIcon size={24} className="text-slate-600 mx-auto" />
                          <span className="text-[9px] font-bold text-slate-500 font-mono mt-1 block">NO AVATAR</span>
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                          <RefreshCw size={18} className="text-purple-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    {userProfile?.profilePicture && (
                      <button 
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        type="button" 
                        title="Remove profile image"
                        className="absolute -top-1 -right-1 p-1 bg-rose-950/90 hover:bg-rose-900 border border-rose-900/60 text-rose-400 hover:text-white rounded-full transition-all active:scale-90 shadow"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  {/* Drag-and-Drop Area */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      dragActive 
                        ? 'border-purple-500 bg-purple-950/15' 
                        : 'border-slate-800 hover:border-slate-755 bg-slate-950/40 hover:bg-slate-950/60'
                    }`}
                    onClick={() => document.getElementById('pfp-upload')?.click()}
                  >
                    <input 
                      type="file" 
                      id="pfp-upload" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                      disabled={uploadingAvatar}
                    />
                    <Upload size={18} className={`mb-2 ${dragActive ? 'text-purple-400' : 'text-slate-555'}`} />
                    <p className="text-[11px] font-extrabold text-slate-200">
                      {dragActive ? 'Drop your avatar badge here' : 'Drag & drop profile badge or Click to browse'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Supports PNG, JPG, GIF. Max auto-resized to 300px square badge representation.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Authorized Email (Read-only)</label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                        <input 
                          type="email" 
                          value={userProfile?.email || ''} 
                          disabled 
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/40 border border-slate-850 text-slate-500 rounded-xl text-xs font-mono font-medium outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider font-mono">Display Name</label>
                      <div className="relative mt-1.5">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                        <input 
                          type="text" 
                          value={displayNameInput} 
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder="Your Name"
                          disabled={loadingAction}
                          required
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 text-slate-100 rounded-xl text-xs text-slate-200 font-bold placeholder:text-slate-600 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-900">
                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="px-5 py-2.5 bg-purple-650 hover:bg-purple-550 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 outline-none active:scale-95 disabled:opacity-50"
                    >
                      {loadingAction ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Save Display Profiles</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850/60 space-y-3 mt-6">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
                    <Sparkles size={12} className="text-indigo-400" /> FlowTalk Credentials Matrix
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                    Each account created on the FlowTalk application immediately receives <strong>500 free trial processing tokens</strong>. If you require higher throughput or want to test custom model pipelines, you can easily upgrade your plan inside our Control Panel or customize your self-hosted keys on the APIs tab.
                  </p>
                </div>
              </div>
            )}

            {/* PANE: UPGRADE & LICENSES */}
            {activePane === 'plans' && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Sparkles size={16} className="text-pink-400" /> Upgrade Licensing & Plans
                  </h3>
                  <p className="text-xs text-slate-450 font-medium mt-1">Select a licensing plan to extend premium processing credits, unlock high-end draft generation styles, and elevate your platform throughput.</p>
                </div>

                {/* DUAL OPTION EDUCATIONAL ROADMAP */}
                <div className="bg-gradient-to-r from-purple-950/20 via-slate-900 to-indigo-950/20 p-5 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-850/80 pb-2">
                    <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg">
                      <Sparkles size={14} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">Understanding Your Options: Subscriptions vs. Custom Developer API Keys</h4>
                      <p className="text-[10px] text-slate-500 font-bold">Pick the approach that matches your workflow requirements</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Option 1: Managed Subscription */}
                    <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-900">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-950/80 text-purple-400 rounded border border-purple-900/30 font-mono">Option A: Secure Managed Subscription</span>
                      <h5 className="font-bold text-slate-200 mt-1">Best for Plug & Play Users (Who want simplicity)</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        Don't want to create Google Cloud/AI Studio accounts or manage API billing? A subscription is 100% managed.
                      </p>
                      <ul className="space-y-1.5 text-[10.5px] text-slate-450 font-semibold pt-1">
                        <li className="flex items-start gap-1"><Check size={11} className="text-emerald-400 mt-0.5 shrink-0" /> <span>No API keys or code setup required. Works instantly.</span></li>
                        <li className="flex items-start gap-1"><Check size={11} className="text-emerald-400 mt-0.5 shrink-0" /> <span>FlowTalk's high-speed cloud cluster routes all models.</span></li>
                        <li className="flex items-start gap-1"><Check size={11} className="text-emerald-400 mt-0.5 shrink-0" /> <span>Includes advanced prompt adjustments and pre-bundled credits.</span></li>
                      </ul>
                    </div>

                    {/* Option 2: Custom Key Integration */}
                    <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-900">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-950/80 text-indigo-400 rounded border border-indigo-900/30 font-mono">Option B: Bring Your Own API Key</span>
                      <h5 className="font-bold text-slate-200 mt-1">Best for Software Developers & Power Users</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        Input your personal custom Gemini API key. All token requests route directly to your key!
                      </p>
                      <ul className="space-y-1.5 text-[10.5px] text-slate-450 font-semibold pt-1">
                        <li className="flex items-start gap-1 text-indigo-300"><Check size={11} className="text-indigo-400 mt-0.5 shrink-0" /> <span><strong>Bypasses credit tracks completely</strong> — rewrites are 100% free of limit caps on our UI.</span></li>
                        <li className="flex items-start gap-1"><Check size={11} className="text-indigo-400 mt-0.5 shrink-0" /> <span>Charges apply directly to your personal Google Cloud/AI Studio billing.</span></li>
                        <li className="flex items-start gap-1"><Check size={11} className="text-indigo-400 mt-0.5 shrink-0" /> <span>Perfect for continuous automation, scripts, and terminal client tools.</span></li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 flex items-center gap-3">
                    <span className="text-lg">💡</span>
                    <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                      <strong>Dual Synergy:</strong> If you buy a plan AND bind your personal key, the key takes priority for chat/rewriting processes so you never consume your plan credits, while your premium plan status is preserved to unlock all advanced layout features and VIP system speed.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Free plan */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between relative">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded uppercase">Starter</span>
                        {(!userProfile || userProfile.plan === 'Free') && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white mt-3">Free Tier</h4>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Try standard Smart Rewriting on Microsoft Teams mockup.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-white">$0</span>
                        <span className="text-xs text-slate-500 ml-1">/ forever</span>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-2 text-[11px] text-slate-350 font-medium">
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>500 free credits included</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>Standard Casual tone rewrites</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>Real-time Language detection</span></div>
                      </div>
                    </div>

                    <button 
                      disabled
                      className="w-full mt-6 py-2 bg-slate-950 rounded-xl text-slate-500 text-xs font-bold border border-slate-900"
                    >
                      {userProfile?.plan === 'Free' ? 'Current Authorized' : 'Free Tier'}
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div className="bg-gradient-to-b from-purple-950/20 to-slate-900/60 p-5 rounded-2xl border-2 border-purple-500/30 flex flex-col justify-between relative shadow-lg shadow-purple-500/[0.02]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                      Best Value
                    </div>
                    <div>
                      <div className="flex justify-between items-start mt-1">
                        <span className="text-[10px] font-black text-purple-400 bg-purple-950/50 border border-purple-900/30 px-2.5 py-0.5 rounded uppercase font-bold">Professional</span>
                        {userProfile?.plan === 'Pro' && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white mt-3">Pro Business</h4>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Perfect for dynamic writers, remote workers, and content controllers.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-white">$12</span>
                        <span className="text-xs text-slate-500 ml-1">/ one-time</span>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-2 text-[11px] text-slate-355 font-medium">
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>+5,000 Premium API credits</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>Unlocks "Professional" smart tones</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-pink-500 shrink-0" /> <span>Prioritized model response speeds</span></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowCheckout({ plan: 'Pro', price: 12, credits: 5000 })}
                      className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 active:scale-95 transition-all outline-none"
                    >
                      {userProfile?.plan === 'Pro' ? 'Buy credits again ($12)' : 'Upgrade to Pro ($12)'}
                    </button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between relative">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded uppercase font-bold">Unlimited</span>
                        {userProfile?.plan === 'Enterprise' && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white mt-3">Executive Elite</h4>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Designed for high output professionals and custom development models.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-white">$39</span>
                        <span className="text-xs text-slate-500 ml-1">/ life-license</span>
                      </div>

                      <div className="border-t border-slate-850 pt-4 space-y-2 text-[11px] text-slate-350 font-medium">
                        <div className="flex items-center space-x-1.5"><Check size={12} className="text-pink-500 shrink-0" /> <span><strong>Unlimited lifetime credits</strong></span></div>
                        <div className="flex items-center space-x-1.5"><Check size={12} className="text-pink-500 shrink-0" /> <span>Unlocks "Executive Elite" tone sets</span></div>
                        <div className="flex items-center space-x-1.5"><Check size={12} className="text-pink-500 shrink-0" /> <span>Custom API Key deployment endpoints</span></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowCheckout({ plan: 'Enterprise', price: 39, credits: 100000 })}
                      className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-755 text-white border border-slate-700/40 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all outline-none"
                    >
                      {userProfile?.plan === 'Enterprise' ? 'Active Lifetime License' : 'Upgrade to Enterprise ($39)'}
                    </button>
                  </div>
                </div>

                {/* Simulated Stripe Checkout Dialogue Overlay inside Pane */}
                <AnimatePresence>
                  {showCheckout && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 30 }}
                        className="bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-850 shadow-2xl space-y-6"
                      >
                        <div className="flex justify-between items-center bg-slate-900">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">Secure Stripe Checkout</h4>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowCheckout(null)}
                            className="text-[10px] bg-slate-850 hover:bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-extrabold transition-all"
                          >
                            Cancel
                          </button>
                        </div>

                        {checkoutSuccess ? (
                          <div className="text-center py-8 space-y-3">
                            <div className="w-16 h-16 bg-emerald-950 text-emerald-400 border border-emerald-900/40 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                              ✓
                            </div>
                            <h5 className="font-black text-white text-sm uppercase tracking-wider font-mono">Payment Authorized</h5>
                            <p className="text-xs text-slate-440 font-semibold">License upgraded. Credits matched on secure servers successfully!</p>
                          </div>
                        ) : (
                          <form onSubmit={processSimulatedPayment} className="space-y-4">
                            {/* Card visual rendering */}
                            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-4 rounded-xl text-white font-mono shadow-inner border border-slate-850/60 relative overflow-hidden flex flex-col justify-between h-36">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl" />
                              
                              <div className="flex justify-between items-start">
                                <span className="font-black text-purple-400 tracking-wider text-[9px] uppercase font-mono">Simulated Stripe Terminal</span>
                                <CreditCard size={16} className="text-slate-500" />
                              </div>

                              <div className="text-sm tracking-widest text-slate-200 my-1 font-mono">
                                {cardNumber || '•••• •••• •••• ••••'}
                              </div>

                              <div className="flex justify-between text-[9px] text-slate-500 uppercase">
                                <div>
                                  <p className="text-[7px] text-slate-600">Cardholder</p>
                                  <p className="truncate w-24 font-bold text-slate-355">{cardName || 'YOUR FULL NAME'}</p>
                                </div>
                                <div className="flex space-x-4">
                                  <div>
                                    <p className="text-[7px] text-slate-600 font-semibold">Expires</p>
                                    <p className="font-bold text-slate-355">{cardExpiry || 'MM/YY'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[7px] text-slate-600 font-semibold font-mono">CVV</p>
                                    <p className="font-bold text-slate-355">{cardCvv || '•••'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-purple-950/25 border border-purple-900/30 rounded-xl text-xs text-purple-300 flex justify-between items-center font-bold">
                              <span>Licensing Tier: {showCheckout.plan}</span>
                              <span className="text-white">${showCheckout.price}.00</span>
                            </div>

                            {/* Card inputs */}
                            <div className="space-y-3">
                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Cardholder Name</label>
                                <input 
                                  required
                                  type="text"
                                  placeholder="John Doe"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-100 font-bold placeholder:text-slate-700 font-sans"
                                />
                              </div>

                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Card Number</label>
                                <input 
                                  required
                                  type="text"
                                  placeholder="4111 2222 3333 4444"
                                  value={cardNumber}
                                  onChange={handleCardNumberChange}
                                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-100 font-bold font-mono placeholder:text-slate-700"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Expiration</label>
                                  <input 
                                    required
                                    type="text"
                                    placeholder="MM/YY"
                                    value={cardExpiry}
                                    onChange={handleCardExpiryChange}
                                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-100 font-bold font-mono placeholder:text-slate-700"
                                  />
                                </div>

                                <div>
                                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">CVC / CVV</label>
                                  <input 
                                    required
                                    type="password"
                                    placeholder="•••"
                                    value={cardCvv}
                                    onChange={handleCardCvvChange}
                                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-100 font-bold font-mono placeholder:text-slate-700"
                                  />
                                </div>
                              </div>
                            </div>

                            <button 
                              type="submit"
                              disabled={loadingAction}
                              className="w-full mt-2.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-purple-900/30 active:scale-95 hover:shadow-lg transition-all outline-none flex items-center justify-center gap-1.5"
                            >
                              {loadingAction ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CreditCard size={12} />
                                  <span>Process Simulated Stripe Payment</span>
                                </>
                              )}
                            </button>
                          </form>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PANE 2: DEVELOPER API KEYS */}
            {activePane === 'developer' && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Key size={16} className="text-[#6264A7]" /> Google Cloud Developer Integrations
                  </h3>
                  <p className="text-xs text-slate-450 font-medium mt-1">Bind your custom Gemini API key to establish a direct connection to Google Cloud. Once configured, all rewriting operations will run directly off your Google Developer bill, preserving your FlowTalk processing credits completely!</p>
                </div>

                {/* HELPFUL BENEFIT INFO-BANNER */}
                <div className="p-4 bg-indigo-950/25 border border-indigo-900/40 rounded-2xl space-y-2">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded border border-indigo-900/30 font-mono">🔑 Active Developer Developer Privileges</span>
                  <p className="text-xs font-bold text-slate-200 mt-1">Why configure your custom Gemini API Key?</p>
                  <ul className="space-y-1 text-[11px] text-slate-350 font-semibold list-disc pl-4 leading-relaxed">
                    <li><strong>Complete Credit Exemption:</strong> Bypasses limits entirely. As long as your custom key is bound, running translation prompts will lock <strong>0 credits</strong> from your FlowTalk trial or subscription!</li>
                    <li><strong>Direct Billing:</strong> Charges are settled directly with Google Cloud AI Studio (which includes standard free tiers and low direct cost of service).</li>
                    <li><strong>Continuous Workflows:</strong> Eliminates downtime. If you run out of managed credits, you can toggle your key to resume high-throughput operations instantly.</li>
                  </ul>
                </div>

                <form onSubmit={handleBindKey} className="space-y-5">
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider font-mono">Gemini Key API configuration</label>
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-0.5 outline-none"
                      >
                        Grab free key on AI Studio ↗
                      </a>
                    </div>

                    <div className="relative">
                      <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                      <input 
                        type={showKey ? "text" : "password"} 
                        value={customKeyInput} 
                        onChange={(e) => setCustomKeyInput(e.target.value)}
                        placeholder="AIzaSy... (Leave empty to revert to secure cloud allocations)"
                        disabled={loadingAction}
                        className="w-full pl-9 pr-20 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-455 text-slate-100 rounded-xl text-xs font-mono placeholder:text-slate-650 outline-none transition-all"
                      />

                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="p-1 px-1.5 bg-slate-950 text-slate-400 hover:text-white rounded text-[10px] transition-all outline-none"
                        >
                          {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                        {customKeyInput.trim() && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(customKeyInput.trim())}
                            className="p-1 px-1.5 bg-slate-950 text-slate-450 hover:text-white rounded text-[10px] transition-all outline-none flex items-center gap-0.5"
                          >
                            {copiedKey ? 'Copied' : <Copy size={11} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500 font-semibold max-w-md leading-normal">
                      🛡 Your custom key is stored safely directly in Firestore inside security rules.
                    </span>
                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="px-5 py-2.5 bg-[#6264A7] hover:bg-[#525497] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 outline-none active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {loadingAction ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Bind Custom Key</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="border-t border-slate-900 pt-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Integration Quick Guide:</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Code size={13} className="text-indigo-400" />
                        <span className="text-[11px] font-black text-slate-200">Terminal CLI Client</span>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        Once custom developer keys are bound, terminal tasks can call translation engines or daemon overrides without drawing down platform credits.
                      </p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Laptop size={13} className="text-purple-400" />
                        <span className="text-[11px] font-black text-slate-200">Browser Sideload Ext</span>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                        Keep your system active. Sideload Chrome triggers to easily access system prompt configurations globally inside any input box.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANE 3: BILLING LEDGER */}
            {activePane === 'billing' && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" /> Billing History & Purchase Logs
                  </h3>
                  <p className="text-xs text-slate-450 font-medium mt-1">Review active transaction audits. Sync credits or retrieve secure print receipts securely.</p>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-850 border-dashed p-8 space-y-3 md:py-16">
                    <Coins size={28} className="text-slate-650 mx-auto" />
                    <p className="text-xs text-slate-450 font-semibold">No transactions detected under your active account.</p>
                    <p className="text-[11px] text-slate-500 font-semibold max-w-sm mx-auto">Upgrades can be performed dynamically on the primary playground control panel layout.</p>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-850 font-bold text-slate-400">
                          <th className="p-3">Reference ID</th>
                          <th className="p-3">Plan Class</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Credits Dispensed</th>
                          <th className="p-3">Sync Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold text-slate-300">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-900/60 hover:bg-slate-900/40 transition-all">
                            <td className="p-3 font-mono text-[10px] text-slate-450 uppercase">{tx.id}</td>
                            <td className="p-3">
                              <span className="bg-purple-950/60 text-purple-300 border border-purple-900/40 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                {tx.plan}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-white">${tx.amount}.00</td>
                            <td className="p-3">+{tx.creditsAdded.toLocaleString()}</td>
                            <td className="p-3 text-[10px] text-slate-500 font-medium">
                              {new Date(tx.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PANE 4: ADMIN OVERSIGHT PORTAL */}
            {activePane === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase text-emerald-450 tracking-widest flex items-center gap-2">
                      <Shield size={16} fill="currentColor" className="text-emerald-500 animate-pulse" /> System Security Oversight (Admin)
                    </h3>
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 font-mono font-bold p-1 px-2.5 rounded border border-emerald-900">
                      Clearance: Tier 1
                    </span>
                  </div>
                  <p className="text-xs text-slate-450 font-medium mt-1">Supervise multi-tenant directories, enforce suspensions, or update credit balances directly.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">Gross Revenue</span>
                    <h5 className="text-lg font-black text-white mt-1">${totalAdminRevenue}.00</h5>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">Users Registered</span>
                    <h5 className="text-lg font-black text-white mt-1">{allUsers.length} profiles</h5>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">Active Transactions</span>
                    <h5 className="text-lg font-black text-white mt-1">{allTransactions.length} items</h5>
                  </div>
                </div>

                {/* Directory list and manager */}
                <div className="space-y-4 pt-2">
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      value={adminSearch} 
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search accounts by name or email ID..." 
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-600 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* List */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-850 p-4 h-64 overflow-y-auto space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Directory Results</span>
                      
                      {filteredAdminUsers.map(user => (
                        <button
                          key={user.uid}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full p-2.5 rounded-xl border transition-all text-left outline-none ${
                            selectedUser?.uid === user.uid 
                              ? 'bg-slate-950 border-emerald-950 text-white shadow-md' 
                              : 'bg-slate-900 border-slate-850 hover:bg-slate-850 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-baseline">
                            <p className="text-[10px] font-black truncate">{user.displayName || 'Unnamed User'}</p>
                            <span className="text-[9px] font-mono text-slate-500">{user.plan}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{user.email}</p>
                          {user.blocked && (
                            <span className="text-[8px] uppercase bg-rose-950 border border-rose-900 text-rose-450 font-black px-1 mt-1 inline-block rounded">
                              Suspended
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Quick controls pane */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-850 p-4 flex flex-col justify-between min-h-[19rem]">
                      {selectedUser ? (
                        <>
                          <div className="space-y-3.5">
                            <span className="text-[9px] font-black uppercase text-slate-500 block">Oversight Controls</span>
                            <div>
                              <p className="text-[11px] font-black text-white leading-tight">{selectedUser.displayName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{selectedUser.email}</p>
                            </div>

                            {/* Subscription & Plan Upgrades */}
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 font-mono block">Upgrade Licensing & Plans</label>
                              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-850">
                                {(['Free', 'Pro', 'Enterprise'] as const).map((tierKey) => (
                                  <button
                                    key={tierKey}
                                    type="button"
                                    onClick={() => handleAdminUpdatePlan(selectedUser, tierKey)}
                                    disabled={loadingAction}
                                    className={`py-1 text-[9px] font-black rounded transition-all outline-none ${
                                      selectedUser.plan === tierKey 
                                        ? 'bg-[#6264A7] text-white shadow-sm font-extrabold' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                                    }`}
                                  >
                                    {tierKey}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Credit adjusting */}
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 font-mono font-bold">Credit Adjustment: 500 Credits</label>
                              <div className="flex gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleAdminAdjustCredits(selectedUser, 500)}
                                  disabled={loadingAction}
                                  className="flex-1 py-1 bg-emerald-950/60 hover:bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded text-[10px] font-bold"
                                >
                                  +500 Credits
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleAdminAdjustCredits(selectedUser, -500)}
                                  disabled={loadingAction}
                                  className="flex-1 py-1 bg-rose-950/60 hover:bg-rose-950 text-rose-450 border border-rose-900/30 rounded text-[10px] font-bold"
                                >
                                  -500 Credits
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-850 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminToggleBlock(selectedUser)}
                              disabled={loadingAction}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                                selectedUser.blocked 
                                  ? 'bg-emerald-600 hover:bg-emerald-555 text-white' 
                                  : 'bg-rose-900 hover:bg-rose-850 text-white'
                              }`}
                            >
                              {selectedUser.blocked ? 'Restore clearance' : 'Enforce Suspension'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                          <p className="text-xs text-slate-500 font-semibold">Select an account from the security directory lookup list to enforce modifications.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </section>

    </div>
  );
};
