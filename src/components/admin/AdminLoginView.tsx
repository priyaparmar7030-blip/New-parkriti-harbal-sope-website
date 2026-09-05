import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, ADMIN_EMAIL } from '../../lib/firebase';
import { ViewState } from '../../types';

interface AdminLoginViewProps {
  setCurrentView: (view: ViewState) => void;
  onLoginSuccess: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ setCurrentView, onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@prakritisoap.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-[#ebefeb]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#072417] text-[#ffdcbd] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-md">
            🧼
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">Admin Portal</h1>
          <p className="text-xs text-[#62776c] mt-1">PRAKRITI SOAP Secure Management Console</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417]"
              placeholder="admin@prakritisoap.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#072417] text-white rounded-xl font-semibold text-sm hover:bg-[#072417]/90 transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#ebefeb]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-[#85a490]">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 bg-white border border-[#d2dcd5] text-[#072417] rounded-xl font-semibold text-sm hover:bg-[#fbf9f6] transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <span>🌐</span> Sign in with Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setCurrentView('home')}
            className="text-xs text-[#85a490] hover:text-[#072417] transition-colors font-medium"
          >
            ← Return to Customer Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
