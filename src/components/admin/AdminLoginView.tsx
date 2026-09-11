import React, { useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  setDoc,
  doc
} from '../../lib/firebase';
import { ViewState } from '../../types';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowLeft, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';

interface AdminLoginViewProps {
  setCurrentView: (view: ViewState) => void;
  onLoginSuccess: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot-password';

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ setCurrentView, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<{ code?: string; message?: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const currentHost = window.location.hostname;

    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please switch to Sign In.';
    }
    if (code === 'auth/invalid-email') {
      return 'The email address is invalid. Please verify and try again.';
    }
    if (code === 'auth/weak-password') {
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    }
    if (code === 'auth/user-not-found') {
      return 'No account found with this email address. Please register a new account.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please verify and try again.';
    }
    if (code === 'auth/invalid-credential') {
      return 'Incorrect email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
      return `Domain (${currentHost}) is not authorized in Firebase Authentication.`;
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not enabled for project soy-retina-0n50x-87d1d. Please enable Email/Password in Firebase Console → Authentication → Sign-in method.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google sign-in popup was closed before completion. Please try again.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed sign-in attempts. For security, please try again in a few minutes or reset your password.';
    }
    return err?.message || 'An unexpected authentication error occurred. Please try again.';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRawError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user) {
          // Update profile display name
          try {
            if (fullName.trim()) {
              await updateProfile(userCredential.user, { displayName: fullName.trim() });
            }
            // Save user profile to Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              displayName: fullName.trim(),
              email: email.trim(),
              role: 'admin',
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (profileErr: any) {
            console.warn('Profile/Firestore record sync warning:', profileErr?.message || profileErr);
          }

          setSuccessMsg('Account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            onLoginSuccess();
          }, 600);
        }
      } else if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', {
        code: err?.code,
        message: err?.message,
        error: err
      });
      setRawError({ code: err?.code, message: err?.message });
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRawError(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setError('Please enter your email address to reset your password.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Password reset link sent to ${email.trim()}. Please check your email inbox (and spam folder).`);
    } catch (err: any) {
      console.error('Firebase Auth Error (Password Reset):', {
        code: err?.code,
        message: err?.message,
        error: err
      });
      setRawError({ code: err?.code, message: err?.message });
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setRawError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Sync user to Firestore
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            displayName: result.user.displayName || 'Google User',
            email: result.user.email,
            role: 'admin',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (syncErr: any) {
          console.warn('Google user Firestore sync warning:', syncErr?.message || syncErr);
        }

        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Firebase Auth Error (Google Login):', {
        code: err?.code,
        message: err?.message,
        error: err
      });
      setRawError({ code: err?.code, message: err?.message });
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full border border-[#ebefeb]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#072417] text-[#ffdcbd] rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-md">
            🌿
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot-password' && 'Reset Password'}
          </h1>
          <p className="text-xs text-[#62776c] mt-1">
            {mode === 'signin' && 'Sign in to access PRAKRITI SOAP Admin Console'}
            {mode === 'signup' && 'Register to manage Ayurvedic soaps, stock, and orders'}
            {mode === 'forgot-password' && 'Enter your registered email to receive a recovery link'}
          </p>
        </div>

        {/* Mode Selector Tabs (Sign In / Sign Up) */}
        {mode !== 'forgot-password' && (
          <div className="flex bg-[#f4f3ef] p-1 rounded-xl mb-6 text-xs font-semibold text-[#072417]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === 'signin' 
                  ? 'bg-white shadow-xs text-[#072417]' 
                  : 'text-[#62776c] hover:text-[#072417]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === 'signup' 
                  ? 'bg-white shadow-xs text-[#072417]' 
                  : 'text-[#62776c] hover:text-[#072417]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert with Real Firebase Debug Output */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200 text-red-800 text-xs rounded-xl space-y-2 leading-relaxed shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Authentication Message</span>
                <span>{error}</span>
              </div>
            </div>
            {rawError && (rawError.code || rawError.message) && (
              <div className="mt-2 pt-2 border-t border-red-200/70 font-mono text-[11px] text-red-950 space-y-0.5 bg-red-100/60 p-2 rounded-lg break-all">
                {rawError.code && (
                  <div>
                    <span className="font-semibold opacity-75">error.code: </span>
                    <span className="font-bold text-red-900">{rawError.code}</span>
                  </div>
                )}
                {rawError.message && (
                  <div>
                    <span className="font-semibold opacity-75">error.message: </span>
                    <span>{rawError.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-start gap-2.5 font-medium shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Sign In & Sign Up Form */}
        {mode !== 'forgot-password' ? (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Full Name for Sign Up */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#85a490] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Priya Parmar"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417] text-[#072417]"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#85a490] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@prakritisoap.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417] text-[#072417]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-[#4c6455] hover:text-[#072417] underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#85a490] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417] text-[#072417]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85a490] hover:text-[#072417] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password for Sign Up */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#85a490] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417] text-[#072417]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85a490] hover:text-[#072417] p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-white rounded-xl font-semibold text-sm hover:bg-[#072417]/90 transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#072417] uppercase tracking-wider mb-1">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#85a490] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@prakritisoap.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#072417] text-[#072417]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#072417] text-white rounded-xl font-semibold text-sm hover:bg-[#072417]/90 transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending reset link...</span>
                </>
              ) : (
                'Send Password Reset Link'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-[#072417] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Divider & Google Auth */}
        {mode !== 'forgot-password' && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#ebefeb]"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white px-2 text-[#85a490] font-medium">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-white border border-[#d2dcd5] text-[#072417] rounded-xl font-semibold text-xs hover:bg-[#fbf9f6] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>
          </>
        )}

        {/* Back to store */}
        <div className="mt-6 pt-4 border-t border-[#ebefeb] text-center">
          <button 
            type="button"
            onClick={() => setCurrentView('home')}
            className="text-xs text-[#85a490] hover:text-[#072417] transition-colors font-medium cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
