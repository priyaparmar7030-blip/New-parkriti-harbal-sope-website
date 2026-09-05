import React, { useState } from 'react';
import { ViewState, SoapProduct } from '../types';
import { SOAPS_DATA } from '../data/soaps';

interface ShopViewProps {
  setCurrentView: (view: ViewState) => void;
  setSelectedSoap: (soap: SoapProduct) => void;
  addToCart: (soap: SoapProduct) => void;
  products?: SoapProduct[];
}

export const ShopView: React.FC<ShopViewProps> = ({ setCurrentView, setSelectedSoap, addToCart, products = SOAPS_DATA }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Soaps', icon: '🌿' },
    { id: 'oily', label: 'Oily Skin' },
    { id: 'dry', label: 'Dry Skin' },
    { id: 'daily', label: 'Daily Care' },
    { id: 'sensitive', label: 'Sensitive' },
    { id: 'under100', label: 'Under ₹100' },
  ];

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = (soap: SoapProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soap.stockStatus === 'Out of Stock') return;
    addToCart(soap);
    setToastMessage(`${soap.name} added to your sacred bath ritual!`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Filter & Sort
  const filteredSoaps = products.filter(soap => {
    if (soap.isActive === false) return false;
    const matchesCategory = activeCategory === 'all' || soap.tags?.includes(activeCategory);
    const matchesSearch = searchQuery.trim() === '' || 
      soap.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      soap.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedSoaps = [...filteredSoaps].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return 0; // featured/default
  });

  return (
    <div className="flex flex-col w-full pb-8">
      {/* SEARCH & QUICK DISCOVERY */}
      <section className="px-4 pt-2 pb-3 flex flex-col gap-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4c6455] text-[20px]">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search natural soaps, doshas, herbs..." 
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#efeeeb] text-[#1b1c1a] placeholder:text-[#424843]/70 text-sm outline-none focus:bg-white focus:shadow-md transition-all shadow-sm font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#e4e2df] flex items-center justify-center text-[#424843]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* HORIZONTAL SCROLLABLE CATEGORY PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-sm ${
                  isActive 
                    ? 'bg-[#072417] text-white' 
                    : 'bg-[#efeeeb] text-[#424843] hover:bg-[#e4e2df]'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SORT BAR & CATALOG SUMMARY */}
      <section className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4c6455]"></span>
          <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-wider">
            Showing {sortedSoaps.length} Artisanal Soap{sortedSoaps.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="relative">
          <div className="flex items-center gap-1 bg-[#f5f3f0] px-3 py-1.5 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-[#4c6455]">tune</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-[#1b1c1a] uppercase tracking-wider outline-none cursor-pointer pr-1"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* APOTHECARY PRODUCT CATALOG GRID */}
      <section className="px-4 grid grid-cols-2 gap-3 pb-8">
        {sortedSoaps.map((soap) => {
          const isOut = soap.stockStatus === 'Out of Stock';
          const isFav = favorites[soap.id];
          return (
            <article 
              key={soap.id}
              onClick={() => { setSelectedSoap(soap); setCurrentView('product-detail'); }}
              className={`product-card flex flex-col bg-[#f5f3f0] rounded-2xl p-2.5 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer group ${isOut ? 'opacity-80' : ''}`}
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#efeeeb]">
                <img 
                  alt={soap.name} 
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isOut ? 'grayscale-[30%]' : ''}`} 
                  src={soap.image} 
                />
                {soap.badge && (
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm ${
                    soap.badge === 'SOLD OUT' ? 'bg-[#dbdad7] text-[#424843]' :
                    soap.badge === 'POPULAR' ? 'bg-[#4d2d07] text-[#ffdcbd]' :
                    'bg-[#072417] text-white'
                  }`}>
                    {soap.badge}
                  </span>
                )}
                <button 
                  aria-label={`Favorite ${soap.name}`} 
                  onClick={(e) => toggleFavorite(soap.id, e)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#072417] hover:bg-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]" style={isFav ? { fontVariationSettings: "'FILL' 1", color: '#ba1a1a' } : {}}>
                    favorite
                  </span>
                </button>
              </div>

              <div className="flex flex-col p-1 pt-2 flex-1 justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between text-[#4c6455]">
                    <span className="text-[10px] uppercase tracking-wider font-bold">{soap.weight}</span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isOut ? 'text-[#ba1a1a]' : 'text-[#4c6455]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-[#ba1a1a]' : 'bg-[#4c6455]'}`}></span> 
                      {soap.stockStatus}
                    </span>
                  </div>
                  <h2 className="font-['Playfair_Display'] text-[16px] leading-tight text-[#072417] mt-1 font-semibold">{soap.name}</h2>
                  <p className="text-[11px] text-[#424843] line-clamp-1 mt-0.5">{soap.subtitle}</p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-['Playfair_Display'] text-lg font-bold text-[#072417]">₹{soap.price}</span>
                      {soap.originalPrice && (
                        <span className="text-[11px] text-[#727973] line-through">₹{soap.originalPrice}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#4d2d07] font-bold">★ {soap.rating}</span>
                  </div>

                  {isOut ? (
                    <button disabled className="w-full py-2 bg-[#efeeeb] text-[#727973] rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-not-allowed">
                      <span className="material-symbols-outlined text-[16px]">notifications</span>
                      <span>Notify Restock</span>
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => handleAdd(soap, e)}
                      className="w-full py-2 bg-[#072417] hover:bg-[#1e3a2b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                      <span>Add to Bag</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* QUICK BENEFITS BAR (PLEDGE OF PURITY) */}
      <section className="mx-4 mb-4 p-4 rounded-2xl bg-[#cbe6d4]/40 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center gap-2 text-[#072417] font-bold">
          <span className="material-symbols-outlined text-[20px] text-[#4c6455]">verified_user</span>
          <span className="text-sm tracking-wide uppercase font-bold">Prakriti Purity Promise</span>
        </div>
        <p className="text-xs text-[#506859] leading-relaxed">
          100% Biodegradable <span className="opacity-40">•</span> Plastic-Free Packaging <span className="opacity-40">•</span> Cold-pressed in small batches.
        </p>
        <div className="pt-1 flex items-center justify-between">
          <a 
            className="inline-flex items-center gap-1 text-[#072417] text-[11px] tracking-wider uppercase font-bold hover:underline"
            href="https://wa.me/919579408654?text=Hello%20Prakriti%20Soap,%20I%20need%20help%20choosing%20the%20right%20soap"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>WhatsApp Assistance (+91 95794 08654)</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#072417] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#ffdcbd]">eco</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
