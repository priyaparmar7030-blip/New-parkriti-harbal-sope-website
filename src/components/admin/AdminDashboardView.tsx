import React, { useState, useEffect } from 'react';
import { ViewState, SoapProduct } from '../../types';
import { SOAPS_DATA } from '../../data/soaps';
import { db, auth, signOut, storage, ref, uploadBytes, getDownloadURL } from '../../lib/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

interface AdminDashboardViewProps {
  setCurrentView: (view: ViewState) => void;
  onLogout: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ setCurrentView, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'stock' | 'orders' | 'homepage' | 'recommendations' | 'settings'>('dashboard');
  
  // State for collections
  const [products, setProducts] = useState<SoapProduct[]>(SOAPS_DATA);
  const [orders, setOrders] = useState<any[]>([
    { id: 'ORD-9481', customer: 'Aarav Sharma', email: 'aarav@example.com', total: 303, status: 'Processing', date: '2026-09-04', items: '2x Neem Soap, 1x Sandalwood' },
    { id: 'ORD-9480', customer: 'Priya Patel', email: 'priya@example.com', total: 210, status: 'Shipped', date: '2026-09-03', items: '1x Tulsi Mint, 1x Aloe Honey' },
  ]);
  const [websiteSettings, setWebsiteSettings] = useState({
    announcement: '🌿 NEW ARRIVAL — Discover our 100% Natural Handcrafted Neem Soap',
    heroTitle: 'Pure Ayurvedic Soaps Crafted for Living Harmony',
    heroSubtitle: 'Ethically harvested wild botanicals and cold-pressed cold-process oils from Akola, Maharashtra.',
    heroImage: SOAPS_DATA[0].image,
    promoBanner: 'Free Delivery on Orders over ₹499 across India.',
    whatsappNumber: '919579408654',
    phoneNumber: '+91 95794 08654',
    address: 'Kala Maroti Road, Old City, Ambika Tailor, Akola, Maharashtra 444002',
    instagram: 'https://instagram.com/prakritisoap',
    facebook: 'https://facebook.com/prakritisoap',
    featuredProductIds: 'neem-soap, sandalwood-kesar',
    newProductIds: 'tulsi-mint, aloe-honey',
  });
  const [recommendationRules, setRecommendationRules] = useState([
    { id: 'rule-1', skinType: 'Oily', primaryNeed: 'Excess Oil', recommendedSoap: 'Prakriti Neem Soap' },
    { id: 'rule-2', skinType: 'Dry', primaryNeed: 'Nourishment', recommendedSoap: 'Raw Sandalwood & Kesar' },
    { id: 'rule-3', skinType: 'Sensitive', primaryNeed: 'Calming', recommendedSoap: 'Calming Aloe & Honey' },
  ]);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal / Editing states for Products
  const [editingProduct, setEditingProduct] = useState<SoapProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  useEffect(() => {
    fetchFirestoreData();
  }, []);

  const fetchFirestoreData = async () => {
    setLoading(true);
    try {
      // Fetch Products
      const prodSnapshot = await getDocs(collection(db, 'products'));
      if (!prodSnapshot.empty) {
        const prods = prodSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SoapProduct));
        setProducts(prods);
      } else {
        // Seed default products
        for (const p of SOAPS_DATA) {
          await setDoc(doc(db, 'products', p.id), p);
        }
      }

      // Fetch Orders
      const orderSnapshot = await getDocs(collection(db, 'orders'));
      if (!orderSnapshot.empty) {
        const ords = orderSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(ords);
      }

      // Fetch Settings
      const settingsDoc = await getDocs(collection(db, 'websiteSettings'));
      if (!settingsDoc.empty) {
        const data = settingsDoc.docs[0].data();
        setWebsiteSettings(prev => ({ ...prev, ...data }));
      } else {
        await setDoc(doc(db, 'websiteSettings', 'config'), websiteSettings);
      }

