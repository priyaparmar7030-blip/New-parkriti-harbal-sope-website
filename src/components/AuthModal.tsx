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
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedId = loginCustomerId.trim();
    if (!trimmedId) {
      setError('Customer ID is required.');
      return;
    }
    if (!loginPassword) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: trimmedId, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Store session token for page refresh & session persistence (NOT storing password or customer database in localStorage)
      if (data.sessionToken) {
        localStorage.setItem('prakriti_customer_token', data.sessionToken);
      }

      onLoginSuccess(data.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = signupName.trim();
    if (!trimmedName) {
      setError('Customer Name is required.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/customer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedName,
          password: signupPassword,
          email: signupEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed.');
      }

      // Successfully created account in Firebase!
      setCreatedCustomerId(data.customerId);
      // Reset form fields
      setSignupName('');
      setSignupPassword('');
      setSignupEmail('');
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
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#fbf9f6] border border-[#d2dcd5] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button 
          id="close-auth-modal"
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
            {tab === 'owner-signin' && 'Restricted to authorized store owner.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[#efeeeb] p-1 rounded-xl mb-6 text-[11px] font-bold">
          <button
            id="tab-customer-signin"
            type="button"
            onClick={() => { setTab('customer-signin'); setError(null); setCreatedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'customer-signin' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Sign In
          </button>
          <button
            id="tab-customer-signup"
            type="button"
            onClick={() => { setTab('customer-signup'); setError(null); setCreatedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'customer-signup' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Sign Up
          </button>
          <button
            id="tab-owner-signin"
            type="button"
            onClick={() => { setTab('owner-signin'); setError(null); setCreatedCustomerId(null); }}
            className={`py-2 rounded-lg transition-colors cursor-pointer ${tab === 'owner-signin' ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#607769]'}`}
          >
            Owner
          </button>
        </div>

        {error && (
          <div id="auth-error-message" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-[12px] rounded-xl font-medium">
            {error}
          </div>
        )}

        {createdCustomerId && (
          <div id="signup-success-container" className="mb-6 p-5 bg-green-50 border border-green-200 text-green-900 rounded-xl text-center animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-[24px]">check</span>
            </div>
            <h3 className="text-[16px] font-bold text-green-900 mb-1">
              Account created successfully!
            </h3>
            <p className="text-[13px] text-green-800 font-medium mb-1">
              Your Customer ID: <span className="font-mono font-bold text-[#072417] bg-white px-2 py-0.5 rounded border border-green-300">{createdCustomerId}</span>
            </p>
            <p className="text-[12px] text-green-700 mt-2 mb-4">
              Please save your Customer ID for future login.
            </p>
            <button
              id="continue-to-signin-btn"
              type="button"
              onClick={() => {
                setLoginCustomerId(createdCustomerId);
                setLoginPassword('');
                setCreatedCustomerId(null);
                setError(null);
                setTab('customer-signin');
              }}
              className="w-full py-2.5 bg-[#072417] text-[#ffdcbd] text-[13px] font-bold rounded-xl hover:bg-[#0c3623] cursor-pointer transition-colors shadow-sm"
            >
              Continue to Sign In
            </button>
          </div>
        )}

        {!createdCustomerId && tab === 'customer-signin' && (
          <form id="customer-signin-form" onSubmit={handleCustomerLogin} className="space-y-4">
            <div>
              <label htmlFor="login-customer-id" className="block text-[12px] font-semibold text-[#072417] mb-1">Customer ID *</label>
              <input 
                id="login-customer-id"
                type="text" 
                value={loginCustomerId} 
                onChange={e => setLoginCustomerId(e.target.value)}
                placeholder="e.g. CUS-8F42K7"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] font-mono uppercase focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[12px] font-semibold text-[#072417] mb-1">Password *</label>
              <input 
                id="login-password"
                type="password" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <button 
              id="submit-customer-signin"
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-[#ffdcbd] font-bold text-[13px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing In...' : 'Sign In with Customer ID'}
            </button>
          </form>
        )}

        {!createdCustomerId && tab === 'customer-signup' && (
          <form id="customer-signup-form" onSubmit={handleCustomerSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-[12px] font-semibold text-[#072417] mb-1">Customer Name *</label>
              <input 
                id="signup-name"
                type="text" 
                value={signupName} 
                onChange={e => setSignupName(e.target.value)}
                placeholder="Rahul Patil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-[12px] font-semibold text-[#072417] mb-1">Password *</label>
              <input 
                id="signup-password"
                type="password" 
                value={signupPassword} 
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-[12px] font-semibold text-[#072417] mb-1">Email (Optional)</label>
              <input 
                id="signup-email"
                type="email" 
                value={signupEmail} 
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="optional@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
              />
            </div>

            <button 
              id="submit-customer-signup"
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-[#ffdcbd] font-bold text-[13px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Create Customer Account'}
            </button>
          </form>
        )}

        {!createdCustomerId && tab === 'owner-signin' && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-[13px] text-[#607769] mb-4">
              Click below to authenticate with your authorized Google account.
            </p>
            <button
              id="owner-google-signin-btn"
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

