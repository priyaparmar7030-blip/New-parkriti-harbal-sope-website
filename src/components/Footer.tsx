import React from 'react';
import { ViewState } from '../types';

interface FooterProps {
  setCurrentView: (view: ViewState) => void;
  phoneNumber?: string;
  whatsappNumber?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  setCurrentView, 
  phoneNumber = '+91 95794 08654', 
  whatsappNumber = '919579408654', 
  address = 'Kala Maroti Road, Old City, Ambika Tailor, Akola, Maharashtra 444002',
  instagram = 'https://instagram.com/prakritisoap',
  facebook = 'https://facebook.com/prakritisoap'
}) => {
  const cleanPhone = phoneNumber.replace(/\s+/g, '');
  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello%20Prakriti%20Soap,%20I%20need%20ritual%20support.`;

  return (
    <footer className="bg-[#1e3a2b] text-[#f5f3f0] px-4 pt-12 pb-10 mt-12">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <span className="font-['Playfair_Display'] text-2xl text-[#fbf9f6] tracking-tight font-semibold">PRAKRITI SOAP</span>
          <p className="text-xs text-[#85a490] max-w-sm leading-relaxed">
            Handcrafted with classical Ayurvedic wisdom and organic botanical purities. Ethically harvested, free from parabens, synthetic fragrances, and harsh chemicals.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-xs text-[#e4e2df]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffdcbd] text-[18px]">call</span>
            <a className="hover:text-[#fbf9f6] transition-colors font-medium" href={`tel:${cleanPhone}`}>{phoneNumber}</a>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#ffdcbd] text-[18px] mt-0.5">location_on</span>
            <span className="leading-relaxed">{address}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <a 
            className="flex items-center gap-2 bg-[#4c6455] px-4 py-2 rounded-xl text-xs font-semibold text-white hover:bg-[#4c6455]/90 transition-all shadow-sm"
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>WhatsApp Ritual Support</span>
          </a>
          {instagram && (
            <a 
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-[#fbf9f6] hover:bg-white/20 transition-colors"
            >
              Instagram ↗
            </a>
          )}
          {facebook && (
            <a 
              href={facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-[#fbf9f6] hover:bg-white/20 transition-colors"
            >
              Facebook ↗
            </a>
          )}
          <button 
            onClick={() => setCurrentView('about')}
            aria-label="About Studio" 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 text-[#fbf9f6] hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">spa</span>
          </button>
          <button 
            onClick={() => setCurrentView('shop')}
            aria-label="Explore Shop" 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 text-[#fbf9f6] hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </button>
        </div>

        <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold tracking-wider text-[#85a490]">
          <p>© 2024 PRAKRITI SOAP. Sacred Botanicals.</p>
          <button 
            onClick={() => setCurrentView('admin-login')} 
            aria-label="Staff Portal / Admin Login" 
            className="w-11 h-11 flex items-center justify-end text-[#85a490]/70 hover:text-white transition-colors"
          >
            <span className="text-[14px]" style={{ height: '89px' }}>🧼</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
