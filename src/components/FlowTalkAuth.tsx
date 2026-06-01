import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useUser } from '../contexts/UserContext';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Check, 
  Chrome,
  ArrowLeft,
  Info
} from 'lucide-react';

interface FlowTalkAuthProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
  onBack?: () => void;
}

export const FlowTalkAuth: React.FC<FlowTalkAuthProps> = ({ 
  initialMode = 'login', 
  onSuccess,
  onBack 
}) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // UX states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Parse Firebase authentication errors to something friendly
  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    if (code.includes('auth/operation-not-allowed')) {
      return 'operation-not-allowed';
    }
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
      return 'The email or password does not match. Please verify and try again.';
    }
    if (code.includes('auth/user-not-found')) {
      return 'No account was found with this email. Create a new account below!';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'This email address is already configured with an active FlowTalk profile.';
    }
    if (code.includes('auth/weak-password')) {
      return 'Security warning: Password must have at least 6 characters.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Please specify a properly formatted email address.';
    }
    return err?.message || 'A network error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('All credential inputs are mandatory.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setErrorMsg('Please specify your name to personalize your communications.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password, name.trim());
      }
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-[calc(100vh-44px)] font-sans flex items-center justify-center p-6 selection:bg-purple-600 selection:text-white relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-650/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-650/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        
        {/* Back control */}
        {onBack && (
          <button 
            type="button"
            onClick={onBack}
            className="mb-8 text-xs text-slate-400 hover:text-white font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all outline-none"
          >
            <ArrowLeft size={12} />
            <span>Go Back</span>
          </button>
        )}

        {/* LOGO CONTAINER */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-650 to-indigo-650 flex items-center justify-center font-black text-lg text-white mx-auto shadow-indigo-950/50 shadow-xl border border-indigo-400/20 mb-4">
            F
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back to FlowTalk' : 'Create Your FlowTalk Profile'}
          </h2>
          <p className="text-xs text-slate-450 mt-1.5 font-semibold">
            {mode === 'login' 
              ? 'Access your saved custom filters, communication transcripts, and balances.' 
              : 'Sign up to immediately claim 500 free credits and custom API integration keys.'
            }
          </p>
        </div>

        {/* MODE SWITCHER TAB CORRIDOR */}
        <div className="bg-slate-950 p-1 rounded-2xl border border-slate-850 flex items-center gap-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all outline-none ${
              mode === 'login' 
                ? 'bg-purple-650 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all outline-none ${
              mode === 'register' 
                ? 'bg-purple-650 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* MAIN FORM BOX */}
        <div className="bg-slate-950 border border-slate-850/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          
          {success ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 text-center"
            >
              <div className="w-16 h-16 bg-emerald-950 border border-emerald-800 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-4 animate-bounce">
                <Check size={28} />
              </div>
              <h3 className="text-base font-black text-white">Authentication Successful</h3>
              <p className="text-xs text-slate-400 font-semibold mt-2">Loading your customized workspace environment now...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* ERROR BLOCK BANNER */}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {errorMsg === 'operation-not-allowed' ? (
                    <div className="p-4 bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200/90 space-y-2.5">
                      <div className="flex gap-2 items-start font-bold">
                        <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <span className="uppercase tracking-wider text-[11px]">Authentication Provider Disabled</span>
                      </div>
                      <p className="leading-relaxed text-slate-300 text-[11px] font-medium">
                        Your Firebase project currently has sign-in providers disabled. You need to enable them in your Firebase Web Console.
                      </p>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5 text-slate-350 font-semibold">
                        <span className="font-bold text-slate-100 block text-[10px] uppercase tracking-wider mb-1">Quick Steps:</span>
                        <div className="flex items-start gap-1.5 leading-normal">
                          <span className="text-amber-400 font-bold">1.</span> Open your Firebase Web Console.
                        </div>
                        <div className="flex items-start gap-1.5 leading-normal">
                          <span className="text-amber-400 font-bold">2.</span> Nav to <strong className="text-white">Authentication &rarr; Sign-in method</strong>.
                        </div>
                        <div className="flex items-start gap-1.5 leading-normal">
                          <span className="text-amber-400 font-bold">3.</span> Enable <strong className="text-white">Email/Password</strong> and/or <strong className="text-white">Google</strong> providers.
                        </div>
                      </div>
                      <a 
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="inline-flex w-full items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all duration-150 outline-none shadow-md"
                      >
                        Open Firebase Console &rarr;
                      </a>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs text-rose-300 flex gap-2.5 items-start font-semibold">
                      <ShieldAlert size={16} className="text-rose-450 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* REGISTER INLINE DISPLAY NAME NAME */}
              {mode === 'register' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Your Name</label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-slate-200 font-bold placeholder:text-slate-600 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* EMAIL CORNER */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Email Address</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input 
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-slate-200 font-bold placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD CORNER */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-slate-200 font-bold placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* MAIN REGISTER BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-550 hover:to-indigo-550 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 outline-none shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Workspace' : 'Initialize Dynamic Profile'}</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>

              {/* GOOGLE FEDERATION DIVIDER */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-850" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider font-mono">
                  <span className="bg-slate-950 px-3 text-slate-500">Or Federated Sign In</span>
                </div>
              </div>

              {/* GOOGLE BUTTON */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 outline-none border border-slate-800"
              >
                <Chrome size={13} className="text-amber-500" />
                <span>Verify with Google Workspace</span>
              </button>

            </form>
          )}
        </div>

        {/* SECURITY INFO FOOTNOTE */}
        <div className="mt-6 flex items-center gap-2 justify-center text-[10px] text-slate-500 font-bold">
          <Info size={11} className="text-purple-500" />
          <span>Secured by Firebase Enterprise Authentication Shield.</span>
        </div>

      </div>
    </div>
  );
};
