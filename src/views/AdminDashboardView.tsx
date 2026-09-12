import React, { useState, useEffect } from 'react';
import { SoapProduct, Order, WebsiteSettings, ViewState, Review } from '../types';
import { db, storage, ref, uploadBytes, getDownloadURL, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { AdminLoyaltyRewardsSection } from '../components/AdminLoyaltyRewardsSection';

interface AdminDashboardViewProps {
  products: SoapProduct[];
  setProducts: React.Dispatch<React.SetStateAction<SoapProduct[]>>;
  websiteSettings: WebsiteSettings;
  setWebsiteSettings: React.Dispatch<React.SetStateAction<WebsiteSettings>>;
  onLogout: () => void;
  setCurrentView: (view: ViewState) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  products,
  setProducts,
  websiteSettings,
  setWebsiteSettings,
  onLogout,
  setCurrentView
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews' | 'settings' | 'loyalty'>('products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settingsForm, setSettingsForm] = useState<WebsiteSettings>(websiteSettings);
  const [savedToast, setSavedToast] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Product modal state for Add / Edit
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<SoapProduct> | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const loadedOrders = ordersSnap.docs.map(d => d.data() as Order);
        setOrders(loadedOrders);

        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const loadedReviews = reviewsSnap.docs.map(d => d.data() as Review);
        setReviews(loadedReviews);
      } catch (e) {
        console.error("Admin data fetch error:", e);
      }
    }
    fetchAdminData();
  }, []);

  const handleStockUpdate = async (productId: string, newCount: number) => {
    const nextStatus = newCount === 0 ? 'Out of Stock' : newCount <= 3 ? 'Only 3 left' : 'In Stock';
    const updated = products.map(p => p.id === productId ? { ...p, stockCount: newCount, stockStatus: nextStatus } : p);
    setProducts(updated);
    
    try {
      const prodToUpdate = updated.find(p => p.id === productId);
      if (prodToUpdate) {
        await setDoc(doc(db, 'products', productId), prodToUpdate);
      }
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'main'), settingsForm);
      setWebsiteSettings(settingsForm);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/main');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const updatedSettings = { ...settingsForm, heroImage: downloadURL };
      setSettingsForm(updatedSettings);
      await setDoc(doc(db, 'settings', 'main'), updatedSettings);
      setWebsiteSettings(updatedSettings);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct({
      id: `soap-${Date.now()}`,
      name: '',
      subtitle: '100% Pure Botanical Soap',
      category: 'Herbal & Ayurvedic',
      price: 299,
      originalPrice: 399,
      weight: '100g Bar',
      description: '',
      benefits: ['100% Natural', 'Cold-Process'],
      tags: ['Natural', 'Handcrafted'],
      image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&q=80&w=800',
      stockStatus: 'In Stock',
      stockCount: 25,
      badge: 'Best Seller',
      rating: 5.0
    });
    setProductImageFile(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: SoapProduct) => {
    setEditingProduct(prod);
    setProductImageFile(null);
    setIsProductModalOpen(true);
  };

  const handleDuplicateProduct = (prod: SoapProduct) => {
    const duplicated: SoapProduct = {
      ...prod,
      id: `soap-${Date.now()}`,
      name: `${prod.name} (Copy)`
    };
    const updated = [duplicated, ...products];
    setProducts(updated);
    setDoc(doc(db, 'products', duplicated.id), duplicated).catch(e => console.error(e));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      const updated = products.filter(p => p.id !== productId);
      setProducts(updated);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id || !editingProduct.name) return;
    setUploadingProductImage(true);

    try {
      let imageUrl = editingProduct.image;
      if (productImageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${productImageFile.name}`);
        const snap = await uploadBytes(storageRef, productImageFile);
        imageUrl = await getDownloadURL(snap.ref);
      }

      const finalProduct: SoapProduct = {
        id: editingProduct.id,
        name: editingProduct.name || 'Botanical Soap',
        subtitle: editingProduct.subtitle || '100% Pure Botanical Soap',
        category: editingProduct.category || 'Herbal',
        price: Number(editingProduct.price) || 299,
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : undefined,
        weight: editingProduct.weight || '100g',
        description: editingProduct.description || '',
        benefits: editingProduct.benefits || ['Natural'],
        tags: editingProduct.tags || ['Natural'],
        image: imageUrl || 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&q=80&w=800',
        stockStatus: (editingProduct.stockCount || 25) === 0 ? 'Out of Stock' : (editingProduct.stockCount || 25) <= 3 ? 'Only 3 left' : 'In Stock',
        stockCount: Number(editingProduct.stockCount) ?? 25,
        badge: editingProduct.badge || '',
        rating: Number(editingProduct.rating) || 5.0
      };

      await setDoc(doc(db, 'products', finalProduct.id), finalProduct);
      
      const exists = products.some(p => p.id === finalProduct.id);
      const updatedProducts = exists 
        ? products.map(p => p.id === finalProduct.id ? finalProduct : p)
        : [finalProduct, ...products];

      setProducts(updatedProducts);
      setIsProductModalOpen(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (e) {
      console.error(e);
      alert('Error saving product.');
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleReviewStatusUpdate = async (reviewId: string, status: 'approved' | 'hidden') => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `reviews/${reviewId}`);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  return (
    <div className="w-full px-4 max-w-5xl mx-auto animate-fadeIn pb-16">
      {/* Top Bar */}
      <div className="bg-[#072417] text-[#ffdcbd] rounded-2xl p-6 sm:p-8 shadow-md mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#85a490]">Owner & Administrator Portal</span>
          <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold mt-1">Prakriti Owner Dashboard</h1>
          <p className="text-[13px] text-[#d2dcd5] mt-1">Complete control over inventory, images, orders, reviews, and store configuration.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView('home')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-bold transition-colors cursor-pointer"
          >
            View Storefront
          </button>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-[#ffdcbd] text-[#072417] hover:bg-white rounded-xl text-[12px] font-bold transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-[13px] rounded-xl text-center font-semibold animate-fadeIn">
          ✓ Action completed successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-[#d2dcd5] mb-6 gap-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'products' ? 'border-[#072417] text-[#072417]' : 'border-transparent text-[#607769] hover:text-[#072417]'}`}
        >
          Products & Stock ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'orders' ? 'border-[#072417] text-[#072417]' : 'border-transparent text-[#607769] hover:text-[#072417]'}`}
        >
          Customer Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'reviews' ? 'border-[#072417] text-[#072417]' : 'border-transparent text-[#607769] hover:text-[#072417]'}`}
        >
          Reviews Moderation ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'settings' ? 'border-[#072417] text-[#072417]' : 'border-transparent text-[#607769] hover:text-[#072417]'}`}
        >
          Store & Logo Settings
        </button>
        <button
          onClick={() => setActiveTab('loyalty')}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === 'loyalty' ? 'border-[#072417] text-[#072417]' : 'border-transparent text-[#607769] hover:text-[#072417]'}`}
        >
          <span>🎁 Loyalty & Rewards</span>
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417]">Ayurvedic Soaps Inventory</h2>
            <button
              onClick={handleOpenAddProduct}
              className="px-4 py-2 bg-[#072417] text-[#ffdcbd] rounded-xl text-[12px] font-bold hover:bg-[#0c3623] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add New Product</span>
            </button>
          </div>

          <div className="space-y-4">
            {products.map(prod => (
              <div key={prod.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-[#ebefeb] rounded-xl gap-4 bg-[#fbf9f6]/40">
                <div className="flex items-center gap-4">
                  <img src={prod.image} alt={prod.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-[#d2dcd5]" />
                  <div>
                    <h3 className="font-bold text-[14px] text-[#072417]">{prod.name}</h3>
                    <p className="text-[12px] text-[#607769]">₹{prod.price} {prod.originalPrice && <span className="line-through text-gray-400">₹{prod.originalPrice}</span>} • {prod.weight} • Stock: {prod.stockCount ?? 25}</p>
                    <span className="text-[11px] font-bold text-[#4c6455] bg-[#cee9d6] px-2 py-0.5 rounded-full inline-block mt-1">{prod.stockStatus}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    onClick={() => handleStockUpdate(prod.id, Math.max(0, (prod.stockCount ?? 25) - 1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#072417] rounded-lg text-[11px] font-bold cursor-pointer"
                    title="Decrease Stock"
                  >
                    - Stock
                  </button>
                  <button
                    onClick={() => handleStockUpdate(prod.id, (prod.stockCount ?? 25) + 5)}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#072417] rounded-lg text-[11px] font-bold cursor-pointer"
                    title="Increase Stock"
                  >
                    + Stock
                  </button>
                  <button
                    onClick={() => handleOpenEditProduct(prod)}
                    className="px-3 py-1.5 bg-[#072417] text-[#ffdcbd] rounded-lg text-[11px] font-bold hover:bg-[#0c3623] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicateProduct(prod)}
                    className="px-3 py-1.5 bg-gray-200 text-[#072417] rounded-lg text-[11px] font-bold hover:bg-gray-300 cursor-pointer"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-[11px] font-bold hover:bg-red-200 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 shadow-sm">
          <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-4">Customer Orders</h2>
          {orders.length === 0 ? (
            <p className="text-[13px] text-[#607769] py-8 text-center">No customer orders placed yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="p-4 border border-[#ebefeb] rounded-xl bg-[#fbf9f6]/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[14px] text-[#072417]">Order #{order.id}</span>
                    <span className="text-[12px] text-[#607769]">{order.date}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#072417] mb-1">Customer: {order.customerName} ({order.customerEmail})</p>
                  <p className="text-[13px] text-[#424843] mb-2">{order.items}</p>
                  <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[#ebefeb]">
                    <span className="font-bold text-[#072417]">Total: ₹{order.total}</span>
                    <span className="px-2.5 py-0.5 bg-[#e2ede6] text-[#072417] rounded-full font-semibold">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews Moderation Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 shadow-sm">
          <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-4">Customer Reviews Moderation</h2>
          {reviews.length === 0 ? (
            <p className="text-[13px] text-[#607769] py-8 text-center">No customer reviews submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} className="p-4 border border-[#ebefeb] rounded-xl bg-[#fbf9f6]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[13px] text-[#072417]">{rev.userName}</span>
                      <span className="text-[11px] text-[#607769]">({rev.userEmail})</span>
                      <span className="text-[11px] bg-[#ffdcbd] text-[#072417] px-2 py-0.5 rounded-full font-bold">★ {rev.rating}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${rev.status === 'hidden' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {rev.status || 'approved'}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#424843] mb-1">"{rev.comment}"</p>
                    <span className="text-[11px] text-gray-400">Product: {rev.productId} • {rev.createdAt.split('T')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rev.status === 'hidden' ? (
                      <button
                        onClick={() => handleReviewStatusUpdate(rev.id, 'approved')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReviewStatusUpdate(rev.id, 'hidden')}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-2">Website Logo Management (Firebase Storage)</h2>
            <p className="text-[13px] text-[#607769] mb-4">Upload a new logo image. It will be permanently stored in Firebase Storage and automatically displayed across the header and footer of the entire website.</p>
            <div className="flex items-center gap-4 p-4 bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl">
              <img src={settingsForm.heroImage} alt="Current Logo Preview" className="w-16 h-16 object-contain bg-white rounded-lg border p-1" />
              <div>
                <label className="inline-block px-4 py-2 bg-[#072417] text-[#ffdcbd] font-bold text-[12px] rounded-xl cursor-pointer hover:bg-[#0c3623] transition-colors">
                  {uploadingLogo ? 'Uploading to Storage...' : 'Upload New Logo Image'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[11px] text-[#607769] mt-1">PNG, JPG, or SVG under 2MB.</p>
              </div>
            </div>
          </div>

          <hr className="border-[#ebefeb]" />

          <div>
            <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-4">Store Configuration & Announcements</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">Announcement Banner Text</label>
                <input
                  type="text"
                  value={settingsForm.announcement}
                  onChange={e => setSettingsForm({ ...settingsForm, announcement: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[13px] text-[#072417]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">Hero Title</label>
                <input
                  type="text"
                  value={settingsForm.heroTitle}
                  onChange={e => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[13px] text-[#072417]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">Hero Subtitle</label>
                <textarea
                  rows={2}
                  value={settingsForm.heroSubtitle}
                  onChange={e => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[13px] text-[#072417]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={settingsForm.whatsappNumber}
                  onChange={e => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[13px] text-[#072417]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#072417] text-[#ffdcbd] font-bold text-[12px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors cursor-pointer"
              >
                Save Store Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loyalty & Rewards Tab */}
      {activeTab === 'loyalty' && (
        <AdminLoyaltyRewardsSection />
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-[#fbf9f6] border border-[#d2dcd5] rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#4c6455] hover:bg-[#efeeeb] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#072417] mb-4">
              {products.some(p => p.id === editingProduct.id) ? 'Edit Product' : 'Add New Ayurvedic Soap'}
            </h2>

            <form onSubmit={handleSaveProductForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price ?? 299}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.originalPrice ?? ''}
                    onChange={e => setEditingProduct({ ...editingProduct, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Stock Count</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stockCount ?? 25}
                    onChange={e => setEditingProduct({ ...editingProduct, stockCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Weight / Size</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.weight || '100g Bar'}
                    onChange={e => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#072417] mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    placeholder="e.g., Best Seller, New"
                    className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#d2dcd5] bg-white text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#072417] mb-1">Product Image (Upload to Firebase Storage)</label>
                <div className="flex items-center gap-4">
                  <img src={editingProduct.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setProductImageFile(e.target.files?.[0] || null)}
                    className="text-[12px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-[#072417] rounded-xl text-[12px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingProductImage}
                  className="px-6 py-2 bg-[#072417] text-[#ffdcbd] rounded-xl text-[12px] font-bold hover:bg-[#0c3623] cursor-pointer disabled:opacity-50"
                >
                  {uploadingProductImage ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
