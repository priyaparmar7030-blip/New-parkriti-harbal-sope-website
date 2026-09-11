import React, { useState } from 'react';
import { auth, GoogleAuthProvider, signInWithPopup } from '../lib/firebase';
import { CustomerUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CustomerUser) => void;
}

const OWNER_EMAIL = 'priyaparmar7030@gmail.com';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'customer-signin' | 'customer-signup' | 'owner-signin'>('customer-signin');
  
  // Customer sign in state
  const [loginCustomerId, setLoginCustomerId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Customer sign up state
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [generatedCustomerId, setGeneratedCustomerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: loginCustomerId, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      onLoginSuccess(data.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid Customer ID or Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/customer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: signupName, password: signupPassword, email: signupEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed.');
      }
      setGeneratedCustomerId(data.customer.customerId);
      onLoginSuccess(data.customer);
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        const ownerUser: CustomerUser = {
          id: user.uid,
          customerId: 'OWNER',
          email: user.email,
          fullName: user.displayName || 'Store Owner',
          role: 'owner',
          createdAt: user.metadata.creationTime || new Date().toISOString()
        };
        onLoginSuccess(ownerUser);
        onClose();
      } else {
        await auth.signOut();
        setError(`Access denied. ${user.email} is not authorized as store owner.`);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#fbf9f6] border border-[#d2dcd5] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#4c6455] hover:bg-[#efeeeb] transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="text-center mb-6">
          <span className="text-[12px] uppercase font-bold tracking-widest text-[#4c6455]">Prakriti Authentication</span>
          <h2 className="font-['Playfair_Display'] text-[24px] font-bold text-[#072417] mt-1">
            {tab === 'customer-signin' && 'Customer Sign In'}
            {tab === 'customer-signup' && 'Create Customer Account'}
            {tab === 'owner-signin' && 'Owner Google Sign-In'}
          </h2>
          <p className="text-[13px] text-[#607769] mt-1">
            {tab === 'customer-signin' && 'Login with your unique Customer ID and Password.'}
            {tab === 'customer-signup' && 'Enter your name and password (email optional).'}
            {tab === 'owner-signin' && 'Restricted to store owner (priyaparmar7030@gmail.com).'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[#efeeeb] p-1 rounded-xl mb-6 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => { setTab('customer-signin'); setError(null); setGeneratedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'customer-signin' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('customer-signup'); setError(null); setGeneratedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'customer-signup' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('owner-signin'); setError(null); setGeneratedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'owner-signin' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Owner
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-[12px] rounded-xl font-medium">
            {error}
          </div>
        )}

        {generatedCustomerId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-900 rounded-xl text-center animate-fadeIn">
            <p className="text-[12px] font-bold uppercase tracking-wider text-green-800 mb-1">Account Created Successfully!</p>
            <p className="text-[13px] text-green-700 mb-2">Your Unique Customer ID is:</p>
            <div className="text-xl font-mono font-bold tracking-widest bg-white py-2 px-4 rounded-lg border border-green-300 inline-block text-[#072417] select-all">
              {generatedCustomerId}
            </div>
            <p className="text-[11px] text-green-700 mt-2">Please save this Customer ID. You will need it to sign in next time!</p>
            <button
              onClick={() => { onClose(); }}
              className="mt-4 w-full py-2.5 bg-[#072417] text-[#ffdcbd] text-[12px] font-bold rounded-xl hover:bg-[#0c3623] cursor-pointer"
            >
              Continue to Account
            </button>
          </div>
        )}

        {!generatedCustomerId && tab === 'customer-signin' && (
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#072417] mb-1">Customer ID *</label>
              <input 
                type="text" 
                required 
                value={loginCustomerId} 
                onChange={e => setLoginCustomerId(e.target.value)}
                placeholder="e.g. CUS-8F42K7"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] font-mono uppercase focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#072417] mb-1">Password *</label>
              <input 
                type="password" 
                required 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-[#ffdcbd] font-bold text-[13px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing In...' : 'Sign In with Customer ID'}
            </button>
          </form>
        )}

        {!generatedCustomerId && tab === 'customer-signup' && (
          <form onSubmit={handleCustomerSignup} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#072417] mb-1">Customer Name *</label>
              <input 
                type="text" 
                required 
                value={signupName} 
                onChange={e => setSignupName(e.target.value)}
                placeholder="Rahul Patil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#072417] mb-1">Password *</label>
              <input 
                type="password" 
                required 
                value={signupPassword} 
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#072417] mb-1">Email (Optional)</label>
              <input 
                type="email" 
                value={signupEmail} 
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="optional@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-[#ffdcbd] font-bold text-[13px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Create Customer Account'}
            </button>
          </form>
        )}

        {!generatedCustomerId && tab === 'owner-signin' && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-[13px] text-[#607769] mb-4">
              Click below to authenticate with Google as <strong className="text-[#072417]">priyaparmar7030@gmail.com</strong>
            </p>
            <button
              type="button"
              onClick={handleOwnerGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white border border-[#d2dcd5] text-[#072417] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-xs cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google (Owner Admin)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
