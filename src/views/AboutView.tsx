import React from 'react';
import { ViewState } from '../types';

interface AboutViewProps {
  setCurrentView: (view: ViewState) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setCurrentView }) => {
  return (
    <div className="flex flex-col w-full pb-12 px-4 gap-6">
      <div className="pt-2">
        <button 
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c6455] hover:text-[#072417] transition-colors bg-[#efeeeb] px-3 py-1.5 rounded-full"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Home</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 text-center items-center pb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Our Sacred Heritage</span>
        <h1 className="font-['Playfair_Display'] text-[32px] text-[#072417] leading-tight font-semibold">
          The Prakriti Soap Story
        </h1>
        <p className="text-sm text-[#424843] max-w-sm leading-relaxed">
          Rooted in classical Ayurvedic wisdom and crafted with uncompromised botanical purity in Old City, Akola.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden bg-[#f5f3f0] shadow-sm">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img 
            alt="Prakriti soap workshop in Akola" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrt0k2BcBwZxqYbLe2jc-ujuQJkq2-Y19VXEFOUJRGrK97whP5PtVhDFc-b2YJ8mVrVC68c9s1Imp3C1VXVvsjLS4LR750c3tLpU-cgVErU2sa96xa2X-FeHUMre7UniI9RT5htiJXEHdd2fWLYRDXNukZnzRJ5cWeJuXSVwScS2OOpNQJzR-36yqcdoXNqrTWNbKIEGdX8Vnh1Hc_9xe1C57XDBSjCmoGALBEFBBEoU4g_wTMToo" 
          />
        </div>
        <div className="p-6 flex flex-col gap-4">
          <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417]">28 Days Curing Tradition</h3>
          <p className="text-xs text-[#424843] leading-relaxed">
            Every bar of Prakriti Soap undergoes a patient 28-day cold-process curing cycle in our Akola studio kitchen. This preserves natural vegetable glycerin and plant enzymes without resorting to industrial accelerators or synthetic lathering agents.
          </p>
          <p className="text-xs text-[#424843] leading-relaxed">
            Sourced directly from local Vidarbha flora—from wild-harvested neem leaves to pure Mysore sandalwood and unrefined virgin coconut oil—our soaps are packaged in biodegradable, plastic-free materials to honour Mother Earth.
          </p>
        </div>
      </div>

      <div className="bg-[#1e3a2b] text-white rounded-2xl p-6 flex flex-col gap-4 shadow-md">
        <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#ffdcbd]">Visit Our Workshop</h3>
        <p className="text-xs text-[#85a490] leading-relaxed">
          Kala Maroti Road, Old City, Ambika Tailor, Akola, Maharashtra 444002.
        </p>
        <a 
          className="w-full py-3 px-4 rounded-xl bg-[#ffdcbd] text-[#2c1600] font-bold text-xs flex items-center justify-center gap-2 shadow-sm text-center"
          href="https://wa.me/919579408654?text=Hello%20Prakriti%20Soap,%20I%20would%20like%20to%20visit%20the%20Akola%20studio."
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Chat with Maker on WhatsApp</span>
        </a>
      </div>
    </div>
  );
};
