import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Key, 
  Shield, 
  Search, 
  Check, 
  LogOut, 
  ShieldAlert, 
  Plus, 
  Minus, 
  DollarSign, 
  Users, 
  Coins, 
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowRight,
  Database,
  Lock,
  FileText
} from 'lucide-react';
import { useUser, UserProfile, TransactionRecord } from '../contexts/UserContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

interface DashboardPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardPortal: React.FC<DashboardPortalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    userProfile, 
    loading, 
    isAdmin, 
    loginWithGoogle, 
    logout, 
    updateCustomApiKey, 
    updateDisplayName, 
    purchasePlan, 
    transactions,
    allUsers,
    allTransactions,
    refreshAdminData
  } = useUser();

  const [activeTab, setActiveTab ] = useState<'plans' | 'api' | 'ledger' | 'admin'>('plans');
  const [apiKeyInput, setApiKeyInput] = useState(userProfile?.customGeminiKey || '');
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [showCheckout, setShowCheckout] = useState<{ plan: 'Pro' | 'Enterprise', price: number, credits: number } | null>(null);

  // Simulated Checkout Form Fields 
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Admin Controls
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null);
  const [adminCreditAdjustment, setAdminCreditAdjustment] = useState<number>(100);

  // Sync inputs when userProfile loaded
  React.useEffect(() => {
    if (userProfile) {
      setApiKeyInput(userProfile.customGeminiKey || '');
      setNameInput(userProfile.displayName || '');
    }
  }, [userProfile]);

  if (!isOpen) return null;

  // Formatting Card Number Inputs 
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

  const processSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckout || !currentUser) return;
    
    setCheckoutProcessing(true);
    // Simulate high-impact payment gateway sync
    setTimeout(async () => {
      try {
        await purchasePlan(showCheckout.plan, showCheckout.price, showCheckout.credits);
        setCheckoutProcessing(false);
        setCheckoutSuccess(true);
        // Clear forms
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardName('');
        
        // Hide receipt after 2.5 seconds
        setTimeout(() => {
          setCheckoutSuccess(false);
          setShowCheckout(null);
        }, 2200);
      } catch (err) {
        console.error(err);
        setCheckoutProcessing(false);
      }
    }, 1800);
  };

  // Admin adjustments
  const handleAdminUpdatePlan = async (targetUser: UserProfile, newPlan: 'Free' | 'Pro' | 'Enterprise') => {
    try {
      if (currentUser?.uid.startsWith('guest_')) {
        const savedMockUsersRaw = localStorage.getItem('flowtalk_guest_mock_users');
        if (savedMockUsersRaw) {
          const usersList: UserProfile[] = JSON.parse(savedMockUsersRaw);
          const idx = usersList.findIndex(u => u.uid === targetUser.uid);
          if (idx > -1) {
            usersList[idx] = { ...usersList[idx], plan: newPlan, updatedAt: new Date().toISOString() };
            localStorage.setItem('flowtalk_guest_mock_users', JSON.stringify(usersList));
          }
        }
        setSelectedAdminUser({ ...targetUser, plan: newPlan });
        await refreshAdminData();
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        plan: newPlan,
        updatedAt: new Date().toISOString()
      });
      // Update our selection immediately
      setSelectedAdminUser({ ...targetUser, plan: newPlan });
      await refreshAdminData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleAdminToggleBlock = async (targetUser: UserProfile) => {
    try {
      const newBlockedState = !targetUser.blocked;
      if (currentUser?.uid.startsWith('guest_')) {
        const savedMockUsersRaw = localStorage.getItem('flowtalk_guest_mock_users');
        if (savedMockUsersRaw) {
          const usersList: UserProfile[] = JSON.parse(savedMockUsersRaw);
          const idx = usersList.findIndex(u => u.uid === targetUser.uid);
          if (idx > -1) {
            usersList[idx] = { ...usersList[idx], blocked: newBlockedState, updatedAt: new Date().toISOString() };
            // If the user blocks themselves, update userProfile as well for deep observer suspension simulation
            if (targetUser.uid === currentUser.uid) {
              const updatedProfile = { ...userProfile!, blocked: newBlockedState, updatedAt: new Date().toISOString() };
              localStorage.setItem('flowtalk_guest_profile', JSON.stringify(updatedProfile));
            }
            localStorage.setItem('flowtalk_guest_mock_users', JSON.stringify(usersList));
          }
        }
        setSelectedAdminUser({ ...targetUser, blocked: newBlockedState });
        await refreshAdminData();
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        blocked: newBlockedState,
        updatedAt: new Date().toISOString()
      });
      setSelectedAdminUser({ ...targetUser, blocked: newBlockedState });
      await refreshAdminData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleAdminAdjustCredits = async (targetUser: UserProfile, amount: number) => {
    try {
      const currentCredits = targetUser.credits;
      const newBalance = Math.max(0, currentCredits + amount);
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
        setSelectedAdminUser({ ...targetUser, credits: newBalance });
        await refreshAdminData();
        return;
      }

      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        credits: newBalance,
        updatedAt: new Date().toISOString()
      });
      setSelectedAdminUser({ ...targetUser, credits: newBalance });
      await refreshAdminData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  // Metrics calculated from admin sets
  const totalRevenue = allTransactions.reduce((acc, trans) => acc + trans.amount, 0);
  const totalAcquisition = allUsers.length;
  const filteredUsers = allUsers.filter(u => 
    u.email.toLowerCase().includes(userSearchText.toLowerCase()) || 
    u.displayName.toLowerCase().includes(userSearchText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row relative"
      >
        
        {/* Left pane: User Overview and Tab Selectors */}
        <div className="w-full md:w-80 bg-slate-900 text-white p-6 flex flex-col justify-between shrink-0 border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/30">
                FT
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight text-white leading-none">FlowTalk AI</h2>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1 block">Account Center</span>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs text-sans">Loading account state...</div>
            ) : !currentUser ? (
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 text-center space-y-4">
                <p className="text-xs text-slate-350 leading-relaxed">Sign in via Google to save historical chats, claim 500 free credits, or activate API integrations.</p>
                <button 
                  onClick={loginWithGoogle}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold text-xs text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all outline-none"
                >
                  Log In Securely
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Identity Segment */}
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={userProfile?.profilePicture || currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile?.displayName || 'FT'}`} 
                      alt="User photo" 
                      className="w-11 h-11 rounded-full border-2 border-purple-500/30 object-cover shadow-inner"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-white truncate leading-tight">{userProfile?.displayName}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-none">{userProfile?.email}</p>
                      
                      <div className="flex items-center space-x-1.5 mt-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          userProfile?.plan === 'Enterprise' 
                            ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' 
                            : userProfile?.plan === 'Pro' 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-slate-700 text-slate-300'
                        }`}>
                          {userProfile?.plan} Plan
                        </span>
                        
                        {userProfile?.isAdmin && (
                          <span className="text-[9px] font-black bg-emerald-600 text-white uppercase px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Shield size={8} /> Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/40 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Platform Balance:</span>
                    <span className="font-extrabold text-white flex items-center space-x-1">
                      <Coins size={12} className="text-amber-400" />
                      <span>{userProfile?.plan === 'Enterprise' ? '∞' : `${userProfile?.credits || 0} credits`}</span>
                    </span>
                  </div>
                </div>

                {/* Tab selections */}
                <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab('plans')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-none ${
                      activeTab === 'plans' 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' 
                        : 'text-slate-400 hover:bg-slate-805 hover:text-white'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>Upgrade & Licenses</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('api')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-none ${
                      activeTab === 'api' 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' 
                        : 'text-slate-400 hover:bg-slate-805 hover:text-white'
                    }`}
                  >
                    <Key size={14} />
                    <span>My APIs & Profile</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('ledger')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-none ${
                      activeTab === 'ledger' 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' 
                        : 'text-slate-400 hover:bg-slate-805 hover:text-white'
                    }`}
                  >
                    <Clock size={14} />
                    <span>Billing History</span>
                  </button>

                  {isAdmin && (
                    <button 
                      onClick={() => setActiveTab('admin')}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-none border-t border-slate-800/60 mt-4 pt-4 ${
                        activeTab === 'admin' 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10' 
                          : 'text-emerald-450 hover:bg-slate-805 hover:text-emerald-300'
                      }`}
                    >
                      <Shield size={14} />
                      <span>Admin Oversight Portal</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentUser && (
            <button 
              onClick={logout}
              className="flex items-center justify-center space-x-2 w-full py-2 bg-slate-800/80 hover:bg-rose-950/20 hover:text-rose-450 rounded-xl font-bold text-xs text-slate-350 transition-all border border-slate-700/30 active:scale-95 outline-none mt-4"
            >
              <LogOut size={12} />
              <span>Disconnect Session</span>
            </button>
          )}
        </div>

        {/* Right pane: Action Dashboard Panels */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
          <div className="flex-1">
            
            {/* Header section */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-850">
                  {activeTab === 'plans' && 'Upgrade Licensing & Plans'}
                  {activeTab === 'api' && 'APIs & User Configuration'}
                  {activeTab === 'ledger' && 'Private Purchase Logs'}
                  {activeTab === 'admin' && 'Enterprise System Administration'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTab === 'plans' && 'Extend processing credits and unlock executive draft styles'}
                  {activeTab === 'api' && 'Establish custom AI endpoints or customize your display parameters'}
                  {activeTab === 'ledger' && 'Audit transactions, sync tokens, and print pricing receipts'}
                  {activeTab === 'admin' && 'Monitor operations, manage user directories, and adjust balances'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-1 px-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold transition-all text-slate-600"
              >
                Close
              </button>
            </div>

            {/* TAB CONTENT panels */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Free plan */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded uppercase">Starter</span>
                        {(!userProfile || userProfile.plan === 'Free') && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-850 mt-3">Free Tier</h4>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">Try standard Smart Rewriting on Microsoft Teams mockup.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-slate-850">$0</span>
                        <span className="text-xs text-slate-400 ml-1">/ forever</span>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600 font-medium">
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500" /> <span>500 free credits included</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500" /> <span>Standard Casual tone rewrites</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500" /> <span>Real-time Language detection</span></div>
                      </div>
                    </div>

                    <button 
                      disabled
                      className="w-full mt-6 py-2 bg-slate-100 rounded-xl text-slate-400 text-xs font-bold"
                    >
                      {userProfile?.plan === 'Free' ? 'Authorized Current Plan' : 'Free Plan'}
                    </button>
                  </div>

                  {/* Pro Plan (Selling the product!) */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-purple-400 shadow-sm flex flex-col justify-between relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Best Value
                    </div>
                    <div>
                      <div className="flex justify-between items-start mt-1">
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded uppercase">Professional</span>
                        {userProfile?.plan === 'Pro' && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-850 mt-3">Pro Business</h4>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">Perfect for dynamic writers, remote workers, and content controllers.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-slate-850">$12</span>
                        <span className="text-xs text-slate-400 ml-1">/ one-time</span>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600 font-medium">
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-extrabold" /> <span>+5,000 Premium API credits</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-extrabold" /> <span>Unlocks "Professional" smart tones</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-extrabold" /> <span>Use Anywhere browser Extension load</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-extrabold" /> <span>Prioritized model response speeds</span></div>
                      </div>
                    </div>

                    {!currentUser ? (
                      <button 
                        onClick={loginWithGoogle}
                        className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                      >
                        Log in to Buy
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowCheckout({ plan: 'Pro', price: 12, credits: 5000 })}
                        className="w-full mt-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-sm shadow-purple-200 active:scale-95 hover:shadow-md transition-all outline-none"
                      >
                        {userProfile?.plan === 'Pro' ? 'Buy credits again ($12)' : 'Upgrade to Pro ($12)'}
                      </button>
                    )}
                  </div>

                  {/* Enterprise Plan (Selling the product!) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded uppercase">Unlimited</span>
                        {userProfile?.plan === 'Enterprise' && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-850 mt-3">Executive Elite</h4>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">Designed for high output professionals and custom development models.</p>
                      
                      <div className="my-5 flex items-baseline">
                        <span className="text-2xl font-black text-slate-850">$39</span>
                        <span className="text-xs text-slate-400 ml-1">/ life-license</span>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600 font-medium">
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-bold" /> <span><strong>Unlimited lifetime credits</strong></span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-bold" /> <span>Unlocks "Executive Elite" tone sets</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-bold" /> <span>Dynamic cloud dashboard syncing</span></div>
                        <div className="flex items-center space-x-2"><Check size={12} className="text-purple-500 font-bold" /> <span>Custom API Key deployment endpoints</span></div>
                      </div>
                    </div>

                    {!currentUser ? (
                      <button 
                        onClick={loginWithGoogle}
                        className="w-full mt-6 py-2.5 bg-gradient-to-r from-slate-850 to-slate-900 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                      >
                        Log in to Buy
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowCheckout({ plan: 'Enterprise', price: 39, credits: 100000 })}
                        className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all outline-none"
                      >
                        {userProfile?.plan === 'Enterprise' ? 'Active Lifetime License' : 'Upgrade to Enterprise ($39)'}
                      </button>
                    )}
                  </div>

                </div>

                {/* Simulated Stripe pricing checkout overlay */}
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
                        className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-6"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-purple-600 rounded-full animate-ping" />
                            <h4 className="font-extrabold text-sm text-slate-850 uppercase tracking-wider">Secure Checkout</h4>
                          </div>
                          <button 
                            onClick={() => setShowCheckout(null)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md text-slate-600 font-bold"
                          >
                            Cancel
                          </button>
                        </div>

                        {checkoutSuccess ? (
                          <div className="text-center py-8 space-y-3">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
                              ✓
                            </div>
                            <h5 className="font-extrabold text-slate-800 text-base">Payment Authorized</h5>
                            <p className="text-xs text-slate-500">License updated. Credits matched on secure servers successfully!</p>
                          </div>
                        ) : (
                          <form onSubmit={processSimulatedPayment} className="space-y-4">
                            
                            {/* Card visual rendering */}
                            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-5 rounded-2xl text-white font-mono shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl" />
                              
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-purple-400 tracking-wider text-xs">Simulated Stripe Terminal</span>
                                <CreditCard size={20} className="text-slate-400" />
                              </div>

                              <div className="text-sm tracking-widest text-slate-200 my-2 font-mono">
                                {cardNumber || '•••• •••• •••• ••••'}
                              </div>

                              <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                                <div>
                                  <p className="text-[8px] text-slate-500">Cardholder</p>
                                  <p className="truncate w-24 font-bold">{cardName || 'YOUR FULL NAME'}</p>
                                </div>
                                <div className="flex space-x-4">
                                  <div>
                                    <p className="text-[8px] text-slate-500 font-semibold">Expires</p>
                                    <p className="font-bold">{cardExpiry || 'MM/YY'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-500 font-semibold">CVV</p>
                                    <p className="font-bold">{cardCvv || '•••'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 flex justify-between items-center font-bold">
                              <span>Licensing Tier: {showCheckout.plan}</span>
                              <span>Total Due: ${showCheckout.price}.00</span>
                            </div>

                            {/* Card inputs */}
                            <div className="space-y-3.5">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Cardholder Name</label>
                                <input 
                                  required
                                  type="text"
                                  placeholder="John Doe"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-800 font-bold"
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
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Security Code (CVV)</label>
                                  <input 
                                    required
                                    type="password"
                                    maxLength={3}
                                    placeholder="***"
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl outline-none text-xs text-slate-850 font-bold font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            <button 
                              type="submit"
                              disabled={checkoutProcessing}
                              className="w-full py-3 bg-[#6264A7] hover:bg-[#525497] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all outline-none mt-2 flex justify-center items-center space-x-2"
                            >
                              {checkoutProcessing ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                                  <span>Authorizing Stripe Ledger...</span>
                                </>
                              ) : (
                                <span>Confirm Payment & Sync license</span>
                              )}
                            </button>
                            
                            <p className="text-[10px] text-slate-400 text-center font-medium">Standard 256-bit SSL encrypted transit. Secure sandbox mockup.</p>
                          </form>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                {!currentUser ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 flex items-center justify-center rounded-2xl mx-auto"><Lock size={20} /></div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">Please authorize your Google account connection first using the sign-in widget in the left-hand panel.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* User display customization */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-slate-850">Display Name Profile</h4>
                      <div className="flex gap-4">
                        <input 
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                        />
                        <button 
                          onClick={async () => {
                            await updateDisplayName(nameInput);
                            alert("Profile name updated successfully.");
                          }}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all outline-none active:scale-95"
                        >
                          Save Name
                        </button>
                      </div>
                    </div>

                    {/* Gemini endpoints settings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-850">Custom Gemini API Endpoints</h4>
                          <p className="text-xs text-slate-500 mt-1">If enabled, rewrites bypass platform balance checks and draw directly from your Google Developer console bills.</p>
                        </div>
                        <div className="flex items-center space-x-1 bg-purple-50 p-1 px-2.5 rounded-lg border border-purple-100">
                          <Database size={10} className="text-purple-650" />
                          <span className="text-[9px] font-bold text-purple-600 uppercase">Self-host Billing</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono">Gemini API Key (GEMINI_API_KEY)</label>
                        <div className="flex gap-4">
                          <input 
                            type="password"
                            placeholder="AIzaSy..."
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 font-mono"
                          />
                          <button 
                            onClick={async () => {
                              await updateCustomApiKey(apiKeyInput);
                              alert("Custom Gemini API settings synced successfully.");
                            }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-500 transition-all outline-none active:scale-95"
                          >
                            Bind API Key
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block pt-1 leading-normal">
                          🔑 Your key is absolute secure. Rules strictly restrict read scopes of the custom keys from third-party client networks.
                        </span>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div className="space-y-6">
                {!currentUser ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 flex items-center justify-center rounded-2xl mx-auto"><Lock size={20} /></div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">Please authorize your Google account connection first using the sign-in widget in the left-hand panel.</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 space-y-3">
                    <p className="text-xs text-slate-450 leading-relaxed">No purchase logs detected under your account. Upgrade your license on the 'Upgrade & Licenses' tab to initiate sync logs.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-250 font-bold text-slate-500">
                          <th className="p-3">Reference ID</th>
                          <th className="p-3">Plan</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Credits Injected</th>
                          <th className="p-3">Sync Date</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold text-slate-700">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-450 uppercase">{tx.id}</td>
                            <td className="p-3">
                              <span className="bg-purple-55 text-purple-700 px-2 py-0.5 rounded font-extrabold">{tx.plan}</span>
                            </td>
                            <td className="p-3 font-extrabold text-slate-850">${tx.amount}.00</td>
                            <td className="p-3">+{tx.creditsAdded.toLocaleString()}</td>
                            <td className="p-3 text-[10px] text-slate-400 font-medium">
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

            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                
                {/* Admin high-performance stat metrics cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Enterprise Revenue</span>
                      <h5 className="text-lg font-black text-slate-850 mt-1">${totalRevenue}.00</h5>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                      $
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total User base</span>
                      <h5 className="text-lg font-black text-slate-850 mt-1">{totalAcquisition}</h5>
                    </div>
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                      <Users size={16} />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pricing Purchases</span>
                      <h5 className="text-lg font-black text-slate-850 mt-1">{allTransactions.length}</h5>
                    </div>
                    <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold">
                      <ShoppingBag size={16} />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Tiers</span>
                      <h5 className="text-lg font-black text-slate-850 mt-1">3 Tiers</h5>
                    </div>
                    <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                </div>

                {/* Users Database Controller */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <h4 className="text-sm font-black text-slate-800 flex items-center space-x-2">
                      <Database size={14} className="text-emerald-600" />
                      <span>Security & Multitenant Directories</span>
                    </h4>

                    {/* Users lookup field */}
                    <div className="relative max-w-xs w-full">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search emails or profiles..."
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-205 focus:border-emerald-500 rounded-xl outline-none text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Selection directory table */}
                    <div className="md:col-span-2 border border-slate-100 rounded-xl overflow-hidden h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 font-bold">
                            <th className="p-2.5">User Profile</th>
                            <th className="p-2.5">Subscription</th>
                            <th className="p-2.5">Balance</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-slate-700">
                          {filteredUsers.map((user) => (
                            <tr 
                              key={user.uid} 
                              onClick={() => setSelectedAdminUser(user)}
                              className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                                selectedAdminUser?.uid === user.uid ? 'bg-emerald-50/50 hover:bg-emerald-50' : ''
                              }`}
                            >
                              <td className="p-2.5 min-w-0">
                                <div className="truncate font-extrabold text-slate-850">{user.displayName || 'FT User'}</div>
                                <div className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email}</div>
                              </td>
                              <td className="p-2.5">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  user.plan === 'Enterprise' ? 'bg-cyan-100 text-cyan-800' : user.plan === 'Pro' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {user.plan}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold">{user.plan === 'Enterprise' ? '∞' : `${user.credits} CR`}</td>
                              <td className="p-2.5">
                                {user.blocked ? (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">Suspended</span>
                                ) : (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">Active</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Operational Panel for selected user profile */}
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between min-h-[18rem]">
                      {selectedAdminUser ? (
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Configure Account</span>
                            <h5 className="font-black text-slate-850 truncate text-sm mt-0.5">{selectedAdminUser.displayName}</h5>
                            <span className="text-[10px] text-slate-400 block truncate leading-none mt-0.5">{selectedAdminUser.email}</span>
                          </div>

                          {/* Subscription adjustments */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Set Subscription Level</label>
                            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-250 rounded-lg">
                              {(['Free', 'Pro', 'Enterprise'] as const).map((tierKey) => (
                                <button
                                  key={tierKey}
                                  onClick={() => handleAdminUpdatePlan(selectedAdminUser, tierKey)}
                                  className={`py-1 text-[9px] font-black rounded transition-all outline-none ${
                                    selectedAdminUser.plan === tierKey 
                                      ? 'bg-white text-slate-900 shadow-sm' 
                                      : 'text-slate-500 hover:text-slate-850'
                                  }`}
                                >
                                  {tierKey}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Inject Credits Balance */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Inject Credit Balance</label>
                            <div className="flex gap-2">
                              <input 
                                type="number"
                                value={adminCreditAdjustment}
                                onChange={(e) => setAdminCreditAdjustment(Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-white border border-slate-210 rounded-lg text-xs font-bold text-slate-800 font-mono"
                              />
                              <button
                                onClick={() => handleAdminAdjustCredits(selectedAdminUser, adminCreditAdjustment)}
                                className="flex-1 py-1 bg-slate-900 hover:bg-slate-850 font-bold text-[10px] text-white rounded-lg flex justify-center items-center gap-1 active:scale-95 transition-all outline-none"
                              >
                                <Plus size={10} /> Add Credits
                              </button>
                            </div>
                          </div>

                          {/* Trigger Block suspension */}
                          <div className="pt-2 border-t border-slate-205">
                            <button
                              onClick={() => handleAdminToggleBlock(selectedAdminUser)}
                              className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-all outline-none flex justify-center items-center gap-1 active:scale-95 ${
                                selectedAdminUser.blocked 
                                  ? 'bg-emerald-100 font-black text-emerald-800 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                              }`}
                            >
                              <ShieldAlert size={10} />
                              <span>{selectedAdminUser.blocked ? 'Reactivate Profile' : 'Suspend Account access'}</span>
                            </button>
                          </div>

                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center flex-1 space-y-2">
                          <Users size={24} className="text-slate-350" />
                          <p>Select a user profile from the list to access balance controls and suspensions.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Audit trail record list representing monetization logs */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-3">
                  <h4 className="text-xs font-black text-slate-805 flex items-center space-x-2">
                    <FileText size={14} className="text-purple-600" />
                    <span>Global Transaction Ledgers</span>
                  </h4>

                  <div className="border border-slate-50 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-450 font-extrabold border-b border-slate-150">
                          <th className="p-2">Buyer Email</th>
                          <th className="p-2">Transaction ID</th>
                          <th className="p-2">Plan</th>
                          <th className="p-2">Revenue USD</th>
                          <th className="p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold text-slate-700">
                        {allTransactions.map(tx => (
                          <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-2 font-bold max-w-[120px] truncate">{tx.email}</td>
                            <td className="p-2 font-mono text-[9px] text-slate-450 uppercase">{tx.id}</td>
                            <td className="p-2 text-purple-700 font-black">{tx.plan}</td>
                            <td className="p-2 font-black text-emerald-600">${tx.amount}.00</td>
                            <td className="p-2 text-[9px] text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

      </motion.div>
    </div>
  );
};
