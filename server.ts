import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const server = express();
const PORT = 3000;

server.use(express.json());

// Server-side secret key for AES-256-GCM encryption & HMAC-SHA256 session tokens
const SERVER_SECRET = process.env.SESSION_SECRET || 'prakriti_herbal_secure_auth_secret_key_2026';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SERVER_SECRET).digest(); // 32 bytes

// Helper: Encrypt credential data with AES-256-GCM
function encryptCredentials(data: object): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Helper: Decrypt credential data with AES-256-GCM
function decryptCredentials(cipherStr: string): any {
  const parts = cipherStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid cipher format');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Helper: Hash password with PBKDF2
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Helper: Verify password with PBKDF2 (timing-safe)
function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(verifyHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// Helper: Create signed HMAC-SHA256 session token
function createSessionToken(payload: { customerId: string; authUid: string; exp: number }): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(dataStr).digest('base64url');
  return `${dataStr}.${signature}`;
}

// Helper: Verify signed session token
function verifySessionToken(token: string): { customerId: string; authUid: string; exp: number } | null {
  try {
    const [dataStr, signature] = token.split('.');
    if (!dataStr || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(dataStr).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Helper: Generate unique customer ID in format CUS-XXXXXX
async function generateUniqueCustomerId(): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const customerId = `CUS-${code}`;
    const docRef = doc(db, 'customers', customerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return customerId;
    }
  }
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CUS-${randomSuffix}`;
}

// API: Customer Signup
server.post('/api/customer-signup', async (req, res) => {
  try {
    const { fullName, password, email } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Customer Name is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
    }

    const customerId = await generateUniqueCustomerId();
    const authUid = `cus_${crypto.randomUUID()}`;
    const { hash, salt } = hashPassword(password);
    const createdAt = new Date().toISOString();

    // 1. Customer profile document in Firestore (strictly NO passwords!)
    const customerData = {
      customerId,
      authUid,
      name: fullName.trim(),
      email: email && typeof email === 'string' ? email.trim() : '',
      role: 'customer',
      createdAt,
      updatedAt: createdAt
    };

    // 2. Encrypted credentials for resolution & verification
    const encryptedCredentials = encryptCredentials({
      customerId,
      authUid,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt
    });

    const authData = {
      customerId,
      encryptedData: encryptedCredentials,
      updatedAt: createdAt
    };

    // Persist to Firestore
    await setDoc(doc(db, 'customers', customerId), customerData);
    await setDoc(doc(db, 'customer_auth', customerId), authData);

    return res.json({
      success: true,
      customerId,
      customer: {
        id: authUid,
        customerId,
        authUid,
        fullName: customerData.name,
        email: customerData.email,
        role: 'customer',
        createdAt
      }
    });
  } catch (error: any) {
    console.error('Customer signup error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during signup.' });
  }
});

// API: Customer Login
server.post('/api/customer-login', async (req, res) => {
  try {
    const { customerId, password } = req.body;
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanId = customerId.trim().toUpperCase();

    // Resolve Customer ID from Firestore
    const customerSnap = await getDoc(doc(db, 'customers', cleanId));
    if (!customerSnap.exists()) {
      return res.status(404).json({ error: 'Customer ID not found.' });
    }

    const authSnap = await getDoc(doc(db, 'customer_auth', cleanId));
    if (!authSnap.exists()) {
      return res.status(404).json({ error: 'Customer ID not found.' });
    }

    const authDocData = authSnap.data();
    let creds;
    try {
      creds = decryptCredentials(authDocData.encryptedData);
    } catch (e) {
      console.error('Failed to decrypt credentials:', e);
      return res.status(500).json({ error: 'Authentication processing error.' });
    }

    const isValid = verifyPassword(password, creds.passwordHash, creds.passwordSalt);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const customerData = customerSnap.data();
    const sessionToken = createSessionToken({
      customerId: cleanId,
      authUid: customerData.authUid || cleanId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      sessionToken,
      customer: {
        id: customerData.authUid || cleanId,
        customerId: customerData.customerId,
        authUid: customerData.authUid || cleanId,
        fullName: customerData.name,
        email: customerData.email || '',
        role: customerData.role || 'customer',
        createdAt: customerData.createdAt
      }
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
});

// API: Customer Session Verification
server.get('/api/customer-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No session token provided.' });
    }
    const token = authHeader.substring(7);
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
    }

    const customerSnap = await getDoc(doc(db, 'customers', session.customerId));
    if (!customerSnap.exists()) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const customerData = customerSnap.data();
    return res.json({
      success: true,
      customer: {
        id: customerData.authUid || customerData.customerId,
        customerId: customerData.customerId,
        authUid: customerData.authUid || customerData.customerId,
        fullName: customerData.name,
        email: customerData.email || '',
        role: customerData.role || 'customer',
        createdAt: customerData.createdAt
      }
    });
  } catch (error: any) {
    console.error('Customer session error:', error);
    return res.status(500).json({ error: error.message || 'Internal error checking session.' });
  }
});

// API: Customer Logout
server.post('/api/customer-logout', (req, res) => {
  return res.json({ success: true });
});

// Helper: Check if order is valid for loyalty stamps
function isOrderValid(order: any): boolean {
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

// Helper: Count quantity of soaps/products purchased in an order
// 1 soap = 1 stamp, 3 soaps = 3 stamps, 5 soaps = 5 stamps
function countOrderSoapQuantity(order: any): number {
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

// Core Loyalty Computation & Firebase Persistence
async function computeAndSaveLoyalty(customerId: string, clientOrders?: any[]) {
  const cleanId = customerId.trim().toUpperCase();
  const customerSnap = await getDoc(doc(db, 'customers', cleanId));
  const customerData = customerSnap.exists() ? customerSnap.data() : null;
  const customerName = customerData?.name || 'Valued Customer';
  const customerEmail = (customerData?.email || '').toLowerCase().trim();

  // Load orders from Firestore
  const allOrdersMap = new Map<string, any>();

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
    console.error('Error fetching orders from Firestore:', err);
  }

  // Also include any client-passed orders (e.g. from local storage) if not already in map
  if (Array.isArray(clientOrders)) {
    for (const cord of clientOrders) {
      if (cord && cord.id && !allOrdersMap.has(cord.id)) {
        allOrdersMap.set(cord.id, cord);
      }
    }
  }

  // Filter orders strictly matching this customer
  const customerOrders: any[] = [];
  for (const ord of allOrdersMap.values()) {
    const matchesId = Boolean(ord.customerId) && String(ord.customerId).toUpperCase() === cleanId;
    const matchesEmail = Boolean(customerEmail) && Boolean(ord.customerEmail) && String(ord.customerEmail).toLowerCase().trim() === customerEmail;
    const matchesName = Boolean(customerName) && Boolean(ord.customerName) && String(ord.customerName).toLowerCase().trim() === customerName.toLowerCase().trim();

    if (matchesId || matchesEmail || matchesName) {
      customerOrders.push(ord);
    }
  }

  // Count stamps:
  // - 1 soap = 1 stamp, 3 soaps = 3 stamps, 5 soaps = 5 stamps
  // - Do not count cancelled, failed, or unpaid orders
  // - Do not count the same order twice
  const seenOrderIds = new Set<string>();
  let totalStamps = 0;
  const contributingOrders: any[] = [];

  for (const ord of customerOrders) {
    if (!ord.id || seenOrderIds.has(ord.id)) {
      continue; // Prevent counting duplicate orders
    }

    if (!isOrderValid(ord)) {
      continue; // Exclude cancelled, failed or unpaid orders
    }

    seenOrderIds.add(ord.id);
    const soapsCount = countOrderSoapQuantity(ord);
    totalStamps += soapsCount;
    contributingOrders.push({
      orderId: ord.id,
      date: ord.date || ord.createdAt?.split('T')[0] || 'Recent',
      soapsCount,
      stampsEarned: soapsCount,
      total: ord.total,
      status: ord.status || 'Confirmed'
    });
  }

  const target = 10;
  const progressStr = `${Math.min(totalStamps, target)}/${target}`;
  const isUnlocked = totalStamps >= target;
  const secretGift = 'Secret Prakriti Gift 🎁';
  const updatedAt = new Date().toISOString();

  // Load existing loyalty record to preserve revealed/redeemed statuses
  const existingLoyaltySnap = await getDoc(doc(db, 'loyalty', cleanId));
  const existingLoyalty = existingLoyaltySnap.exists() ? existingLoyaltySnap.data() : {};

  const secretGiftRevealed = existingLoyalty.secretGiftRevealed || false;
  const revealedGiftDescription = existingLoyalty.revealedGiftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)';
  const rewardRedeemed = existingLoyalty.rewardRedeemed || false;
  const redeemedAt = existingLoyalty.redeemedAt || null;
  let rewardHistory = existingLoyalty.rewardHistory || [];

  if (isUnlocked && rewardHistory.length === 0) {
    rewardHistory = [{
      id: `rew-init-${Date.now()}`,
      type: 'unlocked',
      title: 'Secret Prakriti Gift Unlocked',
      timestamp: updatedAt
    }];
  }

  const loyaltyRecord = {
    customerId: cleanId,
    customerName,
    stamps: totalStamps,
    target,
    progress: progressStr,
    unlocked: isUnlocked,
    gift: secretGift,
    secretGiftRevealed,
    revealedGiftDescription,
    rewardRedeemed,
    redeemedAt,
    rewardHistory,
    processedOrderIds: Array.from(seenOrderIds),
    contributingOrders,
    updatedAt
  };

  // 1. Save progress in Firebase: loyalty/{customerId}
  try {
    await setDoc(doc(db, 'loyalty', cleanId), loyaltyRecord, { merge: true });
  } catch (e) {
    console.error('Error saving to loyalty collection in Firebase:', e);
  }

  // 2. Save progress in Firebase: customers/{customerId}
  try {
    if (customerSnap.exists()) {
      await updateDoc(doc(db, 'customers', cleanId), {
        loyaltyStamps: totalStamps,
        loyaltyProgress: progressStr,
        loyaltyUnlocked: isUnlocked,
        loyaltyGift: isUnlocked ? secretGift : null,
        loyaltyRevealed: secretGiftRevealed,
        loyaltyRedeemed: rewardRedeemed,
        updatedAt
      });
    }
  } catch (e) {
    console.error('Error updating customer loyalty in customers collection:', e);
  }

  return loyaltyRecord;
}

// API: Get Prakriti Loyalty Status
server.get('/api/customer-loyalty/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }
    const loyalty = await computeAndSaveLoyalty(customerId);
    return res.json({ success: true, loyalty });
  } catch (err: any) {
    console.error('Loyalty fetch error:', err);
    return res.status(500).json({ error: err.message || 'Error fetching loyalty record.' });
  }
});

// API: Sync Loyalty Status (with optional orders payload)
server.post('/api/customer-loyalty/sync', async (req, res) => {
  try {
    const { customerId, clientOrders } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }
    const loyalty = await computeAndSaveLoyalty(customerId, clientOrders);
    return res.json({ success: true, loyalty });
  } catch (err: any) {
    console.error('Loyalty sync error:', err);
    return res.status(500).json({ error: err.message || 'Error syncing loyalty record.' });
  }
});

// API: Reveal Secret Gift (Admin)
server.post('/api/customer-loyalty/reveal-gift', async (req, res) => {
  try {
    const { customerId, giftDescription } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID is required.' });
    const cleanId = customerId.trim().toUpperCase();
    const docRef = doc(db, 'loyalty', cleanId);
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();
    const finalDesc = giftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)';

    let history = snap.exists() && snap.data().rewardHistory ? snap.data().rewardHistory : [];
    history.push({
      id: `rew-rev-${Date.now()}`,
      type: 'revealed',
      title: `Secret Gift Revealed: ${finalDesc}`,
      timestamp: now
    });

    await setDoc(docRef, {
      secretGiftRevealed: true,
      revealedGiftDescription: finalDesc,
      rewardHistory: history,
      updatedAt: now
    }, { merge: true });

    await updateDoc(doc(db, 'customers', cleanId), {
      loyaltyRevealed: true,
      loyaltyRevealedDescription: finalDesc,
      updatedAt: now
    }).catch(() => {});

    return res.json({ success: true, secretGiftRevealed: true, revealedGiftDescription: finalDesc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Mark Reward as Redeemed (Admin)
server.post('/api/customer-loyalty/redeem-reward', async (req, res) => {
  try {
    const { customerId, note } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID is required.' });
    const cleanId = customerId.trim().toUpperCase();
    const docRef = doc(db, 'loyalty', cleanId);
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();

    let history = snap.exists() && snap.data().rewardHistory ? snap.data().rewardHistory : [];
    history.push({
      id: `rew-red-${Date.now()}`,
      type: 'redeemed',
      title: 'Secret Gift Marked as Redeemed',
      timestamp: now,
      note: note || 'Dispatched with customer order package'
    });

    await setDoc(docRef, {
      rewardRedeemed: true,
      redeemedAt: now,
      rewardHistory: history,
      updatedAt: now
    }, { merge: true });

    await updateDoc(doc(db, 'customers', cleanId), {
      loyaltyRedeemed: true,
      loyaltyRedeemedAt: now,
      updatedAt: now
    }).catch(() => {});

    return res.json({ success: true, rewardRedeemed: true, redeemedAt: now });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Get Exclusive Offers for a specific Customer ID
server.get('/api/customer-offers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const cleanId = customerId.trim().toUpperCase();
    const offersSnap = await getDocs(collection(db, 'customer_offers'));
    const customerOffers: any[] = [];
    offersSnap.forEach(d => {
      const data = d.data();
      if (data.customerId && data.customerId.toUpperCase() === cleanId) {
        customerOffers.push({ ...data, id: data.id || d.id });
      }
    });
    return res.json({ success: true, offers: customerOffers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Create an individual offer for a selected customer
server.post('/api/customer-offers/create', async (req, res) => {
  try {
    const { customerId, customerName, offerType, title, discountCode, description, expiresAt } = req.body;
    if (!customerId || !offerType || !title) {
      return res.status(400).json({ error: 'Customer ID, offer type, and title are required.' });
    }
    const cleanId = customerId.trim().toUpperCase();
    const offerId = `offer-${cleanId}-${Date.now()}`;
    const newOffer = {
      id: offerId,
      customerId: cleanId,
      customerName: customerName || 'Valued Customer',
      offerType, // 'rupee_off' | 'percent_off' | 'free_soap' | 'free_shipping' | 'gift' | 'custom'
      title,
      discountCode: discountCode || `PRAKRITI-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      description: description || 'Special Exclusive Customer Offer',
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null
    };

    await setDoc(doc(db, 'customer_offers', offerId), newOffer);
    return res.json({ success: true, offer: newOffer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Delete an offer
server.post('/api/customer-offers/delete', async (req, res) => {
  try {
    const { offerId } = req.body;
    if (!offerId) return res.status(400).json({ error: 'Offer ID required' });
    await deleteDoc(doc(db, 'customer_offers', offerId));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Admin Loyalty Overview & Metrics
server.get('/api/admin/loyalty-overview', async (req, res) => {
  try {
    // 1. Fetch all customers from Firebase
    const customersSnap = await getDocs(collection(db, 'customers'));
    const customersMap = new Map<string, any>();
    customersSnap.forEach(d => {
      const data = d.data();
      const cid = (data.customerId || data.id || d.id).toUpperCase();
      customersMap.set(cid, { ...data, customerId: cid });
    });

    // 2. Fetch all orders from Firebase
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const allOrders: any[] = [];
    ordersSnap.forEach(d => {
      const ord = d.data();
      allOrders.push({ ...ord, id: ord.id || d.id });
    });

    // 3. Fetch all loyalty records
    const loyaltySnap = await getDocs(collection(db, 'loyalty'));
    const loyaltyMap = new Map<string, any>();
    loyaltySnap.forEach(d => {
      const l = d.data();
      const cid = (l.customerId || d.id).toUpperCase();
      loyaltyMap.set(cid, { ...l, customerId: cid });
    });

    // 4. Fetch all customer offers
    const offersSnap = await getDocs(collection(db, 'customer_offers'));
    const allOffers: any[] = [];
    offersSnap.forEach(d => {
      const off = d.data();
      allOffers.push({ ...off, id: off.id || d.id });
    });

    // Merge any customer IDs found in orders
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

    let totalValidPurchases = 0;
    let customersWithPurchasesCount = 0;
    let rewardsUnlockedCount = 0;
    let rewardsRedeemedCount = 0;

    const customerSummaries = [];

    for (const [cid, cust] of customersMap.entries()) {
      // Customer orders
      const custOrders = allOrders.filter(ord => {
        const matchId = ord.customerId && String(ord.customerId).toUpperCase() === cid;
        const matchEmail = cust.email && ord.customerEmail && String(ord.customerEmail).toLowerCase().trim() === String(cust.email).toLowerCase().trim();
        const matchName = cust.name && ord.customerName && String(ord.customerName).toLowerCase().trim() === String(cust.name).toLowerCase().trim();
        return matchId || matchEmail || matchName;
      });

      // Valid purchases
      const seenOrd = new Set<string>();
      let stamps = 0;
      for (const ord of custOrders) {
        if (!ord.id || seenOrd.has(ord.id)) continue;
        if (!isOrderValid(ord)) continue;
        seenOrd.add(ord.id);
        stamps += countOrderSoapQuantity(ord);
      }

      totalValidPurchases += stamps;
      if (stamps > 0) {
        customersWithPurchasesCount++;
      }

      const loyalty = loyaltyMap.get(cid) || {
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

      const isUnlocked = stamps >= 10 || loyalty.unlocked;
      const isRedeemed = loyalty.rewardRedeemed === true;

      if (isUnlocked) rewardsUnlockedCount++;
      if (isRedeemed) rewardsRedeemedCount++;

      const custOffers = allOffers.filter(o => o.customerId && o.customerId.toUpperCase() === cid);

      let rewardStatus = 'In Progress';
      if (isRedeemed) {
        rewardStatus = 'Redeemed';
      } else if (isUnlocked) {
        rewardStatus = 'Unlocked';
      }

      customerSummaries.push({
        customerId: cid,
        customerName: cust.name || cust.fullName || loyalty.customerName || 'Valued Customer',
        email: cust.email || '',
        purchases: stamps,
        progress: `${Math.min(stamps, 10)}/10`,
        rewardStatus,
        isUnlocked,
        isRedeemed,
        secretGiftRevealed: loyalty.secretGiftRevealed || false,
        revealedGiftDescription: loyalty.revealedGiftDescription || 'Sacred Herbal Bath Ritual & Cold-Pressed Miniature Soap Pack (Worth ₹450)',
        activeOffers: custOffers.filter(o => o.status === 'active'),
        allOffers: custOffers,
        loyaltyRecord: loyalty,
        orders: custOrders
      });
    }

    const activeOffersTotal = allOffers.filter(o => o.status === 'active').length;

    return res.json({
      success: true,
      totalCustomers: customersMap.size,
      customersWithPurchases: customersWithPurchasesCount,
      totalValidPurchases,
      rewardsUnlocked: rewardsUnlockedCount,
      rewardsRedeemed: rewardsRedeemedCount,
      activeOffers: activeOffersTotal,
      customerSummaries
    });
  } catch (err: any) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server.use(express.static(distPath));
    server.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