      // Fetch Rules
      const rulesSnapshot = await getDocs(collection(db, 'recommendationRules'));
      if (!rulesSnapshot.empty) {
        setRecommendationRules(rulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else {
        for (const r of recommendationRules) {
          await setDoc(doc(db, 'recommendationRules', r.id), r);
        }
      }
    } catch (e) {
      console.error("Error fetching Firestore data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await setDoc(doc(db, 'products', editingProduct.id), editingProduct);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
      showNotification('Product saved successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification('Product deleted.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'websiteSettings', 'config'), websiteSettings);
      showNotification('Website settings updated successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#1b1c1a] flex flex-col">
      {/* Top Header */}
      <header className="bg-[#072417] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧼</span>
          <div>
            <h1 className="font-['Playfair_Display'] text-lg font-bold tracking-tight">Prakriti Soap Admin</h1>
            <p className="text-[11px] text-[#85a490]">Authorized Management Console • {auth.currentUser?.email || 'admin@prakritisoap.com'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('home')}
            className="text-xs bg-white/10 px-3 py-2 rounded-xl hover:bg-white/25 transition-colors font-medium"
          >
            View Live Store
          </button>
          <button 
            onClick={async () => {
              await signOut(auth);
              onLogout();
            }}
            className="text-xs bg-[#ffdcbd] text-[#072417] px-3 py-2 rounded-xl hover:bg-white transition-colors font-semibold shadow-xs"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-[#cbe6d4] text-[#072417] px-6 py-3 text-center text-xs font-semibold shadow-sm transition-all">
          ✨ {successMessage}
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-6 gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 shrink-0">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
            { id: 'products', label: 'Products', icon: 'inventory_2' },
            { id: 'stock', label: 'Stock & Inventory', icon: 'warehouse' },
            { id: 'orders', label: 'Customer Orders', icon: 'shopping_bag' },
            { id: 'homepage', label: 'Homepage Settings', icon: 'web' },
            { id: 'recommendations', label: 'Recommendation Rules', icon: 'psychology' },
            { id: 'settings', label: 'System Settings', icon: 'settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#072417] text-[#ffdcbd] shadow-sm' 
                  : 'bg-white text-[#4c6455] hover:bg-[#ebefeb] border border-[#ebefeb]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white border border-[#ebefeb] rounded-2xl p-6 shadow-xs">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Store Performance Overview</h2>
                <p className="text-xs text-[#62776c] mt-1">Real-time metrics from Firestore collections.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#fbf9f6] p-5 rounded-2xl border border-[#ebefeb]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#62776c]">Total Products</p>
                  <p className="text-3xl font-bold text-[#072417] mt-2 font-['Playfair_Display']">{products.length}</p>
                  <span className="text-[11px] text-[#4c6455] mt-1 inline-block">Active catalog items</span>
                </div>
                <div className="bg-[#fbf9f6] p-5 rounded-2xl border border-[#ebefeb]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#62776c]">Total Orders</p>
                  <p className="text-3xl font-bold text-[#072417] mt-2 font-['Playfair_Display']">{orders.length}</p>
                  <span className="text-[11px] text-[#4c6455] mt-1 inline-block">+12% this week</span>
                </div>
                <div className="bg-[#fbf9f6] p-5 rounded-2xl border border-[#ebefeb]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#62776c]">Low Stock Alerts</p>
                  <p className="text-3xl font-bold text-amber-700 mt-2 font-['Playfair_Display']">
                    {products.filter(p => p.stockStatus !== 'In Stock').length}
                  </p>
                  <span className="text-[11px] text-amber-800 mt-1 inline-block">Require replenishment</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ebefeb]">
                <h3 className="text-sm font-bold text-[#072417] mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setActiveTab('products')}
                    className="px-4 py-2.5 bg-[#072417] text-white rounded-xl text-xs font-semibold hover:bg-[#072417]/90 transition-colors"
                  >
                    Manage Product Catalog
                  </button>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="px-4 py-2.5 bg-[#fbf9f6] text-[#072417] border border-[#d2dcd5] rounded-xl text-xs font-semibold hover:bg-[#ebefeb] transition-colors"
                  >
                    View Recent Orders
                  </button>
                  <button 
                    onClick={() => setActiveTab('homepage')}
                    className="px-4 py-2.5 bg-[#fbf9f6] text-[#072417] border border-[#d2dcd5] rounded-xl text-xs font-semibold hover:bg-[#ebefeb] transition-colors"
                  >
                    Update Homepage Ticker
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Products Management</h2>
                  <p className="text-xs text-[#62776c] mt-1">Add, edit, upload photos, and manage organic soaps.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingProduct({
                      id: `soap-${Date.now()}`,
                      name: 'New Botanical Soap',
                      subtitle: 'Organic cold-pressed oils',
                      price: 199,
                      rating: 5.0,
                      stockStatus: 'In Stock',
                      image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80',
                      tags: ['all', 'daily', 'new'],
                      category: 'daily',
                      description: 'Handcrafted Ayurvedic soap bar with pristine wild herbs.',
                      benefits: ['Deep cleansing', 'Nourishing oils', 'Soothes inflammation'],
                      weight: '100g Pure Bar',
                      ingredients: ['Neem Oil', 'Coconut Oil', 'Aloe Vera Extract', 'Turmeric'],
                      suitableSkinTypes: ['All Skin Types', 'Oily Skin'],
                      isActive: true
                    });
                  }}
                  className="px-4 py-2 bg-[#072417] text-white rounded-xl text-xs font-semibold hover:bg-[#072417]/90 transition-colors"
                >
                  + Add New Product
                </button>
              </div>

              {editingProduct && (
                <div className="bg-[#fbf9f6] p-6 rounded-2xl border border-[#d2dcd5] mb-6">
                  <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#072417] mb-4">
                    {products.some(p => p.id === editingProduct.id) ? 'Edit Product' : 'Create New Product'}
                  </h3>
                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Product Name</label>
                      <input 
                        type="text" 
                        value={editingProduct.name || ''}
                        onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Subtitle</label>
                      <input 
                        type="text" 
                        value={editingProduct.subtitle || ''}
                        onChange={e => setEditingProduct({...editingProduct, subtitle: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Price (₹)</label>
                      <input 
                        type="number" 
                        value={editingProduct.price ?? ''}
                        onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Weight / Size</label>
                      <input 
                        type="text" 
                        value={editingProduct.weight || ''}
                        onChange={e => setEditingProduct({...editingProduct, weight: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        placeholder="e.g. 100g Pure Bar"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Stock Status</label>
                      <select 
                        value={editingProduct.stockStatus}
                        onChange={e => setEditingProduct({...editingProduct, stockStatus: e.target.value as any})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Only 3 left">Only 3 left</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Status (Active / Inactive)</label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={editingProduct.isActive !== false}
                            onChange={e => setEditingProduct({...editingProduct, isActive: e.target.checked})}
                            className="rounded text-[#072417] focus:ring-[#072417]"
                          />
                          Active in Storefront
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Product Photo (Upload to Firebase Storage or URL)</label>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input 
                          type="text" 
                          value={editingProduct.image || ''}
                          onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                          className="flex-1 px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                          placeholder="Image URL or Firebase Storage URL"
                          required
                        />
                        <label className={`px-4 py-2 bg-[#fbf9f6] border border-[#d2dcd5] text-[#072417] rounded-xl text-xs font-semibold cursor-pointer hover:bg-[#ebefeb] transition-colors whitespace-nowrap ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingImage ? '⏳ Uploading...' : '📁 Upload Photo'}
                          <input 
                            type="file" 
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            disabled={uploadingImage}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !editingProduct) return;

                              const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                              if (!validTypes.includes(file.type)) {
                                alert('Invalid file type. Please select a JPG, JPEG, PNG, or WEBP image.');
                                e.target.value = '';
                                return;
                              }

                              const maxSize = 5 * 1024 * 1024; // 5MB
                              if (file.size > maxSize) {
                                alert('File size exceeds 5MB limit. Please choose a smaller image.');
                                e.target.value = '';
                                return;
                              }

                              const previousImage = editingProduct.image;
                              const localPreview = URL.createObjectURL(file);

                              try {
                                setUploadingImage(true);
                                showNotification('Uploading image to Firebase Storage...');
                                setEditingProduct(prev => prev ? ({ ...prev, image: localPreview }) : null);

                                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                                const snapshot = await uploadBytes(storageRef, file);
                                const downloadUrl = await getDownloadURL(snapshot.ref);

                                setEditingProduct(prev => prev ? ({ ...prev, image: downloadUrl }) : null);
                                showNotification('Image uploaded successfully to Firebase Storage!');
                              } catch (err: any) {
                                console.error('Upload error:', err);
                                alert(`Upload failed: ${err.message || 'Unknown error'}. Please check your connection or Firebase Storage configuration.`);
                                setEditingProduct(prev => prev ? ({ ...prev, image: previousImage }) : null);
                              } finally {
                                setUploadingImage(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                      {editingProduct.image && (
                        <div className="mt-2 flex items-center gap-3">
                          <img src={editingProduct.image} alt="Preview" className="w-12 h-12 object-cover rounded-xl border" />
                          <span className="text-[10px] text-[#62776c]">
                            {uploadingImage ? 'Uploading to Firebase Storage...' : 'Photo preview active'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Ingredients (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.ingredients?.join(', ') || ''}
                        onChange={e => setEditingProduct({...editingProduct, ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        placeholder="Neem Oil, Coconut Oil, Aloe Vera"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Benefits (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.benefits?.join(', ') || ''}
                        onChange={e => setEditingProduct({...editingProduct, benefits: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        placeholder="Deep cleansing, Nourishing, Calming"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Suitable Skin Types (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.suitableSkinTypes?.join(', ') || ''}
                        onChange={e => setEditingProduct({...editingProduct, suitableSkinTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs"
                        placeholder="All Skin Types, Oily Skin, Sensitive"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Product Badges / Status Tags</label>
                      <div className="flex gap-4 mt-2">
                        {['new', 'featured', 'offer', 'best-seller'].map(tag => {
                          const hasTag = editingProduct.tags?.includes(tag);
                          return (
                            <label key={tag} className="flex items-center gap-1.5 text-xs capitalize cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={hasTag}
                                onChange={e => {
                                  const currentTags = editingProduct.tags || ['all'];
                                  const nextTags = e.target.checked 
                                    ? [...currentTags, tag]
                                    : currentTags.filter(t => t !== tag);
                                  setEditingProduct({...editingProduct, tags: nextTags, badge: e.target.checked ? tag.toUpperCase() : editingProduct.badge});
                                }}
                                className="rounded text-[#072417]"
                              />
                              {tag}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#072417] mb-1">Description</label>
                      <textarea 
                        value={editingProduct.description || ''}
                        onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-[#d2dcd5] rounded-xl text-xs h-20"
                        required
                      />
                    </div>

                    <div className="flex gap-2 sm:col-span-2 pt-2">
                      <button type="submit" className="px-4 py-2 bg-[#072417] text-white rounded-xl text-xs font-semibold hover:bg-[#072417]/90">
                        Save Product to Firestore
                      </button>
                      <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-white border border-[#d2dcd5] text-[#072417] rounded-xl text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fbf9f6] text-[#62776c] uppercase font-semibold">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Weight & Price</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebefeb]">
                    {products.map(prod => (
                      <tr key={prod.id} className={`hover:bg-[#fbf9f6]/50 ${prod.isActive === false ? 'opacity-50 bg-gray-50' : ''}`}>
                        <td className="p-3 flex items-center gap-3">
                          <img src={prod.image} alt={prod.name} className="w-10 h-10 object-cover rounded-xl border border-[#ebefeb]" />
                          <div>
                            <p className="font-bold text-[#072417]">{prod.name} {prod.badge && <span className="ml-1 px-1.5 py-0.5 bg-[#ffdcbd] text-[#072417] rounded text-[9px]">{prod.badge}</span>}</p>
                            <p className="text-[10px] text-[#85a490]">{prod.subtitle}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-[#072417]">₹{prod.price}</p>
                          <p className="text-[10px] text-[#62776c]">{prod.weight}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                            prod.stockStatus === 'In Stock' ? 'bg-[#cbe6d4] text-[#072417]' :
                            prod.stockStatus === 'Only 3 left' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {prod.stockStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                            prod.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {prod.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button 
                            onClick={() => setEditingProduct(prod)}
                            className="px-2.5 py-1 bg-[#fbf9f6] border border-[#d2dcd5] text-[#072417] rounded-lg font-medium hover:bg-[#ebefeb]"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Stock & Inventory Control</h2>
                <p className="text-xs text-[#62776c] mt-1">Monitor bar counts and availability status across batches.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map(prod => (
                  <div key={prod.id} className="p-4 bg-[#fbf9f6] border border-[#ebefeb] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={prod.image} alt={prod.name} className="w-12 h-12 object-cover rounded-xl border" />
                      <div>
                        <h4 className="font-bold text-xs text-[#072417]">{prod.name}</h4>
                        <p className="text-[10px] text-[#62776c]">{prod.weight}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={prod.stockStatus}
                        onChange={async e => {
                          const updated = { ...prod, stockStatus: e.target.value as any };
                          await setDoc(doc(db, 'products', prod.id), updated);
                          setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
                          showNotification(`Updated stock status for ${prod.name}`);
                        }}
                        className="px-3 py-1.5 bg-white border border-[#d2dcd5] rounded-xl text-xs font-semibold"
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Only 3 left">Only 3 left</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Customer Orders</h2>
                <p className="text-xs text-[#62776c] mt-1">Track and fulfill customer orders placed on the store. Updating an order to Cancelled will safely restore product stock.</p>
              </div>

              <div className="space-y-3">
                {orders.map((order, idx) => (
                  <div key={order.id || idx} className="p-4 bg-[#fbf9f6] border border-[#ebefeb] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#072417]">{order.id}</span>
                        <span className="text-[10px] text-[#85a490]">• {order.date || order.createdAt?.split('T')[0]}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#072417]">{order.customerName || order.customer || 'Valued Customer'}</p>
                      <p className="text-[11px] text-[#62776c]">Delivery / Phone: {order.customerAddress || 'Akola / All-India'}</p>
                      <p className="text-[11px] font-medium text-[#072417] mt-1">Products & Qty: <span className="text-[#62776c]">{order.items}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#072417]">₹{order.total}</span>
                        <span className={`block text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-md ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          order.status === 'Packed' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status || 'New'}
                        </span>
                      </div>
                      <select 
                        value={order.status || 'New'}
                        onChange={async e => {
                          const nextStatus = e.target.value;
                          const prevStatus = order.status || 'New';

                          // If changing TO Cancelled from a non-cancelled status, restore stock
                          if (nextStatus === 'Cancelled' && prevStatus !== 'Cancelled') {
                            try {
                              const itemsToRestore = order.quantities || [];
                              for (const qi of itemsToRestore) {
                                const prod = products.find(p => p.id === qi.productId);
                                if (prod) {
                                  const currentCount = prod.stockCount !== undefined ? prod.stockCount : (prod.stockStatus === 'Out of Stock' ? 0 : prod.stockStatus === 'Only 3 left' ? 3 : 20);
                                  const nextCount = currentCount + qi.quantity;
                                  const nextStockStatus = nextCount === 0 ? 'Out of Stock' : nextCount <= 3 ? 'Only 3 left' : 'In Stock';
                                  const updatedProd = { ...prod, stockCount: nextCount, stockStatus: nextStockStatus };
                                  await setDoc(doc(db, 'products', prod.id), updatedProd);
                                  setProducts(prev => prev.map(p => p.id === prod.id ? updatedProd : p));
                                }
                              }
                            } catch (err) {
                              console.error("Error restoring stock on cancellation:", err);
                            }
                          }

                          // Update order in Firestore
                          try {
                            await setDoc(doc(db, 'orders', order.id), { status: nextStatus }, { merge: true });
                          } catch (err) {
                            console.error("Error updating order status in Firestore:", err);
                          }

                          setOrders(prev => prev.map((o, i) => i === idx ? { ...o, status: nextStatus } : o));
                          showNotification(`Order ${order.id} status updated to ${nextStatus}${nextStatus === 'Cancelled' ? ' (Stock restored)' : ''}`);
                        }}
                        className="px-3 py-1.5 bg-white border border-[#d2dcd5] rounded-xl text-xs font-semibold"
                      >
                        <option value="New">New</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Packed">Packed</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'homepage' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Website Content & Settings</h2>
                <p className="text-xs text-[#62776c] mt-1">Manage hero text, banner, featured products, and contact details. Changes instantly appear on the customer website.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Announcement Text (Marquee Ticker)</label>
                  <input 
                    type="text" 
                    value={websiteSettings.announcement}
                    onChange={e => setWebsiteSettings({...websiteSettings, announcement: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Hero Heading</label>
                  <input 
                    type="text" 
                    value={websiteSettings.heroTitle}
                    onChange={e => setWebsiteSettings({...websiteSettings, heroTitle: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Hero Subtitle</label>
                  <textarea 
                    value={websiteSettings.heroSubtitle}
                    onChange={e => setWebsiteSettings({...websiteSettings, heroSubtitle: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Hero Image URL</label>
                  <input 
                    type="text" 
                    value={websiteSettings.heroImage}
                    onChange={e => setWebsiteSettings({...websiteSettings, heroImage: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Promotional Banner / Pill Text</label>
                  <input 
                    type="text" 
                    value={websiteSettings.promoBanner}
                    onChange={e => setWebsiteSettings({...websiteSettings, promoBanner: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#072417] mb-1.5">Featured Products (IDs)</label>
                    <input 
                      type="text" 
                      value={websiteSettings.featuredProductIds}
                      onChange={e => setWebsiteSettings({...websiteSettings, featuredProductIds: e.target.value})}
                      className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#072417] mb-1.5">New Products (IDs)</label>
                    <input 
                      type="text" 
                      value={websiteSettings.newProductIds}
                      onChange={e => setWebsiteSettings({...websiteSettings, newProductIds: e.target.value})}
                      className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={websiteSettings.whatsappNumber}
                    onChange={e => setWebsiteSettings({...websiteSettings, whatsappNumber: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Phone Number</label>
                  <input 
                    type="text" 
                    value={websiteSettings.phoneNumber}
                    onChange={e => setWebsiteSettings({...websiteSettings, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#072417] mb-1.5">Address</label>
                  <textarea 
                    value={websiteSettings.address}
                    onChange={e => setWebsiteSettings({...websiteSettings, address: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs h-16"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#072417] mb-1.5">Instagram URL</label>
                    <input 
                      type="text" 
                      value={websiteSettings.instagram}
                      onChange={e => setWebsiteSettings({...websiteSettings, instagram: e.target.value})}
                      className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#072417] mb-1.5">Facebook URL</label>
                    <input 
                      type="text" 
                      value={websiteSettings.facebook}
                      onChange={e => setWebsiteSettings({...websiteSettings, facebook: e.target.value})}
                      className="w-full px-3 py-2.5 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  className="px-6 py-3 bg-[#072417] text-white rounded-xl text-xs font-semibold hover:bg-[#072417]/90 shadow-sm"
                >
                  Save All Website Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">Recommendation Rules</h2>
                <p className="text-xs text-[#62776c] mt-1">Configure Find My Soap quiz logic and skin matching rules.</p>
              </div>

              <div className="space-y-3">
                {recommendationRules.map((rule, idx) => (
                  <div key={rule.id} className="p-4 bg-[#fbf9f6] border border-[#ebefeb] rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#85a490] uppercase tracking-wider">Rule #{idx + 1}</span>
                      <p className="text-xs font-semibold text-[#072417] mt-0.5">Skin Type: {rule.skinType} • Need: {rule.primaryNeed}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-[#cbe6d4] text-[#072417] rounded-xl text-xs font-semibold">
                        → {rule.recommendedSoap}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417]">System & Security Settings</h2>
                <p className="text-xs text-[#62776c] mt-1">Admin authentication and Firebase project status.</p>
              </div>

              <div className="bg-[#fbf9f6] p-5 rounded-2xl border border-[#ebefeb] space-y-3 max-w-xl">
                <div>
                  <span className="text-xs font-semibold text-[#62776c] uppercase tracking-wider">Firebase Project ID</span>
                  <p className="text-sm font-bold text-[#072417] mt-0.5">soy-retina-0n50x</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#62776c] uppercase tracking-wider">Authorized Admin Email</span>
                  <p className="text-sm font-bold text-[#072417] mt-0.5">{auth.currentUser?.email || 'admin@prakritisoap.com'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#62776c] uppercase tracking-wider">Firestore Database</span>
                  <p className="text-sm font-bold text-[#072417] mt-0.5">Connected & Synchronized</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
