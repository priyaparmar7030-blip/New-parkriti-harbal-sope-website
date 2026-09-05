import React from 'react';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, cartCount }) => {
  const navItems = [
    { id: 'home' as ViewState, label: 'Home', icon: 'spa' },
    { id: 'shop' as ViewState, label: 'Shop', icon: 'storefront' },
    { id: 'find-my-soap' as ViewState, label: 'Find Soap', icon: 'psychology_alt' },
    { id: 'bag' as ViewState, label: `Bag (${cartCount})`, icon: 'local_mall', badge: cartCount },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#fbf9f6]/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,58,43,0.06)] border-t border-[#efeeeb]">
      <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] h-14 transition-colors ${
                isActive ? 'text-[#072417] font-bold' : 'text-[#424843] hover:text-[#072417]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                {item.id === 'bag' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#f0bd8b] text-[#2c1600] text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
