import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const server = express();
const PORT = 3000;

server.use(express.json());

// Helper: Hash password
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Helper: Verify password
function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

// Helper: Generate unique customer ID
async function generateUniqueCustomerId(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
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
  return `CUS-${Date.now().toString(36).toUpperCase()}`;
}

// API: Customer Signup
server.post('/api/customer-signup', async (req, res) => {
  try {
    const { fullName, password, email } = req.body;
    if (!fullName || !password) {
      return res.status(400).json({ error: 'Full name and password are required.' });
    }

    const customerId = await generateUniqueCustomerId();
    const { hash, salt } = hashPassword(password);
    const createdAt = new Date().toISOString();

    const customerData = {
      customerId,
      name: fullName.trim(),
      email: email ? email.trim() : '',
      passwordHash: hash,
      passwordSalt: salt,
      role: 'customer',
      createdAt
    };

    await setDoc(doc(db, 'customers', customerId), customerData);

    return res.json({
      success: true,
      customer: {
        id: customerId,
        customerId,
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
    if (!customerId || !password) {
      return res.status(400).json({ error: 'Customer ID and password are required.' });
    }

    const cleanId = customerId.trim().toUpperCase();
    const docRef = doc(db, 'customers', cleanId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return res.status(401).json({ error: 'Invalid Customer ID or password.' });
    }

    const data = snap.data();
    const isValid = verifyPassword(password, data.passwordHash, data.passwordSalt);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Customer ID or password.' });
    }

    return res.json({
      success: true,
      customer: {
        id: data.customerId,
        customerId: data.customerId,
        fullName: data.name,
        email: data.email || '',
        role: data.role || 'customer',
        createdAt: data.createdAt
      }
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login.' });
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
