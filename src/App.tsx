import { useState, useEffect } from 'react';
import { ViewState, SoapProduct, CartItem, WebsiteSettings, CustomerUser, Order } from './types';
import { SOAPS_DATA } from './data/soaps';
import { auth, onAuthStateChanged, signOut as firebaseSignOut, db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { HomeView } from './views/HomeView';
import { ShopView } from './views/ShopView';
import { ProductDetailView } from './views/ProductDetailView';
import { FindMySoapView } from './views/FindMySoapView';
import { BagView } from './views/BagView';
import { AboutView } from './views/AboutView';
import { CustomerAccountView } from './views/CustomerAccountView';
import { AdminDashboardView } from './views/AdminDashboardView';

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'priyaparmar7030@gmail.com';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [products, setProducts] = useState<SoapProduct[]>(SOAPS_DATA);
  const [selectedSoap, setSelectedSoap] = useState<SoapProduct>(SOAPS_DATA[0]);
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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
  
  // Pre-loaded cart
  const [cart, setCart] = useState<CartItem[]>([
    { product: SOAPS_DATA[0], quantity: 2 },
    { product: SOAPS_DATA[2], quantity: 1 }
  ]);

  useEffect(() => {
    // 1. Verify customer session if customer session token exists
    const customerToken = localStorage.getItem('prakriti_customer_token');
    if (customerToken) {
      fetch('/api/customer-session', {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.customer) {
            setCurrentUser(data.customer);
          } else {
            localStorage.removeItem('prakriti_customer_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('prakriti_customer_token');
        });
    }

    // 2. Firebase auth listener for Owner Google Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
        setCurrentUser({
          id: user.uid,
          customerId: isOwner ? 'OWNER' : undefined,
          email: user.email || '',
          fullName: user.displayName || (isOwner ? 'Store Owner' : 'Valued Customer'),
          role: isOwner ? 'owner' : 'customer',
          createdAt: user.metadata.creationTime || new Date().toISOString()
        });
      } else {
        if (!localStorage.getItem('prakriti_customer_token')) {
          setCurrentUser(null);
        }
      }
    });

    // Load products and settings from Firestore if available
    async function loadFirestoreData() {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        if (!prodSnap.empty) {
          const loadedProducts = prodSnap.docs.map(d => d.data() as SoapProduct);
          if (loadedProducts.length > 0) {
            setProducts(loadedProducts);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'products');
      }
    }
    loadFirestoreData();

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('prakriti_customer_token');
      await fetch('/api/customer-logout', { method: 'POST' }).catch(() => {});
      await firebaseSignOut(auth).catch(() => {});
      setCurrentUser(null);
      setCurrentView('home');
    } catch (e) {
      console.error(e);
    }
  };

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

      const updatedProducts = products.map(prod => {
        const cartItem = cart.find(i => i.product.id === prod.id);
        if (!cartItem) return prod;
        const currentCount = prod.stockCount !== undefined ? prod.stockCount : (prod.stockStatus === 'Out of Stock' ? 0 : prod.stockStatus === 'Only 3 left' ? 3 : 20);
        const nextCount = Math.max(0, currentCount - cartItem.quantity);
        const nextStatus = nextCount === 0 ? 'Out of Stock' : nextCount <= 3 ? 'Only 3 left' : 'In Stock';
        return { ...prod, stockCount: nextCount, stockStatus: nextStatus };
      });

      setProducts(updatedProducts);

      // Save order to Firestore
      const newOrder: Order = {
        id: orderId,
        customerId: currentUser?.customerId || '',
        customerName: customerName || currentUser?.fullName || 'Valued Customer',
        customerEmail: currentUser?.email || 'customer@prakritisoap.com',
        customerAddress: customerAddress || 'Akola / All-India',
        date: new Date().toISOString().split('T')[0],
        items: cart.map(i => `${i.quantity}x ${i.product.name} (${i.product.weight || '100g'})`).join(', '),
        quantities: cart.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity })),
        total: totalAmount,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'orders', orderId), newOrder);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
      }

      // Also persist to customer local orders list
      try {
        const existingOrders = JSON.parse(localStorage.getItem('prakriti_orders') || '[]');
        localStorage.setItem('prakriti_orders', JSON.stringify([newOrder, ...existingOrders]));
      } catch (e) {
        console.error('Error saving local order:', e);
      }

      // If customer is logged in, sync loyalty immediately
      if (currentUser?.customerId) {
        fetch('/api/customer-loyalty/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: currentUser.customerId,
            clientOrders: [newOrder]
          })
        }).catch(() => {});
      }

      setCart([]);
    } catch (e) {
      console.error("Error reducing stock on checkout:", e);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Enforce security check for admin dashboard view
  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const effectiveView = (currentView === 'admin-dashboard' && !isOwner) ? 'customer-account' : currentView;

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#1b1c1a] font-['Plus_Jakarta_Sans'] flex flex-col selection:bg-[#cbe6d4] selection:text-[#072417]">
      <Header 
        currentView={effectiveView} 
        setCurrentView={setCurrentView} 
        cartCount={totalCartCount} 
        announcement={websiteSettings.announcement}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main className="flex flex-col relative w-full pt-24 pb-28 max-w-4xl mx-auto flex-1">
        {effectiveView === 'home' && (
          <HomeView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
            settings={websiteSettings}
          />
        )}
        {effectiveView === 'shop' && (
          <ShopView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
          />
        )}
        {effectiveView === 'product-detail' && (
          <ProductDetailView 
            product={products.find(p => p.id === selectedSoap.id) || selectedSoap} 
            setCurrentView={setCurrentView} 
            addToCart={addToCart} 
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            products={products}
          />
        )}
        {effectiveView === 'find-my-soap' && (
          <FindMySoapView 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            addToCart={addToCart} 
            products={products}
          />
        )}
        {effectiveView === 'bag' && (
          <BagView 
            cart={cart} 
            updateQuantity={updateQuantity} 
            removeItem={removeItem} 
            setCurrentView={setCurrentView} 
            setSelectedSoap={setSelectedSoap} 
            onCheckout={handleCheckoutAndReduceStock}
          />
        )}
        {effectiveView === 'about' && (
          <AboutView 
            setCurrentView={setCurrentView} 
          />
        )}
        {effectiveView === 'customer-account' && currentUser && (
          <CustomerAccountView 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            setCurrentView={setCurrentView} 
          />
        )}
        {effectiveView === 'admin-dashboard' && isOwner && (
          <AdminDashboardView 
            products={products}
            setProducts={setProducts}
            websiteSettings={websiteSettings}
            setWebsiteSettings={setWebsiteSettings}
            onLogout={handleLogout}
            setCurrentView={setCurrentView}
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
        currentView={effectiveView} 
        setCurrentView={setCurrentView} 
        cartCount={totalCartCount} 
      />

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const ownerMatch = user.role === 'owner' || (Boolean(user.email) && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
          if (ownerMatch) {
            setCurrentView('admin-dashboard');
          } else {
            setCurrentView('customer-account');
          }
        }}
      />
    </div>
  );
}
