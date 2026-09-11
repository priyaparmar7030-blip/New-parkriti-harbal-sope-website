import React from 'react';
import { ViewState, CustomerUser } from '../types';
import brandLogo from '../assets/images/regenerated_image_1789116480918.png';

interface HeaderProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  cartCount: number;
  announcement?: string;
  currentUser: CustomerUser | null;
  onOpenAuth: () => void;
}

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'priyaparmar7030@gmail.com';

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, cartCount, announcement, currentUser, onOpenAuth }) => {
  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const getViewSubtitle = () => {
    switch (currentView) {
      case 'home': return 'Home';
      case 'shop': return 'Shop';
      case 'product-detail': return 'Ritual Detail';
      case 'find-my-soap': return 'Find My Soap';
      case 'bag': return 'Bag';
      case 'about': return 'About Us';
      case 'customer-account': return 'My Account';
      case 'admin-dashboard': return 'Owner Dashboard';
      default: return 'Sacred Botanicals';
    }
  };

  const tickerText = announcement || '🌿 NEW ARRIVAL — Discover our 100% Natural Handcrafted Neem Soap';

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#fbf9f6]/85 backdrop-blur-xl border-b border-[#ebefeb] shadow-[0_4px_20px_-2px_rgba(30,58,43,0.05)]">
      {/* Marquee Ticker */}
      <div className="bg-[#072417] text-[#ffdcbd] py-1 overflow-hidden whitespace-nowrap">
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
      <div className="h-16 px-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView(isOwner ? 'admin-dashboard' : 'home')}>
          <img 
            alt="PRAKRITI SOAP Brand Logo" 
            className="h-8 w-auto object-contain" 
            src={brandLogo} 
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
            className="w-11 h-11 flex items-center justify-center text-[#072417] rounded-full hover:bg-[#efeeeb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
          
          <button 
            aria-label="Customer Account / Owner Dashboard" 
            onClick={() => {
              if (currentUser) {
                setCurrentView(isOwner ? 'admin-dashboard' : 'customer-account');
              } else {
                onOpenAuth();
              }
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors cursor-pointer ${currentUser ? 'bg-[#072417] text-[#ffdcbd]' : 'text-[#072417] hover:bg-[#efeeeb]'}`}
            title={currentUser ? `Signed in as ${currentUser.fullName} (${isOwner ? 'Owner' : 'Customer'})` : 'Sign In / Register'}
          >
            <span className="material-symbols-outlined text-[22px]">{isOwner ? 'shield_person' : 'person'}</span>
          </button>

          <button 
            aria-label="Shopping Bag" 
            onClick={() => setCurrentView('bag')}
            className="w-11 h-11 relative flex items-center justify-center text-[#072417] rounded-full hover:bg-[#efeeeb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute top-2 right-2 bg-[#072417] text-[#ffdcbd] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
