import React, { useState, useEffect } from 'react';
import { CustomerOffer, LoyaltyRecord, Order, RewardHistoryItem } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface AdminCustomerSummary {
  customerId: string;
  customerName: string;
  email: string;
  purchases: number;
  progress: string; // e.g. "7/10"
  rewardStatus: 'In Progress' | 'Unlocked' | 'Redeemed';
  isUnlocked: boolean;
  isRedeemed: boolean;
  secretGiftRevealed?: boolean;
  revealedGiftDescription?: string;
  redeemedAt?: string;
  activeOffers: CustomerOffer[];
  allOffers: CustomerOffer[];
  loyaltyRecord: LoyaltyRecord;
  orders: Order[];
}

export const AdminLoyaltyRewardsSection: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'redeemed' | 'in_progress'>('all');

  // Stats
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [customersWithPurchases, setCustomersWithPurchases] = useState<number>(0);
  const [totalValidPurchases, setTotalValidPurchases] = useState<number>(0);
  const [rewardsUnlocked, setRewardsUnlocked] = useState<number>(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState<number>(0);
  const [activeOffersCount, setActiveOffersCount] = useState<number>(0);

  // Summaries list
  const [customerSummaries, setCustomerSummaries] = useState<AdminCustomerSummary[]>([]);

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Create Offer Form State
  const [offerType, setOfferType] = useState<CustomerOffer['offerType']>('rupee_off');
  const [offerTitle, setOfferTitle] = useState<string>('₹100 OFF On Any Botanical Order');
  const [discountCode, setDiscountCode] = useState<string>('PRAKRITI100');
  const [offerDescription, setOfferDescription] = useState<string>('Enjoy ₹100 flat discount on handcrafted Ayurvedic soaps.');
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [isCustomOffer, setIsCustomOffer] = useState<boolean>(false);

  const countOrderSoapQuantity = (order: any): number => {
    if (order.quantities && Array.isArray(order.quantities) && order.quantities.length > 0) {
      return order.quantities.reduce((sum: number, q: any) => sum + (Number(q.quantity) || 1), 0);
    }
    if (order.items && typeof order.items === 'string') {
      const parts = order.items.split(',');
      let sum = 0;
      for (const part of parts) {
        const match = part.match(/\(x(\d+)\)/i) || part.match(/x(\d+)/i);
        if (match && match[1]) {
          sum += parseInt(match[1], 10);
        } else {
          sum += 1;
        }
      }
      return Math.max(1, sum);
    }
    return 1;
  };

  const isOrderValid = (order: any): boolean => {
    const s = String(order.status || '').toLowerCase().trim();
    if (s.includes('cancel') || s.includes('fail') || s.includes('unpaid') || s.includes('refund')) {
      return false;
    }
    return true;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try server API first
      const res = await fetch('/api/admin/loyalty-overview');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTotalCustomers(data.totalCustomers || 0);
          setCustomersWithPurchases(data.customersWithPurchases || 0);
          setTotalValidPurchases(data.totalValidPurchases || 0);
          setRewardsUnlocked(data.rewardsUnlocked || 0);
          setRewardsRedeemed(data.rewardsRedeemed || 0);
          setActiveOffersCount(data.activeOffers || 0);
          setCustomerSummaries(data.customerSummaries || []);
          setLoading(false);
          return;
        }
      }

      // 2. Direct Firestore Client Fallback
      await loadFromFirestoreDirect();
    } catch (err) {
      console.warn('Admin overview fetch error, loading directly from Firestore:', err);
      await loadFromFirestoreDirect();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFromFirestoreDirect = async () => {
    try {
      const [custSnap, ordSnap, loySnap, offSnap] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'loyalty')),
        getDocs(collection(db, 'customer_offers'))
      ]);

      const customersMap = new Map<string, any>();
      custSnap.forEach(d => {
        const data = d.data();
        const cid = (data.customerId || data.id || d.id).toUpperCase();
        customersMap.set(cid, { ...data, customerId: cid });
      });

      const allOrders: any[] = [];
      ordSnap.forEach(d => {
        const ord = d.data();
        allOrders.push({ ...ord, id: ord.id || d.id });
      });

      const loyaltyMap = new Map<string, any>();
      loySnap.forEach(d => {
        const l = d.data();
        const cid = (l.customerId || d.id).toUpperCase();
        loyaltyMap.set(cid, { ...l, customerId: cid });
      });

      const allOffers: any[] = [];
      offSnap.forEach(d => {
        const off = d.data();
        allOffers.push({ ...off, id: off.id || d.id });
      });

      // Merge order customers
      for (const ord of allOrders) {
        if (ord.customerId) {
          const cid = String(ord.customerId).toUpperCase();
          if (!customersMap.has(cid)) {
            customersMap.set(cid, {
              customerId: cid,
              name: ord.customerName || 'Customer',
              email: ord.customerEmail || '',
              createdAt: ord.createdAt || new Date().toISOString()
            });
          }
        }
      }

      let validPurchasesCount = 0;
      let purchasedCusts = 0;
      let unlockedCount = 0;
      let redeemedCount = 0;

      const summaries: AdminCustomerSummary[] = [];

      for (const [cid, cust] of customersMap.entries()) {
        const custOrders = allOrders.filter(ord => {
          const matchId = ord.customerId && String(ord.customerId).toUpperCase() === cid;
          const matchEmail = cust.email && ord.customerEmail && String(ord.customerEmail).toLowerCase().trim() === String(cust.email).toLowerCase().trim();
          const matchName = cust.name && ord.customerName && String(ord.customerName).toLowerCase().trim() === String(cust.name).toLowerCase().trim();
          return matchId || matchEmail || matchName;
        });

        const seen = new Set<string>();
        let stamps = 0;
        for (const o of custOrders) {
          if (!o.id || seen.has(o.id)) continue;
          if (!isOrderValid(o)) continue;
          seen.add(o.id);
          stamps += countOrderSoapQuantity(o);
        }

        validPurchasesCount += stamps;
        if (stamps > 0) purchasedCusts++;

        const loy = loyaltyMap.get(cid) || {
          customerId: cid,
          customerName: cust.name || cust.fullName || 'Valued Customer',
          stamps,
          target: 10,
          progress: `${Math.min(stamps, 10)}/10`,
          unlocked: stamps >= 10,
          gift: 'Secret Prakriti Gift 🎁',
          secretGiftRevealed: false,
          rewardRedeemed: false,
          rewardHistory: []
        };

        const isUnlocked = stamps >= 10 || loy.unlocked;
        const isRedeemed = loy.rewardRedeemed === true;

        if (isUnlocked) unlockedCount++;
        if (isRedeemed) redeemedCount++;

        const custOffers = allOffers.filter(o => o.customerId && o.customerId.toUpperCase() === cid);

        let rewardStatus: 'In Progress' | 'Unlocked' | 'Redeemed' = 'In Progress';
        if (isRedeemed) rewardStatus = 'Redeemed';
        else if (isUnlocked) rewardStatus = 'Unlocked';

        summaries.push({
          customerId: cid,
          customerName: cust.name || cust.fullName || loy.customerName || 'Valued Customer',
          email: cust.email || '',
          purchases: stamps,
          progress: `${Math.min(stamps, 10)}/10`,
          rewardStatus,
          isUnlocked,
          isRedeemed,
          secretGiftRevealed: loy.secretGiftRevealed || false,
          revealedGiftDescription: loy.revealedGiftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)',
          redeemedAt: loy.redeemedAt,
          activeOffers: custOffers.filter(o => o.status === 'active'),
          allOffers: custOffers,
          loyaltyRecord: loy,
          orders: custOrders
        });
      }

      const activeOff = allOffers.filter(o => o.status === 'active').length;

      setTotalCustomers(customersMap.size);
      setCustomersWithPurchases(purchasedCusts);
      setTotalValidPurchases(validPurchasesCount);
      setRewardsUnlocked(unlockedCount);
      setRewardsRedeemed(redeemedCount);
      setActiveOffersCount(activeOff);
      setCustomerSummaries(summaries);
    } catch (e) {
      console.error('Firestore direct load failed:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update offer form fields when selecting a preset
  const handlePresetSelect = (type: CustomerOffer['offerType']) => {
    setOfferType(type);
    setIsCustomOffer(type === 'custom');
    const custId = selectedCustomer?.customerId || 'PATRON';
    const randSuffix = Math.floor(1000 + Math.random() * 9000);

    switch (type) {
      case 'rupee_off':
        setOfferTitle('₹100 OFF On Any Botanical Order');
        setDiscountCode(`PRAKRITI100-${randSuffix}`);
        setOfferDescription('Instant ₹100 discount applicable on all artisanal herbal soaps.');
        break;
      case 'percent_off':
        setOfferTitle('20% OFF Loyalty Special');
        setDiscountCode(`BOTANICAL20-${randSuffix}`);
        setOfferDescription('Enjoy 20% off your entire cart of cold-pressed soaps.');
        break;
      case 'free_soap':
        setOfferTitle('Complimentary Cold-Pressed Soap');
        setDiscountCode(`FREESOAP-${randSuffix}`);
        setOfferDescription('Complimentary artisanal Neem & Tulsi herbal soap bar included with your shipment.');
        break;
      case 'free_shipping':
        setOfferTitle('Free Shipping on Next Order');
        setDiscountCode(`FREESHIP-${randSuffix}`);
        setOfferDescription('Zero delivery fees anywhere in India on your next purchase.');
        break;
      case 'gift':
        setOfferTitle('Artisanal Herbal Gift Box');
        setDiscountCode(`GIFTBOX-${randSuffix}`);
        setOfferDescription('Complimentary miniature soap discovery pack enclosed with your package.');
        break;
      case 'custom':
        setOfferTitle('');
        setDiscountCode(`OFFER-${custId}-${randSuffix}`);
        setOfferDescription('');
        break;
    }
  };

  // Open Customer Modal
  const handleOpenCustomer = (customer: AdminCustomerSummary) => {
    setSelectedCustomer(customer);
    setActionSuccessMsg(null);
    handlePresetSelect('rupee_off');
  };

  // Admin Action: Reveal Secret Gift
  const handleRevealSecretGift = async () => {
    if (!selectedCustomer) return;
    setActionLoading('reveal');
    const giftDesc = 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)';

    try {
      const res = await fetch('/api/customer-loyalty/reveal-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.customerId,
          giftDescription: giftDesc
        })
      });

      if (!res.ok) {
        // Direct Firestore update fallback
        const docRef = doc(db, 'loyalty', selectedCustomer.customerId);
        const now = new Date().toISOString();
        await setDoc(docRef, {
          secretGiftRevealed: true,
          revealedGiftDescription: giftDesc,
          updatedAt: now
        }, { merge: true });
      }

      setActionSuccessMsg('Secret Gift revealed successfully! Customer will now see the exact botanical gift details.');
      
      // Update local state
      const updatedCust = {
        ...selectedCustomer,
        secretGiftRevealed: true,
        revealedGiftDescription: giftDesc
      };
      setSelectedCustomer(updatedCust);
      setCustomerSummaries(prev => prev.map(c => c.customerId === updatedCust.customerId ? updatedCust : c));
    } catch (err: any) {
      console.error('Error revealing secret gift:', err);
      alert('Error revealing gift: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Action: Mark Reward as Redeemed
  const handleMarkRewardRedeemed = async () => {
    if (!selectedCustomer) return;
    setActionLoading('redeem');
    const now = new Date().toISOString();

    try {
      const res = await fetch('/api/customer-loyalty/redeem-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.customerId,
          note: 'Redeemed & packaged by Admin in Akola studio'
        })
      });

      if (!res.ok) {
        // Direct Firestore fallback
        const docRef = doc(db, 'loyalty', selectedCustomer.customerId);
        await setDoc(docRef, {
          rewardRedeemed: true,
          redeemedAt: now,
          updatedAt: now
        }, { merge: true });
      }

      setActionSuccessMsg('Reward marked as Redeemed! Record is permanently updated in Firebase.');

      // Update local state
      const updatedCust: AdminCustomerSummary = {
        ...selectedCustomer,
        rewardStatus: 'Redeemed',
        isRedeemed: true,
        redeemedAt: now
      };
      setSelectedCustomer(updatedCust);
      setCustomerSummaries(prev => prev.map(c => c.customerId === updatedCust.customerId ? updatedCust : c));
      setRewardsRedeemed(prev => prev + 1);
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      alert('Error marking reward redeemed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Action: Create an individual offer for customer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!offerTitle.trim() || !discountCode.trim()) {
      alert('Please provide offer title and coupon code.');
      return;
    }

    setActionLoading('createOffer');
    try {
      const expDate = expiryDays > 0 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const offerPayload = {
        customerId: selectedCustomer.customerId,
        customerName: selectedCustomer.customerName,
        offerType,
        title: offerTitle.trim(),
        discountCode: discountCode.trim().toUpperCase(),
        description: offerDescription.trim() || 'Exclusive Customer Offer',
        expiresAt: expDate
      };

      const res = await fetch('/api/customer-offers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerPayload)
      });

      let createdOffer: CustomerOffer;
      if (res.ok) {
        const data = await res.json();
        createdOffer = data.offer;
      } else {
        // Direct Firestore fallback
        const offerId = `offer-${selectedCustomer.customerId}-${Date.now()}`;
        createdOffer = {
          id: offerId,
          ...offerPayload,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'customer_offers', offerId), createdOffer);
      }

      setActionSuccessMsg(`Offer "${createdOffer.title}" (${createdOffer.discountCode}) saved permanently in Firebase for ${selectedCustomer.customerName}!`);

      // Update local state
      const updatedActiveOffers = [createdOffer, ...selectedCustomer.activeOffers];
      const updatedAllOffers = [createdOffer, ...selectedCustomer.allOffers];
      const updatedCust = {
        ...selectedCustomer,
        activeOffers: updatedActiveOffers,
        allOffers: updatedAllOffers
      };

      setSelectedCustomer(updatedCust);
      setCustomerSummaries(prev => prev.map(c => c.customerId === updatedCust.customerId ? updatedCust : c));
      setActiveOffersCount(prev => prev + 1);

      // Reset form to another random preset
      handlePresetSelect('rupee_off');
    } catch (err: any) {
      console.error('Error creating offer:', err);
      alert('Error creating offer: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Action: Delete an offer
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    if (!selectedCustomer) return;

    try {
      await fetch('/api/customer-offers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId })
      }).catch(() => {});

      // Also firestore delete
      await deleteDoc(doc(db, 'customer_offers', offerId)).catch(() => {});

      const updatedActive = selectedCustomer.activeOffers.filter(o => o.id !== offerId);
      const updatedAll = selectedCustomer.allOffers.filter(o => o.id !== offerId);
      const updatedCust = {
        ...selectedCustomer,
        activeOffers: updatedActive,
        allOffers: updatedAll
      };

      setSelectedCustomer(updatedCust);
      setCustomerSummaries(prev => prev.map(c => c.customerId === updatedCust.customerId ? updatedCust : c));
      setActiveOffersCount(prev => Math.max(0, prev - 1));
      setActionSuccessMsg('Offer removed successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered summaries
  const filteredSummaries = customerSummaries.filter(c => {
    const matchesSearch = 
      c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'unlocked') return c.isUnlocked && !c.isRedeemed;
    if (statusFilter === 'redeemed') return c.isRedeemed;
    if (statusFilter === 'in_progress') return !c.isUnlocked;

    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with quick refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1EBE5D]"></span>
            Loyalty Engine & Exclusive Offers
          </span>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417] mt-0.5">
            Prakriti Loyalty & Rewards Administration
          </h2>
          <p className="text-xs text-[#607769] mt-0.5">
            Real-time tracking of customer stamps, unlocked secret gifts, redemption statuses, and individual coupon offers.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadData();
          }}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs font-bold text-[#072417] hover:bg-[#efeeeb] flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] text-[#4c6455] ${refreshing ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span>{refreshing ? 'Refreshing...' : 'Refresh Firebase Data'}</span>
        </button>
      </div>

      {/* 6 Metric Counter Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Customers */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#607769]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Customers</span>
            <span className="material-symbols-outlined text-[18px] text-[#072417]">group</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#072417]">
              {totalCustomers}
            </span>
            <p className="text-[10px] text-[#607769] mt-0.5">Registered accounts</p>
          </div>
        </div>

        {/* 2. Customers Who Have Purchased */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#607769]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Purchased</span>
            <span className="material-symbols-outlined text-[18px] text-[#2e7d32]">shopping_bag</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#2e7d32]">
              {customersWithPurchases}
            </span>
            <p className="text-[10px] text-[#607769] mt-0.5">Active buyers</p>
          </div>
        </div>

        {/* 3. Total Valid Purchases */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#607769]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valid Purchases</span>
            <span className="material-symbols-outlined text-[18px] text-[#ff8c42]">spa</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#072417]">
              {totalValidPurchases}
            </span>
            <p className="text-[10px] text-[#607769] mt-0.5">Soap stamps earned</p>
          </div>
        </div>

        {/* 4. Rewards Unlocked */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-[#eaf4ee]">
          <div className="flex items-center justify-between text-[#2e7d32]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rewards Unlocked</span>
            <span className="text-[18px]">🎁</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#2e7d32]">
              {rewardsUnlocked}
            </span>
            <p className="text-[10px] text-[#4c6455] mt-0.5">10 stamps reached</p>
          </div>
        </div>

        {/* 5. Rewards Redeemed */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#607769]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rewards Redeemed</span>
            <span className="material-symbols-outlined text-[18px] text-[#072417]">task_alt</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#072417]">
              {rewardsRedeemed}
            </span>
            <p className="text-[10px] text-[#607769] mt-0.5">Dispatched & claimed</p>
          </div>
        </div>

        {/* 6. Active Offers */}
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#607769]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Offers</span>
            <span className="material-symbols-outlined text-[18px] text-[#ff8c42]">local_offer</span>
          </div>
          <div className="mt-2">
            <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#072417]">
              {activeOffersCount}
            </span>
            <p className="text-[10px] text-[#607769] mt-0.5">Assigned coupons</p>
          </div>
        </div>
      </div>

      {/* Customer Loyalty Table */}
      <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 shadow-sm">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#ebefeb]">
          <div className="flex items-center gap-3">
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#072417] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#4c6455]">
                loyalty
              </span>
              <span>Customer Loyalty Records</span>
            </h3>
            <span className="bg-[#efeeeb] text-[#072417] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredSummaries.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#607769] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417] w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417] text-[#072417] font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unlocked">🎁 Unlocked (Ready)</option>
              <option value="redeemed">✓ Redeemed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#607769] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            <span>Loading customer loyalty data from Firebase...</span>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#607769]">
            <p>No customer records found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#ebefeb] text-[#607769] uppercase font-bold text-[11px] bg-[#fbf9f6]/80">
                  <th className="py-3 px-4 rounded-l-xl">Customer ID</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Purchases</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Reward Status</th>
                  <th className="py-3 px-4">Active Offers</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebefeb]">
                {filteredSummaries.map((c) => {
                  return (
                    <tr
                      key={c.customerId}
                      className="hover:bg-[#fcfaf7] transition-colors group cursor-pointer"
                      onClick={() => handleOpenCustomer(c)}
                    >
                      {/* Customer ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#072417]">
                        <span className="bg-[#ffdcbd]/70 text-[#072417] px-2 py-0.5 rounded-md border border-[#e8c09e]">
                          {c.customerId}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#072417]">{c.customerName}</div>
                        {c.email && (
                          <div className="text-[11px] text-[#607769]">{c.email}</div>
                        )}
                      </td>

                      {/* Purchases */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#072417] text-sm">{c.purchases}</span>
                          <span className="text-[10px] text-[#607769]">soaps</span>
                        </div>
                      </td>

                      {/* Progress (7/10) */}
                      <td className="py-3.5 px-4">
                        <div className="w-28">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#072417] mb-1">
                            <span>{c.progress}</span>
                            <span>{Math.round((Math.min(c.purchases, 10) / 10) * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#e4e2df] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1EBE5D] rounded-full"
                              style={{ width: `${Math.min(100, (c.purchases / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Reward Status */}
                      <td className="py-3.5 px-4">
                        {c.isRedeemed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#072417] text-[#ffdcbd]">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            <span>Redeemed</span>
                          </span>
                        ) : c.isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf4ee] text-[#2e7d32] border border-[#2e7d32]/30 animate-pulse">
                            <span>🎁</span>
                            <span>Unlocked!</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#efeeeb] text-[#607769]">
                            In Progress ({c.progress})
                          </span>
                        )}
                      </td>

                      {/* Active Offers */}
                      <td className="py-3.5 px-4">
                        {c.activeOffers.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#ffdcbd] text-[#072417]">
                            <span className="material-symbols-outlined text-[13px]">redeem</span>
                            <span>{c.activeOffers.length} Active</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8fa397]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCustomer(c);
                          }}
                          className="px-3 py-1.5 bg-[#072417] text-[#ffdcbd] hover:bg-[#0c3623] rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Open</span>
                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d2dcd5] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-[#072417] text-[#ffdcbd] rounded-t-2xl flex items-start justify-between gap-4 sticky top-0 z-20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/10 rounded-full text-[#d2dcd5]">
                    Customer Loyalty & Rewards Profile
                  </span>
                  <span className="font-mono text-[11px] font-bold bg-[#ffdcbd] text-[#072417] px-2.5 py-0.5 rounded-full">
                    ID: {selectedCustomer.customerId}
                  </span>
                </div>
                <h3 className="font-['Playfair_Display'] text-2xl font-bold text-white">
                  {selectedCustomer.customerName}
                </h3>
                {selectedCustomer.email && (
                  <p className="text-xs text-[#d2dcd5] mt-0.5">{selectedCustomer.email}</p>
                )}
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Notification banner */}
            {actionSuccessMsg && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                  <span>{actionSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setActionSuccessMsg(null)}
                  className="text-green-600 hover:text-green-800 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="p-6 space-y-6 flex-1">
              {/* SECTION 1: REWARDS & SECRET GIFT MANAGEMENT */}
              <div className="bg-[#fbf9f6] border border-[#d2dcd5] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-['Playfair_Display'] text-base font-bold text-[#072417] flex items-center gap-2">
                    <span>🎁 10-Purchase Secret Gift Reward</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#072417]">
                    Progress: {selectedCustomer.progress} ({selectedCustomer.purchases} valid purchases)
                  </span>
                </div>

                {selectedCustomer.isUnlocked ? (
                  <div className="p-4 bg-white border-2 border-[#2e7d32] rounded-xl shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {/* Requirement: Before reveal show "🎁 Secret Prakriti Gift Unlocked!" */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎁</span>
                          <h5 className="font-['Playfair_Display'] text-lg font-bold text-[#072417]">
                            Secret Prakriti Gift Unlocked!
                          </h5>
                        </div>

                        {selectedCustomer.secretGiftRevealed ? (
                          <div className="mt-1.5 text-xs text-[#2e7d32] font-semibold bg-[#eaf4ee] p-2.5 rounded-lg border border-[#cbe6d4]">
                            <span className="font-bold uppercase tracking-wider text-[10px] block text-[#1e5a27]">
                              Revealed Gift Description:
                            </span>
                            {selectedCustomer.revealedGiftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)'}
                          </div>
                        ) : (
                          <p className="text-xs text-[#607769] mt-1">
                            Status: Awaiting Admin reveal. Customer currently sees <em>"🎁 Secret Prakriti Gift Unlocked!"</em>
                          </p>
                        )}

                        {selectedCustomer.isRedeemed && (
                          <div className="mt-2 text-xs text-[#072417] font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#2e7d32]">verified</span>
                            <span>
                              Marked as Redeemed {selectedCustomer.redeemedAt ? `on ${new Date(selectedCustomer.redeemedAt).toLocaleString()}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Admin Reward Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* 1. Reveal Secret Gift */}
                        {!selectedCustomer.secretGiftRevealed && (
                          <button
                            onClick={handleRevealSecretGift}
                            disabled={actionLoading === 'reveal'}
                            className="px-3.5 py-2 bg-[#ff8c42] hover:bg-[#e07530] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>{actionLoading === 'reveal' ? 'Revealing...' : 'Reveal Secret Gift'}</span>
                          </button>
                        )}

                        {/* 2. Mark reward as Redeemed */}
                        {!selectedCustomer.isRedeemed ? (
                          <button
                            onClick={handleMarkRewardRedeemed}
                            disabled={actionLoading === 'redeem'}
                            className="px-3.5 py-2 bg-[#072417] hover:bg-[#0c3623] text-[#ffdcbd] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">task_alt</span>
                            <span>{actionLoading === 'redeem' ? 'Saving...' : 'Mark as Redeemed'}</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-[#e2ede6] text-[#072417] text-xs font-bold rounded-xl flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-[#2e7d32]">check_circle</span>
                            <span>✓ Fully Redeemed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-[#d2dcd5] rounded-xl text-xs text-[#607769] flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#072417]">
                        Reward Locked • {10 - selectedCustomer.purchases} more soap purchases needed
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Once the customer reaches 10 valid purchases, the Secret Gift automatically unlocks in Firebase.
                      </p>
                    </div>
                    <span className="text-xl">🔒</span>
                  </div>
                )}
              </div>

              {/* SECTION 2: CREATE AN INDIVIDUAL OFFER FOR THIS CUSTOMER */}
              <div className="bg-white border border-[#d2dcd5] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#ebefeb]">
                  <div>
                    <h4 className="font-['Playfair_Display'] text-base font-bold text-[#072417] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#ff8c42]">
                        add_circle
                      </span>
                      <span>Create Individual Offer for {selectedCustomer.customerName}</span>
                    </h4>
                    <p className="text-xs text-[#607769] mt-0.5">
                      Assigned strictly to Customer ID <strong className="font-mono text-[#072417]">{selectedCustomer.customerId}</strong> and saved permanently in Firebase.
                    </p>
                  </div>
                </div>

                {/* Offer Preset Selector Pills */}
                <div className="mb-4">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-wider block mb-2">
                    Quick Preset Selectors:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { type: 'rupee_off', label: '₹100 OFF' },
                      { type: 'percent_off', label: '20% OFF' },
                      { type: 'free_soap', label: 'Free Soap' },
                      { type: 'free_shipping', label: 'Free Shipping' },
                      { type: 'gift', label: 'Gift' },
                      { type: 'custom', label: 'Custom Offer' }
                    ].map((preset) => (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => handlePresetSelect(preset.type as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          offerType === preset.type
                            ? 'bg-[#072417] text-[#ffdcbd] border-[#072417] shadow-sm'
                            : 'bg-[#fbf9f6] text-[#072417] border-[#d2dcd5] hover:bg-[#efeeeb]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Offer Form */}
                <form onSubmit={handleCreateOffer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#072417] mb-1">
                        Offer Title
                      </label>
                      <input
                        type="text"
                        required
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        placeholder="e.g. ₹100 OFF On Any Botanical Order"
                        className="w-full px-3 py-2 text-xs bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#072417] mb-1">
                        Discount / Coupon Code
                      </label>
                      <input
                        type="text"
                        required
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="e.g. PRAKRITI100"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417] uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#072417] mb-1">
                        Offer Description & Terms
                      </label>
                      <input
                        type="text"
                        value={offerDescription}
                        onChange={(e) => setOfferDescription(e.target.value)}
                        placeholder="e.g. Valid on your next purchase of natural herbal soaps"
                        className="w-full px-3 py-2 text-xs bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#072417] mb-1">
                        Validity Duration
                      </label>
                      <select
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl focus:outline-none focus:border-[#072417] text-[#072417] font-semibold cursor-pointer"
                      >
                        <option value={7}>7 Days (1 Week)</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>30 Days (1 Month)</option>
                        <option value={60}>60 Days (2 Months)</option>
                        <option value={0}>No Expiry (Permanent)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading === 'createOffer'}
                      className="px-5 py-2.5 bg-[#072417] hover:bg-[#0c3623] text-[#ffdcbd] text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>
                        {actionLoading === 'createOffer' ? 'Saving Offer in Firebase...' : 'Save Offer in Firebase'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 3: ACTIVE & ASSIGNED EXCLUSIVE OFFERS */}
              <div className="bg-white border border-[#d2dcd5] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#ebefeb]">
                  <h4 className="font-['Playfair_Display'] text-base font-bold text-[#072417] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#2e7d32]">
                      local_offer
                    </span>
                    <span>Active Offers Assigned to {selectedCustomer.customerName}</span>
                  </h4>
                  <span className="text-xs bg-[#e2ede6] text-[#072417] px-2.5 py-0.5 rounded-full font-bold">
                    {selectedCustomer.activeOffers.length} Active
                  </span>
                </div>

                {selectedCustomer.activeOffers.length === 0 ? (
                  <div className="p-4 text-center bg-[#fbf9f6] rounded-xl text-xs text-[#607769]">
                    No exclusive offers assigned to this customer yet. Use the form above to grant a discount or free soap!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustomer.activeOffers.map((off) => (
                      <div
                        key={off.id}
                        className="p-3.5 bg-[#fcfaf7] border border-[#d2dcd5] rounded-xl flex items-start justify-between gap-3 relative"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-xs bg-[#072417] text-[#ffdcbd] px-2 py-0.5 rounded">
                              {off.discountCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eaf4ee] text-[#2e7d32]">
                              Active
                            </span>
                          </div>
                          <h6 className="font-bold text-xs text-[#072417]">{off.title}</h6>
                          <p className="text-[11px] text-[#607769] mt-0.5">{off.description}</p>
                          <div className="text-[10px] text-[#8fa397] mt-1.5">
                            {off.expiresAt ? `Expires: ${new Date(off.expiresAt).toLocaleDateString()}` : 'No Expiration'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteOffer(off.id)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer"
                          title="Delete offer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: PURCHASE HISTORY & LOYALTY PROGRESS */}
              <div className="bg-white border border-[#d2dcd5] rounded-2xl p-5 shadow-sm">
                <h4 className="font-['Playfair_Display'] text-base font-bold text-[#072417] mb-3 pb-3 border-b border-[#ebefeb] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#4c6455]">
                    receipt_long
                  </span>
                  <span>Customer Purchase History ({selectedCustomer.orders.length} Orders)</span>
                </h4>

                {selectedCustomer.orders.length === 0 ? (
                  <div className="p-4 text-center bg-[#fbf9f6] rounded-xl text-xs text-[#607769]">
                    No orders logged for this customer ID yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#ebefeb] text-[#607769] uppercase font-bold text-[10px]">
                          <th className="py-2 px-3">Order ID</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Items Purchased</th>
                          <th className="py-2 px-3">Stamps</th>
                          <th className="py-2 px-3">Total</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ebefeb]">
                        {selectedCustomer.orders.map((ord) => {
                          const soapQty = countOrderSoapQuantity(ord);
                          const valid = isOrderValid(ord);

                          return (
                            <tr key={ord.id} className="hover:bg-[#fcfaf7]">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#072417]">
                                #{ord.id}
                              </td>
                              <td className="py-2.5 px-3 text-[#607769]">
                                {ord.date || ord.createdAt?.split('T')[0] || 'Recent'}
                              </td>
                              <td className="py-2.5 px-3 max-w-xs truncate text-[#072417]">
                                {ord.items}
                              </td>
                              <td className="py-2.5 px-3">
                                {valid ? (
                                  <span className="font-bold text-[#2e7d32] bg-[#eaf4ee] px-2 py-0.5 rounded-full">
                                    +{soapQty} stamps
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#8fa397]">0 (Excl.)</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#072417]">
                                ₹{ord.total}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    valid ? 'bg-[#e2ede6] text-[#072417]' : 'bg-red-50 text-red-600'
                                  }`}
                                >
                                  {ord.status || 'Confirmed'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#fbf9f6] border-t border-[#ebefeb] flex items-center justify-end rounded-b-2xl">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-[#072417] text-[#ffdcbd] hover:bg-[#0c3623] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
