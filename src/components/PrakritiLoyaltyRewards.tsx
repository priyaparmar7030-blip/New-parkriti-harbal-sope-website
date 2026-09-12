import React, { useState, useEffect } from 'react';
import { CustomerUser, Order } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

interface PrakritiLoyaltyRewardsProps {
  currentUser: CustomerUser;
  localOrders: Order[];
}

interface ContributingOrder {
  orderId: string;
  date: string;
  soapsCount: number;
  stampsEarned: number;
  total: number;
  status: string;
}

export function isOrderValidForLoyalty(order: any): boolean {
  if (!order) return false;
  const status = String(order.status || '').toLowerCase().trim();
  // Do not count cancelled, failed, or unpaid orders
  if (status.includes('cancel')) return false;
  if (status.includes('fail')) return false;
  if (status.includes('unpaid')) return false;
  if (status.includes('refund')) return false;

  const paymentStatus = String(order.paymentStatus || '').toLowerCase().trim();
  if (paymentStatus === 'unpaid' || paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    return false;
  }
  return true;
}

export function countOrderSoapQuantity(order: any): number {
  if (Array.isArray(order.quantities) && order.quantities.length > 0) {
    const sum = order.quantities.reduce((acc: number, q: any) => acc + (Number(q.quantity) || 0), 0);
    if (sum > 0) return sum;
  }
  if (typeof order.items === 'string') {
    const matches = order.items.match(/(\d+)\s*x/gi);
    if (matches && matches.length > 0) {
      return matches.reduce((acc: number, m: string) => {
        const num = parseInt(m, 10);
        return acc + (isNaN(num) ? 1 : num);
      }, 0);
    }
  }
  return 1;
}

