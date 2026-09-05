import { useState, useEffect } from 'react';
import { ViewState, SoapProduct, CartItem, WebsiteSettings } from './types';
import { SOAPS_DATA } from './data/soaps';
import { db } from './lib/firebase';
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
    return (
      <AdminDashboardView 
        setCurrentView={setCurrentView} 
        onLogout={() => setCurrentView('home')} 
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
          <AdminLoginView 
            setCurrentView={setCurrentView} 
            onLoginSuccess={() => setCurrentView('admin-dashboard')} 
          />
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
