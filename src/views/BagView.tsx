import React, { useState } from 'react';
import { ViewState, CartItem, SoapProduct } from '../types';

interface BagViewProps {
  cart: CartItem[];
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  setCurrentView: (view: ViewState) => void;
  setSelectedSoap: (soap: SoapProduct) => void;
  onCheckout?: (name: string, address: string) => void;
}

export const BagView: React.FC<BagViewProps> = ({ cart, updateQuantity, removeItem, setCurrentView, setSelectedSoap, onCheckout }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const total = subtotal; // Free delivery unlocked

  const whatsappMessage = [
    "Hello Prakriti Soap! 🌿",
    "I would like to order:",
    ...cart.map(item => `- ${item.quantity}x ${item.product.name} (${item.product.weight}) - ₹${item.product.price * item.quantity}`),
    `Total: ₹${total}`,
    `Delivery to: ${customerName || '[Customer Name]'}, ${customerAddress || '[Delivery Address in Akola or All-India]'}`
  ].join('\n');

  const whatsappUrl = `https://wa.me/919579408654?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex flex-col w-full pb-12 px-4 gap-6">
      {/* Free Shipping Celebration Toast / Banner */}
      <div className="w-full bg-[#cbe6d4] text-[#344c3e] rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#4c6455] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold truncate">Free shipping unlocked!</span>
            <span className="text-xs opacity-90 truncate">Handcrafted botanical care delivered free</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-[#072417] shrink-0 uppercase tracking-wider">Applied</span>
      </div>

      {/* Heading Bar */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#4c6455] tracking-widest uppercase">Sacred Cart</span>
          <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#072417]">Your Bag ({cart.reduce((s, i) => s + i.quantity, 0)} Items)</h1>
        </div>
        <span className="text-[11px] font-bold text-[#424843] bg-[#efeeeb] px-2.5 py-1 rounded-full">Akola Studio Fresh</span>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 bg-[#f5f3f0] rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#4c6455]">shopping_bag</span>
          <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417]">Your sacred bag is empty</h3>
          <p className="text-xs text-[#424843] max-w-xs">Discover our 100% natural cold-processed soaps and add your first botanical ritual.</p>
          <button 
            onClick={() => setCurrentView('shop')}
            className="mt-2 py-3 px-6 rounded-xl bg-[#072417] text-white text-xs font-bold shadow-sm"
          >
            Explore Artisanal Shop
          </button>
        </div>
      ) : (
        <>
          {/* Item List Section */}
          <div className="flex flex-col gap-3">
            {cart.map((item) => (
              <div key={item.product.id} className="w-full bg-[#ffffff] rounded-xl p-3 shadow-sm flex flex-col gap-2 transition-all">
                <div className="flex gap-3">
                  <div 
                    onClick={() => { setSelectedSoap(item.product); setCurrentView('product-detail'); }}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-[#efeeeb] shrink-0 relative cursor-pointer"
                  >
                    <img alt={item.product.name} className="w-full h-full object-cover" src={item.product.image} />
                    <span className="absolute bottom-1 left-1 bg-[#072417]/80 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {item.product.id === 'neem-soap' ? 'Neem' : 'Kesar'}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0 cursor-pointer" onClick={() => { setSelectedSoap(item.product); setCurrentView('product-detail'); }}>
                        <h2 className="font-['Playfair_Display'] text-base font-semibold text-[#072417] leading-tight truncate">{item.product.name}</h2>
                        <p className="text-xs text-[#424843]">{item.product.weight}</p>
                      </div>
                      <button 
                        onClick={() => removeItem(item.product.id)}
                        className="text-[#727973] hover:text-[#ba1a1a] transition-colors p-1 -mr-1"
                        aria-label="Remove item"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        {item.product.originalPrice && (
                          <span className="text-[#727973] line-through text-[11px] leading-tight">₹{item.product.originalPrice}</span>
                        )}
                        <span className="text-sm font-bold text-[#072417]">₹{item.product.price} <span className="text-[11px] font-normal text-[#4c6455]">/ bar</span></span>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center bg-[#efeeeb] rounded-lg p-0.5 shadow-inner">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#072417] active:scale-95 transition-transform font-bold"
                          aria-label="Decrease quantity"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-[#072417]">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#072417] active:scale-95 transition-transform font-bold"
                          aria-label="Increase quantity"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 mt-1 bg-[#f5f3f0] rounded-lg px-3 py-1 text-xs">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase">Batch: Cold-Processed</span>
                  <span className="font-bold text-[#072417]">Subtotal: ₹{item.product.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery & Customer Info Card */}
          <div className="bg-[#f5f3f0] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#072417]">
              <span className="material-symbols-outlined text-[20px]">pin_drop</span>
              <span className="text-xs font-bold uppercase tracking-wider">Delivery & Details</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Your Name (Optional)" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-lg text-xs outline-none border border-[#e4e2df] focus:border-[#072417]"
              />
              <input 
                type="text" 
                placeholder="Delivery Address / City (Akola or All-India)" 
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-lg text-xs outline-none border border-[#e4e2df] focus:border-[#072417]"
              />
            </div>
          </div>

          {/* Order Summary Breakdown */}
          <div className="w-full bg-[#ffffff] rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <span className="font-['Playfair_Display'] text-lg font-semibold text-[#072417]">Order Summary</span>
              <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-wider">Ayurvedic Purity</span>
            </div>
            <div className="flex flex-col gap-2 text-xs text-[#424843]">
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="text-sm font-semibold text-[#1b1c1a]">₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>Artisanal Handcraft Packaging</span>
                  <span className="material-symbols-outlined text-[16px] text-[#4c6455]">inventory_2</span>
                </span>
                <span className="text-xs font-bold text-[#072417] tracking-wide">FREE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>Delivery</span>
                  <span className="material-symbols-outlined text-[16px] text-[#4c6455]">local_shipping</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[#727973] line-through">₹60</span>
                  <span className="text-xs font-bold text-[#072417]">FREE</span>
                </div>
              </div>
            </div>
            <div className="bg-[#efeeeb] h-px w-full my-1"></div>
            <div className="flex justify-between items-baseline pt-1">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#072417]">Total Amount</span>
                <span className="text-[11px] text-[#424843]">Inclusive of all organic duties</span>
              </div>
              <span className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">₹{total}</span>
            </div>
          </div>

          {/* WhatsApp Direct Checkout Highlight Card */}
          <div className="w-full bg-[#1e3a2b] text-[#f5f3f0] rounded-2xl p-5 shadow-md flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#85a490]/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#ffdcbd] text-[24px]">energy_savings_leaf</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-['Playfair_Display'] text-lg font-semibold text-white leading-tight">Instant WhatsApp Checkout</h3>
                <p className="text-xs text-[#85a490]">No passwords, no gateway friction, direct maker touch</p>
              </div>
            </div>

            {/* Live WhatsApp Formatted Message Preview Card */}
            <div className="bg-white text-[#1b1c1a] rounded-xl p-3 shadow-inner flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse"></span>
                  <span className="text-[10px] font-bold text-[#4c6455] uppercase tracking-wider">Your Order is Ready to Send!</span>
                </div>
                <span className="text-[10px] text-[#424843]">Instant Link</span>
              </div>

              <div className="bg-[#f5f3f0] p-3 rounded-lg flex flex-col gap-1 text-xs text-[#072417] font-mono whitespace-pre-line leading-relaxed selection:bg-[#cbe6d4]">
                {whatsappMessage}
              </div>

              <div className="flex items-center gap-1.5 text-[#424843] text-[11px] pt-1">
                <span className="material-symbols-outlined text-[14px] text-[#4c6455]">verified_user</span>
                <span>Formatted WhatsApp message pre-filled for +91 95794 08654</span>
              </div>
            </div>

            {/* WhatsApp Action Button */}
            <a 
              className="w-full bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.98] text-[#072417] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg transition-all text-center"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (onCheckout) onCheckout(customerName, customerAddress);
              }}
            >
              <span className="material-symbols-outlined text-[22px]">chat</span>
              <span>Order on WhatsApp ↗</span>
            </a>

            <p className="text-[11px] text-[#85a490] text-center leading-snug">
              Your order details will be automatically pre-filled and sent to <span className="text-white font-medium">+91 95794 08654</span> for fast confirmation.
            </p>
          </div>

          {/* Reassurance Highlights */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-[#f5f3f0] p-3 rounded-xl flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#cbe6d4]/50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#4c6455] text-[16px]">water_drop</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#072417] uppercase truncate">100% Pure</span>
                <span className="text-[11px] text-[#424843] truncate">Chemical Free</span>
              </div>
            </div>
            <div className="bg-[#f5f3f0] p-3 rounded-xl flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#cbe6d4]/50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#4c6455] text-[16px]">inventory</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#072417] uppercase truncate">Plastic Free</span>
                <span className="text-[11px] text-[#424843] truncate">Zero-Waste Pack</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center pb-2">
            <button 
              onClick={() => setCurrentView('shop')}
              className="text-xs font-bold text-[#4c6455] hover:text-[#072417] flex items-center gap-1 py-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Add more artisanal soaps</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
