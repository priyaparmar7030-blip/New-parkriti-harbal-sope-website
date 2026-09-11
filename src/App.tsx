import { useState, useEffect } from 'react';
import { ViewState, SoapProduct, CartItem, WebsiteSettings } from './types';
import { SOAPS_DATA } from './data/soaps';
import { db, auth, onAuthStateChanged, signOut, type User } from './lib/firebase';
import { collection, getDocs, setDoc, doc, addDoc } from 'firebase/firestore';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { ShopView } from './views/ShopView';
import { ProductDetailView } from './views/ProductDetailView';
import { FindMySoapView } from './views/FindMySoapView';
import { BagView } from './views/BagView';
import { AboutView } from './views/AboutView';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [products, setProducts] = useState<SoapProduct[]>(SOAPS_DATA);
  const [selectedSoap, setSelectedSoap] = useState<SoapProduct>(SOAPS_DATA[0]);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    heroTitle: 'Pure Ayurvedic Soaps Crafted for Living Harmony',
    heroSubtitle: 'Ethically harvested wild botanicals and cold-pressed cold-process oils from Akola, Maharashtra.',
    heroImage: SOAPS_DATA[0].image,
    announcement: '🌿 NEW ARRIVAL — Discover our 100% Natural Handcrafted Neem Soap',
    promoBanner: 'Free Delivery on Orders over ₹499 across India.',
    whatsappNumber: '919579408654',
    phoneNumber: '+91 95794 08654',
    address: 'Kala Maroti Road, Old City, Ambika Tailor, Akola, Maharashtra 444002',
    instagram: 'https://instagram.com/prakritisoap',
    facebook: 'https://facebook.com/prakritisoap',
    featuredProductIds: 'neem-soap, sandalwood-kesar',
    newProductIds: 'tulsi-mint, aloe-honey',
  });
  
  // Pre-loaded cart matching Stitch design with 2 items (2x Neem Soap, 1x Sandalwood & Kesar)
  const [cart, setCart] = useState<CartItem[]>([
    { product: SOAPS_DATA[0], quantity: 2 },
    { product: SOAPS_DATA[2], quantity: 1 }
  ]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        if (!prodSnap.empty) {
          const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as SoapProduct));
          setProducts(prods);
        } else {
          for (const p of SOAPS_DATA) {
            await setDoc(doc(db, 'products', p.id), p);
          }
        }

        const settingsSnap = await getDocs(collection(db, 'websiteSettings'));
        if (!settingsSnap.empty) {
          setWebsiteSettings(settingsSnap.docs[0].data() as WebsiteSettings);
        } else {
          await setDoc(doc(db, 'websiteSettings', 'config'), websiteSettings);
        }
      } catch (e) {
        console.error("Error loading data from Firestore:", e);
      }
    }
    loadData();
  }, [currentView]); // Re-fetch settings when view changes so admin updates appear instantly

  const addToCart = (soap: SoapProduct) => {
    if (soap.stockStatus === 'Out of Stock') return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === soap.id);
      const currentQty = existing ? existing.quantity : 0;
      const maxStock = soap.stockCount !== undefined ? soap.stockCount : (soap.stockStatus === 'Only 3 left' ? 3 : 25);
      if (currentQty >= maxStock) {
        alert('Cannot add more than available stock!');
        return prev;
      }
      if (existing) {
        return prev.map(item => 
          item.product.id === soap.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: soap, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQty = item.quantity + delta;
        const soap = products.find(p => p.id === productId) || item.product;
        const maxStock = soap.stockCount !== undefined ? soap.stockCount : (soap.stockStatus === 'Only 3 left' ? 3 : 25);
        if (delta > 0 && nextQty > maxStock) {
          alert('Cannot exceed available stock!');
          return item;
        }
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckoutAndReduceStock = async (customerName: string, customerAddress: string) => {
    try {
      // Validate stock again
      for (const item of cart) {
        const prod = products.find(p => p.id === item.product.id);
        if (!prod) continue;
        const currentCount = prod.stockCount !== undefined ? prod.stockCount : (prod.stockStatus === 'Out of Stock' ? 0 : prod.stockStatus === 'Only 3 left' ? 3 : 20);
        if (item.quantity > currentCount) {
          alert(`Sorry, ${prod.name} only has ${currentCount} left in stock. Please adjust quantity.`);
          return;
        }
      }

      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = cart.reduce((s, i) => s + (i.product.price * i.quantity), 0);

      for (const item of cart) {
        const prod = products.find(p => p.id === item.product.id);
        if (prod) {
          const currentCount = prod.stockCount !== undefined ? prod.stockCount : (prod.stockStatus === 'Out of Stock' ? 0 : prod.stockStatus === 'Only 3 left' ? 3 : 20);
          const nextCount = Math.max(0, currentCount - item.quantity);
          const nextStatus = nextCount === 0 ? 'Out of Stock' : nextCount <= 3 ? 'Only 3 left' : 'In Stock';
          
          const updated = { ...prod, stockCount: nextCount, stockStatus: nextStatus };
          await setDoc(doc(db, 'products', prod.id), updated);
        }
      }

      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        customerName: customerName || 'Valued Customer',
        customerAddress: customerAddress || 'Akola / All-India',
        date: new Date().toISOString().split('T')[0],
        items: cart.map(i => `${i.quantity}x ${i.product.name} (${i.product.weight || '100g'})`).join(', '),
        quantities: cart.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity })),
        total: totalAmount,
        status: 'New',
        createdAt: new Date().toISOString()
      });

      // Reload products
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SoapProduct)));
      }
    } catch (e) {
      console.error("Error reducing stock on checkout:", e);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (currentView === 'admin-dashboard') {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#fbf9f6] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans']">
          <div className="w-10 h-10 border-3 border-[#072417] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-[#4c6455] tracking-widest uppercase">Checking authentication...</p>
        </div>
      );
    }
    if (!currentUser) {
      return (
        <AdminLoginView 
          setCurrentView={setCurrentView} 
          onLoginSuccess={() => setCurrentView('admin-dashboard')} 
        />
      );
    }
    return (
      <AdminDashboardView 
        setCurrentView={setCurrentView} 
        onLogout={async () => {
          await signOut(auth);
          setCurrentView('home');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#1b1c1a] font-['Plus_Jakarta_Sans'] flex flex-col selection:bg-[#cbe6d4] selection:text-[#072417]">
      <Header 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        cartCount={totalCartCount} 
        announcement={websiteSettings.announcement}
        currentUser={currentUser}
      />

      <main className="flex flex-col relative w-full pt-24 pb-28 max-w-4xl mx-auto flex-1">
        {currentView === 'home' && (
          <HomeView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
            settings={websiteSettings}
          />
        )}
        {currentView === 'shop' && (
          <ShopView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
          />
        )}
        {currentView === 'product-detail' && (
          <ProductDetailView 
            product={products.find(p => p.id === selectedSoap.id) || selectedSoap} 
            setCurrentView={setCurrentView} 
            addToCart={addToCart} 
            products={products}
          />
        )}
        {currentView === 'find-my-soap' && (
          <FindMySoapView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
          />
        )}
        {currentView === 'bag' && (
          <BagView 
            cart={cart} 
            updateQuantity={updateQuantity} 
            removeItem={removeItem} 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            onCheckout={handleCheckoutAndReduceStock}
          />
        )}
        {currentView === 'about' && (
          <AboutView 
            setCurrentView={setCurrentView} 
          />
        )}
        {currentView === 'admin-login' && (
          authLoading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#072417] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-semibold text-[#4c6455] tracking-widest uppercase">Checking session...</p>
            </div>
          ) : currentUser ? (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-[#ebefeb] text-center">
                <div className="w-14 h-14 bg-[#072417] text-[#ffdcbd] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-md">
                  🌿
                </div>
                <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">Already Signed In</h2>
                <p className="text-xs text-[#62776c] mt-2">
                  You are currently authenticated as <br />
                  <span className="font-semibold text-[#072417]">{currentUser.email || currentUser.displayName || 'Prakriti User'}</span>
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin-dashboard')}
                    className="w-full py-3 bg-[#072417] text-white rounded-xl font-semibold text-sm hover:bg-[#072417]/90 transition-all shadow-md cursor-pointer"
                  >
                    Go to Admin Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut(auth);
                      setCurrentView('admin-login');
                    }}
                    className="w-full py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] text-[#072417] rounded-xl font-medium text-xs hover:bg-[#ebefeb] transition-colors cursor-pointer"
                  >
                    Sign Out & Switch Account
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <AdminLoginView 
              setCurrentView={setCurrentView} 
              onLoginSuccess={() => setCurrentView('admin-dashboard')} 
            />
          )
        )}
      </main>

      <Footer 
        setCurrentView={setCurrentView} 
        phoneNumber={websiteSettings.phoneNumber}
        whatsappNumber={websiteSettings.whatsappNumber}
        address={websiteSettings.address}
        instagram={websiteSettings.instagram}
        facebook={websiteSettings.facebook}
      />

      <BottomNav 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        cartCount={totalCartCount} 
      />
    </div>
  );
}
