import React, { useState } from 'react';
import { ViewState, SoapProduct } from '../types';

interface ProductDetailViewProps {
  product: SoapProduct;
  setCurrentView: (view: ViewState) => void;
  addToCart: (soap: SoapProduct) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ product, setCurrentView, addToCart }) => {
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-12 px-4 gap-6">
      {/* Back button */}
      <div className="pt-2">
        <button 
          onClick={() => setCurrentView('shop')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c6455] hover:text-[#072417] transition-colors bg-[#efeeeb] px-3 py-1.5 rounded-full"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Apothecary Shop</span>
        </button>
      </div>

      {/* Hero Product Image Card */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#efeeeb] shadow-md">
        <img 
          alt={product.name} 
          className="w-full h-full object-cover" 
          src={product.image} 
        />
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#072417] text-white px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest shadow-sm">
            {product.badge}
          </span>
        )}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
          <span className="text-[11px] font-bold text-[#072417] tracking-wider uppercase">Cold-Pressed Herbal Blend</span>
        </div>
      </div>

      {/* Details Header */}
      <div className="flex flex-col gap-2 bg-[#f5f3f0] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-wider">{product.weight}</span>
          <span className="text-[11px] font-bold text-[#4c6455] flex items-center gap-1 bg-[#cee9d6] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4c6455]"></span> {product.stockStatus}
          </span>
        </div>
        <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#072417]">{product.name}</h1>
        <p className="text-sm text-[#424843] leading-relaxed">{product.description}</p>

        <div className="flex items-baseline justify-between pt-2 border-t border-[#efeeeb]">
          <div className="flex items-baseline gap-2">
            <span className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">₹{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-[#727973] line-through">₹{product.originalPrice}</span>
            )}
            <span className="text-xs text-[#424843]">/ 100g bar</span>
          </div>
          <span className="text-xs font-bold text-[#4d2d07] bg-[#ffdcbd] px-2.5 py-1 rounded-full">★ {product.rating} Rating</span>
        </div>
      </div>

      {/* Botanical Benefits */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest">Botanical Benefits</span>
        <div className="grid grid-cols-1 gap-2">
          {product.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3f0] text-[#424843] text-sm">
              <span className="material-symbols-outlined text-[#072417] text-[20px]">check_circle</span>
              <span className="font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ayurvedic Medical Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-[#efeeeb] flex items-start gap-3">
        <span className="material-symbols-outlined text-[#4c6455] text-[20px] mt-0.5">info</span>
        <p className="text-xs text-[#424843] leading-snug">
          <strong className="font-semibold text-[#072417]">Ayurvedic Skincare Note:</strong> Safe skincare recommendation based on traditional botanical ingredients. Not a medical treatment.
        </p>
      </div>

      {/* Action CTAs */}
      <div className="flex flex-col gap-3 pt-2">
        <button 
          onClick={handleAddToCart}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            added ? 'bg-[#4c6455] text-white' : 'bg-[#072417] text-white hover:bg-[#1e3a2b]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{added ? 'done' : 'shopping_bag'}</span>
          <span>{added ? 'Added to Bag!' : `Add to Bag (₹${product.price})`}</span>
        </button>

        <a 
          className="w-full py-3.5 px-6 rounded-xl bg-[#4c6455] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#4c6455]/90 transition-colors text-center shadow-sm"
          href={`https://wa.me/919579408654?text=Hello%20PRAKRITI,%20I%20would%20like%20to%20order%20the%20${encodeURIComponent(product.name)}%20(₹${product.price}).`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Order Instantly on WhatsApp</span>
        </a>

        <button 
          onClick={() => setCurrentView('find-my-soap')}
          className="w-full py-2.5 text-center text-xs font-bold text-[#4c6455] hover:text-[#072417] transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Retake Skin Diagnostic Quiz</span>
        </button>
      </div>
    </div>
  );
};
