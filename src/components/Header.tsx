import React from 'react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  cartCount: number;
  announcement?: string;
  currentUser?: any;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, cartCount, announcement, currentUser }) => {
  const getViewSubtitle = () => {
    switch (currentView) {
      case 'home': return 'Home';
      case 'shop': return 'Shop';
      case 'product-detail': return 'Ritual Detail';
      case 'find-my-soap': return 'Find My Soap';
      case 'bag': return 'Bag';
      case 'about': return 'About Us';
      default: return 'Sacred Botanicals';
    }
  };

  const tickerText = announcement || '🌿 NEW ARRIVAL — Discover our 100% Natural Handcrafted Neem Soap';

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#fbf9f6]/85 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(30,58,43,0.05)]" style={{ borderColor: '#ebefeb', fontSize: '11px', lineHeight: '2px', height: '48.6667px' }}>
      {/* Marquee Ticker */}
      <div className="bg-[#072417] text-[#ffdcbd] py-1 overflow-hidden whitespace-nowrap" style={{ width: '850px', height: '33px' }}>
        <div className="animate-marquee flex items-center gap-4 font-bold text-[11px] tracking-widest uppercase font-['Plus_Jakarta_Sans']">
          <span className="flex items-center gap-1.5">{tickerText}</span>
          <span className="opacity-50">•</span>
          <span className="flex items-center gap-1.5"><span>📦</span> Free Delivery on Orders over ₹499</span>
          <span className="opacity-50">•</span>
          <span className="flex items-center gap-1.5">{tickerText}</span>
          <span className="opacity-50">•</span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
          <img 
            alt="PRAKRITI SOAP Brand Logo" 
            className="h-8 w-auto object-contain" 
            src="https://lh3.googleusercontent.com/aida/AEtjO1UyFEJsbr8lQ6a9_UjM9IcUCrMWuwkKwq0pRX5RrkKlcrhFmZsNRjMmJ3cdQtlhSBxXhY0LBytdNzbc1dgu3u7UpxOzVTZwYVV-wSnFfEob5T3zzU69vxOY2r5qwuo4U0oqC7ZZ7g9nWR0kLYD33e4KT0I55TYhg4XbvataSJJAA9j8jvxVkRkFEN2a4o7CWeBTc4g4tFEmfp9kVSEinEQu-SgNft0c1fleX70X_vVVsz36RH8UvLhg7Q" 
          />
          <div className="flex flex-col">
            <span className="font-['Playfair_Display'] text-[20px] font-semibold text-[#072417] leading-none tracking-tight">PRAKRITI</span>
            <span className="font-bold text-[11px] text-[#4c6455] uppercase tracking-widest">{getViewSubtitle()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            aria-label="Quick Search" 
            onClick={() => setCurrentView('shop')}
            className="w-11 h-11 flex items-center justify-center text-[#072417] rounded-full hover:bg-[#efeeeb] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
          <button 
            aria-label="Shopping Bag" 
            onClick={() => setCurrentView('bag')}
            className="w-11 h-11 relative flex items-center justify-center text-[#072417] rounded-full hover:bg-[#efeeeb] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-[#f0bd8b] text-[#2c1600] font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
          <button 
            aria-label="Account / Admin Portal"
            onClick={() => setCurrentView(currentUser ? 'admin-dashboard' : 'admin-login')}
            className={`w-8 h-8 rounded-full flex items-center justify-center ml-1 transition-opacity cursor-pointer ${currentUser ? 'bg-[#ffdcbd] text-[#072417] border border-[#d2dcd5]' : 'bg-[#072417] text-white hover:opacity-90'}`}
            title={currentUser ? `Signed in as ${currentUser.email || currentUser.displayName}` : 'Sign In / Register'}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