export const PrakritiLoyaltyRewards: React.FC<PrakritiLoyaltyRewardsProps> = ({ currentUser, localOrders }) => {
  const [stamps, setStamps] = useState<number>(0);
  const [contributingOrders, setContributingOrders] = useState<ContributingOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [secretGiftRevealed, setSecretGiftRevealed] = useState<boolean>(false);
  const [revealedGiftDescription, setRevealedGiftDescription] = useState<string>('');
  const [rewardRedeemed, setRewardRedeemed] = useState<boolean>(false);
  const [redeemedAt, setRedeemedAt] = useState<string>('');

  const customerId = currentUser.customerId || currentUser.id;
  const target = 10;
  const isUnlocked = stamps >= target;
  const progressString = `${Math.min(stamps, target)}/${target}`;

  // Fetch and calculate loyalty progress from Firebase and local state
  const loadLoyaltyData = async () => {
    if (!customerId) return;
    setIsLoading(true);

    try {
      // 1. Try fetching from server loyalty API
      const res = await fetch(`/api/customer-loyalty/${encodeURIComponent(customerId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.loyalty) {
          setStamps(data.loyalty.stamps || 0);
          setContributingOrders(data.loyalty.contributingOrders || []);
          setLastSavedTime(data.loyalty.updatedAt || new Date().toISOString());
          setSecretGiftRevealed(!!data.loyalty.secretGiftRevealed);
          setRevealedGiftDescription(data.loyalty.revealedGiftDescription || '');
          setRewardRedeemed(!!data.loyalty.rewardRedeemed);
          setRedeemedAt(data.loyalty.redeemedAt || '');
          setIsLoading(false);
          return;
        }
      }

      // 2. Direct Firestore Client Fallback
      await calculateAndPersistLoyaltyLocally();
    } catch (e) {
      console.warn('Server loyalty fetch error, evaluating via Firestore direct:', e);
      await calculateAndPersistLoyaltyLocally();
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAndPersistLoyaltyLocally = async () => {
    try {
      const allOrdersMap = new Map<string, any>();

      // Fetch from Firestore orders collection
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        ordersSnap.forEach(d => {
          const ord = d.data();
          const ordId = ord.id || d.id;
          if (ordId) {
            allOrdersMap.set(ordId, { ...ord, id: ordId });
          }
        });
      } catch (err) {
        console.warn('Firestore orders collection read error:', err);
      }

      // Also merge any local orders
      if (Array.isArray(localOrders)) {
        for (const lo of localOrders) {
          if (lo.id && !allOrdersMap.has(lo.id)) {
            allOrdersMap.set(lo.id, lo);
          }
        }
      }

      const cleanCustomerId = customerId.toUpperCase();
      const cleanEmail = (currentUser.email || '').toLowerCase().trim();
      const cleanName = (currentUser.fullName || '').toLowerCase().trim();

      // Filter matching orders
      const matchingOrders: any[] = [];
      for (const ord of allOrdersMap.values()) {
        const matchesId = Boolean(ord.customerId) && String(ord.customerId).toUpperCase() === cleanCustomerId;
        const matchesEmail = Boolean(cleanEmail) && Boolean(ord.customerEmail) && String(ord.customerEmail).toLowerCase().trim() === cleanEmail;
        const matchesName = Boolean(cleanName) && Boolean(ord.customerName) && String(ord.customerName).toLowerCase().trim() === cleanName;

        if (matchesId || matchesEmail || matchesName) {
          matchingOrders.push(ord);
        }
      }

      // Calculate stamps
      const seenOrderIds = new Set<string>();
      let calculatedStamps = 0;
      const validContributors: ContributingOrder[] = [];

      for (const ord of matchingOrders) {
        if (!ord.id || seenOrderIds.has(ord.id)) {
          continue; // Do not count duplicate orders
        }

        if (!isOrderValidForLoyalty(ord)) {
          continue; // Do not count cancelled, failed, or unpaid orders
        }

        seenOrderIds.add(ord.id);
        const soapsCount = countOrderSoapQuantity(ord);
        calculatedStamps += soapsCount;
        validContributors.push({
          orderId: ord.id,
          date: ord.date || ord.createdAt?.split('T')[0] || 'Recent',
          soapsCount,
          stampsEarned: soapsCount,
          total: ord.total,
          status: ord.status || 'Confirmed'
        });
      }

      setStamps(calculatedStamps);
      setContributingOrders(validContributors);
      const now = new Date().toISOString();
      setLastSavedTime(now);

      // Save progress in Firebase
      const loyaltyPayload = {
        customerId: cleanCustomerId,
        customerName: currentUser.fullName,
        stamps: calculatedStamps,
        target,
        progress: `${Math.min(calculatedStamps, target)}/${target}`,
        unlocked: calculatedStamps >= target,
        gift: 'Secret Prakriti Gift 🎁',
        processedOrderIds: Array.from(seenOrderIds),
        contributingOrders: validContributors,
        updatedAt: now
      };

      await setDoc(doc(db, 'loyalty', cleanCustomerId), loyaltyPayload, { merge: true }).catch(err => {
        console.error('Error saving to loyalty collection:', err);
      });

      await updateDoc(doc(db, 'customers', cleanCustomerId), {
        loyaltyStamps: calculatedStamps,
        loyaltyProgress: `${Math.min(calculatedStamps, target)}/${target}`,
        loyaltyUnlocked: calculatedStamps >= target,
        loyaltyGift: calculatedStamps >= target ? 'Secret Prakriti Gift 🎁' : null,
        updatedAt: now
      }).catch(() => {});
    } catch (err) {
      console.error('Error calculating loyalty:', err);
    }
  };

  useEffect(() => {
    loadLoyaltyData();
  }, [customerId, localOrders]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/customer-loyalty/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          clientOrders: localOrders
        })
      });
      await loadLoyaltyData();
    } catch (e) {
      await calculateAndPersistLoyaltyLocally();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm mb-6 relative overflow-hidden">
      {/* Decorative botanical backdrop aura */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#cbe6d4]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebefeb] relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#2e7d32] text-[20px]">
              eco
            </span>
            <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest">
              Artisanal Botanical Care Program
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417] flex items-center gap-2">
            Prakriti Loyalty Rewards
          </h2>
          <p className="text-xs text-[#607769] mt-0.5">
            Every handcrafted soap bar earns 1 stamp. Collect 10 stamps to unlock your Secret Gift.
          </p>
        </div>

        {/* Refresh / Sync Button */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="self-start sm:self-center px-3 py-1.5 bg-[#f5f3f0] hover:bg-[#efeeeb] text-[#072417] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-[#e4e2df] disabled:opacity-50"
          title="Sync loyalty stamps with latest Firebase orders"
        >
          <span className={`material-symbols-outlined text-[16px] text-[#4c6455] ${isSyncing ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span>{isSyncing ? 'Syncing...' : 'Sync Stamps'}</span>
        </button>
      </div>

      {/* Customer Information & Progress Bar */}
      <div className="my-5 p-4 bg-[#fbf9f6] border border-[#ebefeb] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#607769]">Customer Name:</span>
            <span className="font-['Playfair_Display'] font-bold text-[#072417] text-base">
              {currentUser.fullName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#607769]">Customer ID:</span>
            <span className="bg-[#ffdcbd] text-[#072417] text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
              {currentUser.customerId || customerId}
            </span>
            {lastSavedTime && (
              <span className="text-[10px] text-[#85a490] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32]"></span> Saved in Firebase
              </span>
            )}
          </div>
        </div>

        {/* Progress Display: "such as 7/10" */}
        <div className="w-full md:w-64 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-[#4c6455]">Stamp Progress:</span>
            <span className="font-mono text-lg font-bold text-[#072417] bg-[#e2ede6] px-2.5 py-0.5 rounded-lg">
              {progressString}
            </span>
          </div>
          {/* Visual Progress Track */}
          <div className="w-full h-2.5 bg-[#e4e2df] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2e7d32] to-[#1EBE5D] transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (stamps / target) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-[#607769] text-right">
            {isUnlocked ? (
              <span className="text-[#2e7d32] font-bold">10/10 Reached • Gift Unlocked!</span>
            ) : (
              <span>{target - stamps} more {target - stamps === 1 ? 'stamp' : 'stamps'} until Secret Gift</span>
            )}
          </span>
        </div>
      </div>

      {/* 10-Stamp Visual Loyalty Card */}
      <div className="my-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#072417] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#4c6455]">
              verified
            </span>
            <span>10-Stamp Loyalty Card</span>
          </h3>
          <span className="text-[11px] text-[#607769] font-medium">
            1 Soap = 1 Stamp
          </span>
        </div>

        {/* Card Canvas */}
        <div className="bg-[#072417] text-[#ffdcbd] rounded-2xl p-5 sm:p-6 shadow-md border border-[#1e3a2b] relative overflow-hidden">
          {/* Subtle watermark background stamp */}
          <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[200px]">spa</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-[#1e3a2b] mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffdcbd]"></span>
              <span className="font-bold tracking-wider uppercase text-[10px] text-[#d2dcd5]">
                Prakriti Botanical Pass
              </span>
            </div>
            <span className="font-mono text-[#ffdcbd] text-[11px] font-bold">
              ID: {currentUser.customerId || customerId}
            </span>
          </div>

          {/* 10 Stamp Slots Grid (2 rows x 5 columns) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 relative z-10">
            {[...Array(10)].map((_, index) => {
              const slotNumber = index + 1;
              const isStamped = slotNumber <= stamps;
              const isMilestoneSlot = slotNumber === 10;

              return (
                <div
                  key={slotNumber}
                  className={`relative rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[90px] sm:min-h-[105px] ${
                    isStamped
                      ? 'bg-gradient-to-br from-[#123824] to-[#0c2b1c] border-2 border-[#ffdcbd] shadow-lg text-white scale-[1.02]'
                      : isMilestoneSlot
                      ? 'bg-white/5 border-2 border-dashed border-[#ffdcbd]/50 text-[#ffdcbd]'
                      : 'bg-white/5 border border-dashed border-white/20 text-white/50'
                  }`}
                >
                  {/* Slot Number Label */}
                  <span className="absolute top-1.5 left-2 text-[10px] font-mono opacity-60">
                    #{slotNumber}
                  </span>

                  {/* Stamp Icon / Visual */}
                  <div className="my-1 flex items-center justify-center">
                    {isStamped ? (
                      <div className="w-10 h-10 rounded-full bg-[#ffdcbd] text-[#072417] flex items-center justify-center shadow-md animate-scaleIn">
                        {isMilestoneSlot ? (
                          <span className="text-lg">🎁</span>
                        ) : (
                          <span
                            className="material-symbols-outlined text-[22px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            spa
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${isMilestoneSlot ? 'border-[#ffdcbd]/40 text-[#ffdcbd]' : 'border-white/20 text-white/40'}`}>
                        {isMilestoneSlot ? (
                          <span className="text-base opacity-70">🎁</span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">
                            radio_button_unchecked
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stamp Title */}
                  <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${isStamped ? 'text-[#ffdcbd]' : 'text-white/60'}`}>
                    {isStamped ? (
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px] text-[#25D366]">check</span>
                        {isMilestoneSlot ? 'UNLOCKED' : `Stamp #${slotNumber}`}
                      </span>
                    ) : isMilestoneSlot ? (
                      'Secret Gift'
                    ) : (
                      `Stamp #${slotNumber}`
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-4 border-t border-[#1e3a2b] text-[11px] text-[#d2dcd5] gap-2">
            <span>Progress: <strong className="text-white">{progressString} Stamps</strong></span>
            <span className="text-[#85a490]">Authentic Cold-Processed Ayurvedic Soap Reward Card</span>
          </div>
        </div>
      </div>

      {/* Secret Prakriti Gift 🎁 Unlock State */}
      <div className="mt-6">
        {isUnlocked ? (
          /* Automatically Unlocked State */
          <div className="p-5 sm:p-6 bg-[#eaf4ee] border-2 border-[#2e7d32] rounded-2xl shadow-sm animate-fadeIn flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#2e7d32] text-white flex items-center justify-center text-3xl shrink-0 shadow-md">
              🎁
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-[#2e7d32] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Unlocked Reward
                </span>
                <span className="bg-[#ffdcbd] text-[#072417] text-[11px] font-bold px-2 py-0.5 rounded-full">
                  10/10 Purchases Completed
                </span>
                {rewardRedeemed && (
                  <span className="bg-[#072417] text-[#ffdcbd] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    ✓ Redeemed
                  </span>
                )}
              </div>

              {/* Title required: "🎁 Secret Prakriti Gift Unlocked!" */}
              <h3 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[#072417]">
                🎁 Secret Prakriti Gift Unlocked!
              </h3>

              {secretGiftRevealed ? (
                <div className="mt-2 p-3 bg-white/80 border border-[#b2d8be] rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-[#2e7d32] tracking-wider block">
                    Curated Gift Contents Revealed:
                  </span>
                  <p className="text-sm font-semibold text-[#072417] mt-0.5">
                    {revealedGiftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#344c3e] mt-1.5 leading-relaxed">
                  Congratulations, <strong>{currentUser.fullName}</strong>! You have completed 10 valid purchases. Your <strong>Secret Prakriti Gift</strong> has been unlocked in Firebase. Our studio curator Priya Parmar will reveal and personally package your artisanal surprise!
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#cbe6d4] text-[11px]">
                <div className="flex items-center gap-1.5 text-[#2e7d32] font-semibold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Customer ID {currentUser.customerId || customerId} • Unlocked</span>
                </div>
                {rewardRedeemed ? (
                  <span className="text-[#072417] font-bold bg-[#ffdcbd] px-2.5 py-0.5 rounded-md">
                    ✓ Redeemed {redeemedAt ? `on ${new Date(redeemedAt).toLocaleDateString()}` : ''}
                  </span>
                ) : (
                  <span className="text-[#607769]">
                    {secretGiftRevealed ? 'Ready for Dispatch' : 'Awaiting Studio Dispatch'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* In-Progress Preview State */
          <div className="p-4 sm:p-5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffdcbd] text-[#072417] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🎁
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-['Playfair_Display'] text-base font-bold text-[#072417]">
                    Secret Prakriti Gift 🎁
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#efeeeb] text-[#4c6455] rounded-full">
                    Unlocks at 10 Stamps
                  </span>
                </div>
                <p className="text-xs text-[#607769] mt-0.5">
                  Reach 10 valid purchases to automatically unlock your complimentary secret botanical gift.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-[#072417]">
                {target - stamps} more {target - stamps === 1 ? 'stamp' : 'stamps'} needed
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rules & Valid Order Breakdown */}
      <div className="mt-6 pt-5 border-t border-[#ebefeb]">
        <h4 className="text-xs font-bold text-[#072417] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#4c6455]">info</span>
          <span>Prakriti Loyalty Rules & Calculation</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#424843] mb-4">
          <div className="p-3 bg-[#f5f3f0] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#2e7d32] text-[18px] shrink-0">add_task</span>
            <div>
              <strong className="block text-[#072417]">1 Soap = 1 Stamp</strong>
              <span>3 soaps = 3 stamps, 5 soaps = 5 stamps.</span>
            </div>
          </div>
          <div className="p-3 bg-[#f5f3f0] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] shrink-0">cancel</span>
            <div>
              <strong className="block text-[#072417]">Valid Orders Only</strong>
              <span>Cancelled, failed, or unpaid orders are never counted.</span>
            </div>
          </div>
          <div className="p-3 bg-[#f5f3f0] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#072417] text-[18px] shrink-0">security</span>
            <div>
              <strong className="block text-[#072417]">Strict Deduplication</strong>
              <span>No order is ever counted twice. Saved in Firebase.</span>
            </div>
          </div>
        </div>

        {/* Contributing Orders List */}
        {contributingOrders.length > 0 && (
          <div className="mt-3">
            <span className="text-[11px] font-bold text-[#607769] uppercase tracking-wider block mb-2">
              Valid Orders Contributing to Stamps ({contributingOrders.length})
            </span>
            <div className="space-y-2">
              {contributingOrders.map((co) => (
                <div
                  key={co.orderId}
                  className="flex items-center justify-between p-2.5 bg-[#fbf9f6] border border-[#ebefeb] rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#072417]">Order #{co.orderId}</span>
                    <span className="text-[#85a490]">• {co.date}</span>
                    <span className="px-2 py-0.5 bg-[#cbe6d4] text-[#072417] text-[10px] rounded font-semibold">
                      {co.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#607769]">{co.soapsCount} {co.soapsCount === 1 ? 'soap' : 'soaps'}</span>
                    <span className="px-2 py-0.5 bg-[#072417] text-[#ffdcbd] font-bold rounded-full text-[11px]">
                      +{co.stampsEarned} {co.stampsEarned === 1 ? 'Stamp' : 'Stamps'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
