import React, { useState } from 'react';
import { ViewState, SoapProduct, WebsiteSettings } from '../types';
import { SOAPS_DATA } from '../data/soaps';

interface HomeViewProps {
  setCurrentView: (view: ViewState) => void;
  setSelectedSoap: (soap: SoapProduct) => void;
  addToCart: (soap: SoapProduct) => void;
  products?: SoapProduct[];
  settings?: WebsiteSettings;
}

export const HomeView: React.FC<HomeViewProps> = ({ setCurrentView, setSelectedSoap, addToCart, products = SOAPS_DATA, settings }) => {
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [selectedGoalSoap, setSelectedGoalSoap] = useState<string | null>(null);

  const handleQuickAdd = (soap: SoapProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soap.stockStatus === 'Out of Stock') return;
    addToCart(soap);
    setAddedToast(`${soap.name} added to bag!`);
    setTimeout(() => setAddedToast(null), 2000);
  };

  const activeProducts = products.filter(p => p.isActive !== false);
  const carouselSoaps = activeProducts.slice(0, 4);

  const heroTitle = settings?.heroTitle || 'Pure Ayurvedic Soaps Crafted for Living Harmony';
  const heroSubtitle = settings?.heroSubtitle || 'Ethically harvested wild botanicals and cold-pressed cold-process oils from Akola, Maharashtra.';
  const heroImage = settings?.heroImage || SOAPS_DATA[0].image;
  const promoBanner = settings?.promoBanner || 'Artisanal Apothecary Batch #048 Live';

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Top Botanical Announcement Pill */}
      <section className="px-4 pt-2 pb-3 flex justify-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#cbe6d4] text-[#344c3e] shadow-sm">
          <span className="material-symbols-outlined text-[15px] text-[#072417]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">{promoBanner}</span>
        </div>
      </section>

      {/* 1. HERO SECTION */}
      <section className="px-4 pb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-center items-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Sacred Vedic Formulations</span>
          <h1 className="font-['Playfair_Display'] text-[32px] sm:text-4xl text-[#072417] leading-tight font-semibold max-w-lg">
            {heroTitle}
          </h1>
          <p className="text-[14px] text-[#424843] max-w-xs mt-1">
            {heroSubtitle}
          </p>
        </div>

        {/* Product Showcase Card */}
        <div 
          onClick={() => { setSelectedSoap(activeProducts[0] || SOAPS_DATA[0]); setCurrentView('product-detail'); }}
          className="relative w-full rounded-2xl overflow-hidden bg-[#f5f3f0] shadow-sm cursor-pointer group"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <img 
              alt="PRAKRITI Signature Handcrafted Soap" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              src={heroImage} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a2b]/70 via-transparent to-transparent"></div>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#4c6455] animate-pulse"></span>
              <span className="text-[10px] text-[#072417] uppercase font-bold tracking-wider">Featured Botanical</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#ffdcbd] font-bold tracking-widest uppercase">Cured for 28 Days</span>
                <span className="font-['Playfair_Display'] text-xl font-semibold leading-tight">{activeProducts[0]?.name || 'Prakriti Neem Soap'}</span>
              </div>
              <div className="bg-[#ffdcbd] text-[#2c1600] font-['Playfair_Display'] text-xl font-bold px-3 py-1 rounded-xl shadow-sm">
                ₹{activeProducts[0]?.price || 155}
              </div>
            </div>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <button 
            onClick={() => setCurrentView('shop')}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-[#1e3a2b] text-white shadow-sm active:scale-[0.98] transition-all font-semibold text-sm"
          >
            <span>Shop Soaps</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button 
            onClick={() => setCurrentView('find-my-soap')}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-[#efeeeb] text-[#072417] hover:bg-[#e4e2df] transition-colors active:scale-[0.98] font-semibold text-sm"
          >
            <span>Find My Soap</span>
            <span className="text-[16px]">🧼</span>
          </button>
        </div>

        {/* Trust Band Highlights */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-[#f5f3f0] rounded-xl text-center">
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-[#4c6455] text-[20px] mb-0.5">spa</span>
            <span className="text-[10px] text-[#1b1c1a] font-bold">100% Herbal</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-[#4c6455] text-[20px] mb-0.5">cyclone</span>
            <span className="text-[10px] text-[#1b1c1a] font-bold">Cold-Processed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-[#4c6455] text-[20px] mb-0.5">palette</span>
            <span className="text-[10px] text-[#1b1c1a] font-bold">Artisanal Batch</span>
          </div>
        </div>
      </section>

      {/* 2. SECTION: DISCOVER OUR SOAPS CAROUSEL */}
      <section className="flex flex-col gap-3 pb-10">
        <div className="px-4 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Apothecary Dispensary</span>
            <h2 className="font-['Playfair_Display'] text-[30px] text-[#072417] leading-tight font-semibold">Discover Our Soaps</h2>
            <p className="text-xs text-[#424843]">Natural care, handcrafted with purpose.</p>
          </div>
          <span className="text-[11px] font-bold tracking-wider px-2.5 py-1 rounded bg-[#072417] text-white">
            4 Rituals
          </span>
        </div>

        {/* Horizontal Swipe Carousel */}
        <div className="flex gap-4 overflow-x-auto px-4 py-2 scroll-smooth no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {carouselSoaps.map((soap) => (
            <article 
              key={soap.id}
              onClick={() => { setSelectedSoap(soap); setCurrentView('product-detail'); }}
              className="flex-shrink-0 w-[270px] bg-[#ffffff] rounded-2xl p-3 shadow-[0_4px_20px_-2px_rgba(30,58,43,0.06)] flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex flex-col gap-2">
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#f5f3f0]">
                  <img 
                    alt={soap.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    src={soap.image} 
                  />
                  {soap.badge && (
                    <span className="absolute top-2 left-2 bg-[#072417] text-white px-2 py-0.5 rounded-full text-[9px] tracking-widest font-bold">
                      {soap.badge}
                    </span>
                  )}
                  <div className="absolute bottom-2 left-2 bg-[#cee9d6] text-[#082014] px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4c6455]"></span>
                    {soap.stockStatus}
                  </div>
                  <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-[#1b1c1a] text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    100g
                  </span>
                </div>
                <div className="flex flex-col pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#072417]">{soap.name}</h3>
                    <span className="font-['Playfair_Display'] text-lg font-bold text-[#072417]">₹{soap.price}</span>
                  </div>
                  <p className="text-xs text-[#424843] line-clamp-2 mt-1">
                    {soap.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-[#efeeeb]">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleQuickAdd(soap, e)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1e3a2b] text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    <span>Add to Bag</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedSoap(soap); setCurrentView('product-detail'); }}
                    className="w-10 h-10 rounded-xl bg-[#efeeeb] flex items-center justify-center text-[#072417] hover:bg-[#e4e2df]"
                    aria-label="View Details"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>
                <button 
                  onClick={() => { setSelectedSoap(soap); setCurrentView('product-detail'); }}
                  className="w-full text-center py-1 text-[11px] font-bold text-[#4c6455] uppercase tracking-widest hover:text-[#072417] transition-colors"
                >
                  View Details &amp; Ritual
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. PROMOTIONAL FEATURE BANNER: SIGNATURE NEEM */}
      <section className="px-4 pb-10">
        <div className="bg-[#1e3a2b] text-[#fbf9f6] rounded-2xl p-6 relative overflow-hidden shadow-md">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#4c6455]/30 blur-2xl pointer-events-none"></div>
          <div className="flex flex-col gap-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[#ffdcbd] w-fit">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">Master Herbalist Craft</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-['Playfair_Display'] text-2xl font-semibold text-white">Meet Our Signature Neem Soap</h3>
              <p className="text-xs text-[#85a490] leading-relaxed">
                Handcrafted in small batches using sun-dried neem leaves and cold-pressed botanical oils from Akola. Formulated through traditional slow-saponification to protect active plant enzymes.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between mt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#ffdcbd] uppercase font-bold tracking-wider">Introductory Special</span>
                <span className="font-['Playfair_Display'] text-lg font-bold text-white">Pack of 3 at ₹269</span>
                <span className="text-[11px] text-[#85a490]">Save ₹28 • Free Delivery</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#ffdcbd] text-[#2c1600] flex items-center justify-center font-bold font-['Playfair_Display'] text-lg shadow-sm">
                -10%
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a 
                className="flex-1 py-3 px-4 rounded-xl bg-[#ffdcbd] text-[#2c1600] text-sm font-bold text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                href="https://wa.me/919579408654?text=Hi%20Prakriti%20Soap,%20I%20want%20to%20order%20the%20Neem%20Pack%20of%203%20Offer%20(₹269)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Claim Pack Offer</span>
                <span className="material-symbols-outlined text-[18px]">east</span>
              </a>
              <button 
                onClick={() => setCurrentView('shop')}
                className="py-3 px-4 rounded-xl bg-white/15 text-white text-sm font-semibold text-center hover:bg-white/20 transition-all"
              >
                Explore Shop
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SKIN RECOMMENDATION TEASER (QUIZ INTERACTION) */}
      <section className="px-4 pb-10">
        <div className="bg-[#efeeeb] rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Ayurvedic Prakriti Diagnostic</span>
              <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417] mt-1">Not Sure Which Soap Is Right for You?</h3>
              <p className="text-xs text-[#424843] mt-1">
                Every skin has a distinct natural dosha constitution. Find the sacred botanicals that harmonise your barrier.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#cee9d6] text-[#082014] flex items-center justify-center flex-shrink-0 text-2xl">
              🌿
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white p-3 rounded-xl">
            <span className="text-[11px] font-bold text-[#1b1c1a] uppercase tracking-wider">Select Your Primary Skin Goal:</span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { name: 'Neem', label: 'Acne & Pores', icon: '🍃' },
                { name: 'Aloe Vera', label: 'Dry & Sensitive', icon: '💧' },
                { name: 'Sandalwood', label: 'Glow & Tan', icon: '✨' },
                { name: 'Rose', label: 'Daily Softness', icon: '🌸' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setSelectedGoalSoap(item.label)}
                  className={`py-2 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition-all font-semibold ${
                    selectedGoalSoap === item.label ? 'bg-[#072417] text-white' : 'bg-[#fbf9f6] text-[#1b1c1a] hover:bg-[#efeeeb]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>

            {selectedGoalSoap && (
              <div className="mt-2 p-2.5 rounded-lg bg-[#cbe6d4] text-[#506859] text-xs flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Recommended Ritual for <strong>{selectedGoalSoap}</strong> ✨</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => setCurrentView('find-my-soap')}
            className="py-3.5 px-4 rounded-xl bg-[#072417] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <span>Take 30-Second Skin Ritual Quiz</span>
            <span className="text-[18px]">🧼</span>
          </button>
        </div>
      </section>

      {/* 5. WHY CHOOSE PRAKRITI? (TRUST CARDS) */}
      <section className="px-4 pb-10">
        <div className="flex flex-col gap-1 text-center items-center pb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Our Conscious Promise</span>
          <h2 className="font-['Playfair_Display'] text-[30px] font-semibold text-[#072417]">Why Choose Prakriti?</h2>
          <p className="text-xs text-[#424843] max-w-xs">
            Crafted without compromise in our Akola studio kitchen.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: '🌿', title: '100% Natural Ingredients', desc: 'Zero SLS, zero parabens, and no synthetic perfumes. Clean cold-pressed botanicals and unrefined virgin coconut oil.' },
            { icon: '🧼', title: 'Small-Batch Handmade', desc: 'Cured patiently for 28 days to retain natural vegetable glycerin, yielding rich dense lather that protects skin hydration.' },
            { icon: '📍', title: 'Freshly Made in Akola', desc: 'Sourced right from local Vidarbha flora. Fresh seasonal botanicals processed directly while their herbal prana is intact.' },
            { icon: '💬', title: 'Seamless WhatsApp Ordering', desc: 'Speak directly with our artisan maker. Customize your gift hampers and receive fast doorstep dispatch updates.' },
          ].map((card, i) => (
            <div key={i} className="p-4 rounded-2xl bg-[#f5f3f0] flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#cee9d6] text-[#082014] flex items-center justify-center text-2xl flex-shrink-0">
                {card.icon}
              </div>
              <div className="flex flex-col">
                <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#072417]">{card.title}</h3>
                <p className="text-xs text-[#424843] mt-1 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. VERBATIM CONTACT & STORE LOCATION CARD */}
      <section className="px-4 pb-4">
        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(30,58,43,0.08)] flex flex-col gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#4c6455]">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">Studio Dispensary &amp; Orders</span>
            </div>
            <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417] mt-1">Visit Us or Connect Directly</h3>
            <p className="text-xs text-[#424843] mt-0.5">
              Order online or drop by our studio workshop in Old City Akola.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <a className="p-3 rounded-xl bg-[#f5f3f0] flex items-center justify-between active:bg-[#efeeeb]" href="tel:+919579408654">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#cbe6d4] text-[#506859] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4c6455]">Phone &amp; Order Helpline</span>
                  <span className="text-base font-bold text-[#072417]">+91 95794 08654</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#4c6455] text-[20px]">chevron_right</span>
            </a>

            <div className="p-3 rounded-xl bg-[#f5f3f0] flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#cbe6d4] text-[#506859] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4c6455]">Workshop &amp; Pick-up Address</span>
                <p className="text-sm font-medium text-[#1b1c1a] leading-snug mt-0.5">
                  Kala Maroti Road, Old City, Ambika Tailor, Akola
                </p>
                <span className="text-xs text-[#424843] mt-1">Maharashtra 444002</span>
              </div>
            </div>
          </div>

          <a 
            className="w-full py-3.5 px-4 rounded-xl bg-[#4c6455] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center"
            href="https://wa.me/919579408654?text=Namaste%20Prakriti%20Soap,%20I%20would%20like%20to%20place%20an%20order%20for%20handcrafted%20soaps."
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span>Order Directly on WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#072417] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#ffdcbd]">eco</span>
          <span>{addedToast}</span>
        </div>
      )}
    </div>
  );
};
