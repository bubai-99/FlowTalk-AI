import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection, 
  query, 
  where, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';

// Interfaces mapping to firebase-blueprint.json
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  credits: number;
  customGeminiKey?: string;
  isAdmin: boolean;
  blocked?: boolean;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amount: number;
  creditsAdded: number;
  timestamp: string;
}

interface UserContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCustomApiKey: (key: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateProfilePicture: (url: string) => Promise<void>;
  purchasePlan: (planName: 'Pro' | 'Enterprise', price: number, credits: number) => Promise<void>;
  useCredit: () => Promise<void>;
  transactions: TransactionRecord[];
  allUsers: UserProfile[];
  allTransactions: TransactionRecord[];
  refreshAdminData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  
  // Admin collection states
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([]);

  // 1. Monitor user authentication
  useEffect(() => {
    // Thoroughly remove any cached/legacy guest sessions to respect production account setups
    localStorage.removeItem('flowtalk_guest_user');
    localStorage.removeItem('flowtalk_guest_profile');
    localStorage.removeItem('flowtalk_guest_txs');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setTransactions([]);
        setLoading(false);
      } else {
        // Fetch or create user profile matching target rules
        await syncUserProfile(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load conversations and user profile real-time snapshots
  useEffect(() => {
    if (!currentUser) return;

    const profileRef = doc(db, 'users', currentUser.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });

    // Real-time listener for user private purchases
    const transRef = collection(db, 'transactions');
    const q = query(transRef, where('userId', '==', currentUser.uid));
    const unsubscribeTrans = onSnapshot(q, (snapshot) => {
      const records: TransactionRecord[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as TransactionRecord);
      });
      setTransactions(records.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTrans();
    };
  }, [currentUser]);

  // Sync / create User document on login
  const syncUserProfile = async (user: FirebaseUser) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        // Setup initial structure with 500 free credits
        const bootstrappedEmail = 'binugede@gmail.com';
        const isUserBootstrappedAdmin = user.email === bootstrappedEmail;

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'FlowTalk User',
          plan: 'Free',
          credits: 500,
          isAdmin: isUserBootstrappedAdmin,
          blocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(snap.data() as UserProfile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failure", err);
      setLoading(false);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      // Seed profile immediately in Firestore with custom display name
      const userRef = doc(db, 'users', user.uid);
      const bootstrappedEmail = 'binugede@gmail.com';
      const isUserBootstrappedAdmin = email.trim().toLowerCase() === bootstrappedEmail;

      const newProfile: UserProfile = {
        uid: user.uid,
        email: email,
        displayName: name.trim() || 'FlowTalk User',
        plan: 'Free',
        credits: 500,
        isAdmin: isUserBootstrappedAdmin,
        blocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, newProfile);
      setUserProfile(newProfile);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('flowtalk_guest_user');
    localStorage.removeItem('flowtalk_guest_profile');
    localStorage.removeItem('flowtalk_guest_txs');
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setUserProfile(null);
    setTransactions([]);
  };

  const updateCustomApiKey = async (apiKey: string) => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        customGeminiKey: apiKey.trim() || '',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        displayName: name.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updateProfilePicture = async (url: string) => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        profilePicture: url,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Simulating monetization and purchases
  const purchasePlan = async (planName: 'Pro' | 'Enterprise', price: number, creditsAdded: number) => {
    if (!currentUser || !userProfile) return;
    const timestamp = new Date().toISOString();
    const transactionId = 'tx_' + Date.now();

    const transaction: TransactionRecord = {
      id: transactionId,
      userId: currentUser.uid,
      email: currentUser.email || '',
      plan: planName,
      amount: price,
      creditsAdded: creditsAdded,
      timestamp: timestamp
    };



    try {
      // 1. Log transaction in security ledger
      await setDoc(doc(db, 'transactions', transactionId), transaction);

      // 2. Adjust subscriptions and update user profile fields
      const userRef = doc(db, 'users', currentUser.uid);
      const updatedCredits = userProfile.credits + creditsAdded;
      await updateDoc(userRef, {
        plan: planName,
        credits: updatedCredits,
        updatedAt: timestamp
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions / user credit update');
    }
  };

  // Client side credit depletion
  const useCredit = async () => {
    if (!currentUser || !userProfile) return;
    // Don't decrease if custom API key is present or on unlimited plan
    if (userProfile.customGeminiKey && userProfile.customGeminiKey.trim()) return;
    if (userProfile.plan === 'Enterprise') return;
    if (userProfile.credits <= 0) return;



    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        credits: Math.max(0, userProfile.credits - 1),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Admin capabilities to pull all user metrics and user lists
  const refreshAdminData = async () => {
    if (!userProfile?.isAdmin) return;


    try {
      // Pull all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const activeUsers: UserProfile[] = [];
      usersSnap.forEach((docSnap) => {
        activeUsers.push(docSnap.data() as UserProfile);
      });
      setAllUsers(activeUsers);

      // Pull all transactions
      const txSnap = await getDocs(collection(db, 'transactions'));
      const txs: TransactionRecord[] = [];
      txSnap.forEach((docSnap) => {
        txs.push(docSnap.data() as TransactionRecord);
      });
      setAllTransactions(txs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'admin lists fetch');
    }
  };

  // Auto poll admin dashboard metrics in real-time when admin is active
  useEffect(() => {
    if (userProfile?.isAdmin) {
      refreshAdminData();
    }
  }, [userProfile?.isAdmin]);

  const isAdminFlag = userProfile?.isAdmin || currentUser?.email === 'binugede@gmail.com';

  return (
    <UserContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      isAdmin: isAdminFlag,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      updateCustomApiKey,
      updateDisplayName,
      updateProfilePicture,
      purchasePlan,
      useCredit,
      transactions,
      allUsers,
      allTransactions,
      refreshAdminData
    }}>
      {children}
    </UserContext.Provider>
  );
};
