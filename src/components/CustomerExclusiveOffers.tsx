import React, { useState, useEffect } from 'react';
import { CustomerUser, CustomerOffer } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface CustomerExclusiveOffersProps {
  currentUser: CustomerUser;
}

export const CustomerExclusiveOffers: React.FC<CustomerExclusiveOffersProps> = ({ currentUser }) => {
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const customerId = (currentUser.customerId || currentUser.id || '').toUpperCase();

  const loadOffers = async () => {
    if (!customerId) return;
    setIsLoading(true);

    try {
      // 1. Try server API
      const res = await fetch(`/api/customer-offers/${encodeURIComponent(customerId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.offers)) {
          setOffers(data.offers);
          setIsLoading(false);
          return;
        }
      }

      // 2. Client Firestore Fallback
      const snap = await getDocs(collection(db, 'customer_offers'));
      const directOffers: CustomerOffer[] = [];
      snap.forEach(d => {
        const off = d.data() as CustomerOffer;
        if (off.customerId && off.customerId.toUpperCase() === customerId) {
          directOffers.push({ ...off, id: off.id || d.id });
        }
      });
      setOffers(directOffers);
    } catch (err) {
      console.error('Error fetching customer exclusive offers:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [customerId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getOfferBadge = (type: string) => {
    switch (type) {
      case 'rupee_off':
        return { label: '₹ Cash Discount', bg: 'bg-[#ffdcbd] text-[#072417] border-[#e8c09e]' };
      case 'percent_off':
        return { label: '% Percentage Off', bg: 'bg-[#e2ede6] text-[#072417] border-[#cbe6d4]' };
      case 'free_soap':
        return { label: '🌿 Free Herbal Soap', bg: 'bg-[#cbe6d4] text-[#072417] border-[#a5d2b3]' };
      case 'free_shipping':
        return { label: '🚚 Free Shipping', bg: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]' };
      case 'gift':
        return { label: '🎁 Surprise Gift', bg: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]' };
      default:
        return { label: '✨ Exclusive Perk', bg: 'bg-[#f3f4f6] text-[#1f2937] border-[#e5e7eb]' };
    }
  };

  return (
    <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm mb-6 relative overflow-hidden">
      {/* Decorative botanical aura */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#ffdcbd]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebefeb] relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#ff8c42] text-[20px]">
              redeem
            </span>
            <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest">
              Personalized Patron Benefits
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417] flex items-center gap-2">
            🎁 My Exclusive Offers
          </h2>
          <p className="text-xs text-[#607769] mt-0.5">
            Special coupon codes, complimentary soaps, and private rewards assigned strictly to Customer ID{' '}
            <strong className="font-mono text-[#072417]">{customerId}</strong>.
          </p>
        </div>

        <button
          onClick={() => {
            setIsRefreshing(true);
            loadOffers();
          }}
          disabled={isRefreshing}
          className="self-start sm:self-center px-3 py-1.5 bg-[#f5f3f0] hover:bg-[#efeeeb] text-[#072417] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-[#e4e2df] disabled:opacity-50"
          title="Refresh exclusive offers"
        >
          <span className={`material-symbols-outlined text-[16px] text-[#4c6455] ${isRefreshing ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Offers'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="mt-5">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#607769] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span>Checking exclusive offers from Priya & the Studio...</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-6 text-center bg-[#fbf9f6] border border-dashed border-[#d2dcd5] rounded-xl">
            <div className="w-12 h-12 rounded-full bg-[#ffdcbd]/50 text-[#072417] mx-auto flex items-center justify-center text-xl mb-3">
              🎁
            </div>
            <h3 className="font-['Playfair_Display'] text-base font-bold text-[#072417]">
              No Active Exclusive Offers Right Now
            </h3>
            <p className="text-xs text-[#607769] mt-1 max-w-md mx-auto leading-relaxed">
              Personalized discounts, free soaps, and surprise rewards created specifically for your account will appear here. Continue collecting loyalty stamps with every artisanal soap bar!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => {
              const badge = getOfferBadge(offer.offerType);
              const isCopied = copiedCode === offer.discountCode;

              return (
                <div
                  key={offer.id}
                  className="bg-[#fcfaf7] border border-[#d2dcd5] rounded-xl p-5 relative flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Badge & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#e2ede6] text-[#072417]">
                        Active Offer
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#072417]">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-[#424843] mt-1 leading-relaxed">
                      {offer.description}
                    </p>
                  </div>

                  {/* Code Box & Expiry */}
                  <div className="mt-4 pt-3 border-t border-[#ebefeb] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm bg-white border border-[#072417] text-[#072417] px-3 py-1 rounded-lg tracking-wider">
                        {offer.discountCode}
                      </span>
                      <button
                        onClick={() => handleCopyCode(offer.discountCode)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                          isCopied
                            ? 'bg-[#2e7d32] text-white'
                            : 'bg-[#072417] text-[#ffdcbd] hover:bg-[#0c3623]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isCopied ? 'check' : 'content_copy'}
                        </span>
                        <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-[#607769]">
                      {offer.expiresAt ? (
                        <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-[#2e7d32] font-semibold">No Expiry • Active</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
