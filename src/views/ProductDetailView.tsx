import React, { useState, useEffect } from 'react';
import { ViewState, SoapProduct, CustomerUser, Review } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';

interface ProductDetailViewProps {
  product: SoapProduct;
  setCurrentView: (view: ViewState) => void;
  addToCart: (soap: SoapProduct) => void;
  currentUser: CustomerUser | null;
  onOpenAuth: () => void;
  products: SoapProduct[];
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ 
  product, 
  setCurrentView, 
  addToCart, 
  currentUser, 
  onOpenAuth 
}) => {
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const snap = await getDocs(collection(db, 'reviews'));
        const loadedReviews = snap.docs.map(d => d.data() as Review);
        setReviews(loadedReviews);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'reviews');
      }
    }
    fetchReviews();
  }, [product.id]);

  const approvedReviews = reviews.filter(r => r.productId === product.id && (r.status === 'approved' || !r.status));
  const avgRating = approvedReviews.length > 0
    ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
    : product.rating;
  const totalCount = approvedReviews.length > 0 ? approvedReviews.length : (product.rating ? 12 : 0);

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newComment.trim()) {
      setReviewError('Please write a review comment.');
      return;
    }

    try {
      const existing = reviews.find(r => r.productId === product.id && r.userId === currentUser.id);
      const reviewId = existing ? existing.id : `rev-${Date.now()}`;

      const reviewItem: Review = {
        id: reviewId,
        productId: product.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        rating: Number(newRating),
        comment: newComment.trim(),
        createdAt: new Date().toISOString(),
        status: 'approved' // Auto-approve or pending; setting approved for seamless UX while owner can moderate
      };

      await setDoc(doc(db, 'reviews', reviewId), reviewItem);

      const updatedReviews = existing 
        ? reviews.map(r => r.id === reviewId ? reviewItem : r)
        : [reviewItem, ...reviews];

      setReviews(updatedReviews);
      setNewComment('');
      setReviewError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reviews');
      setReviewError('Failed to submit review.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 px-4 gap-6 animate-fadeIn">
      {/* Back button */}
      <div className="pt-2">
        <button 
          onClick={() => setCurrentView('shop')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c6455] hover:text-[#072417] transition-colors bg-[#efeeeb] px-3 py-1.5 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Apothecary Shop</span>
        </button>
      </div>

      {/* Hero Product Image Card */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#efeeeb] shadow-md">
        <img 
          alt={product.name} 
          className="w-full h-full object-cover" 
          src={product.image} 
        />
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#072417] text-white px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest shadow-sm">
            {product.badge}
          </span>
        )}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
          <span className="text-[11px] font-bold text-[#072417] tracking-wider uppercase">Cold-Pressed Herbal Blend</span>
        </div>
      </div>

      {/* Details Header */}
      <div className="flex flex-col gap-2 bg-[#f5f3f0] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-wider">{product.weight}</span>
          <span className="text-[11px] font-bold text-[#4c6455] flex items-center gap-1 bg-[#cee9d6] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4c6455]"></span> {product.stockStatus}
          </span>
        </div>
        <h1 className="font-['Playfair_Display'] text-2xl font-semibold text-[#072417]">{product.name}</h1>
        <p className="text-sm text-[#424843] leading-relaxed">{product.description}</p>

        <div className="flex items-baseline justify-between pt-2 border-t border-[#efeeeb]">
          <div className="flex items-baseline gap-2">
            <span className="font-['Playfair_Display'] text-2xl font-bold text-[#072417]">₹{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-[#727973] line-through">₹{product.originalPrice}</span>
            )}
            <span className="text-xs text-[#424843]">/ 100g bar</span>
          </div>
          <span className="text-xs font-bold text-[#4d2d07] bg-[#ffdcbd] px-2.5 py-1 rounded-full">★ {avgRating} ({totalCount} reviews)</span>
        </div>
      </div>

      {/* Botanical Benefits */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest">Botanical Benefits</span>
        <div className="grid grid-cols-1 gap-2">
          {product.benefits?.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3f0] text-[#424843] text-sm">
              <span className="material-symbols-outlined text-[#072417] text-[20px]">check_circle</span>
              <span className="font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action CTAs */}
      <div className="flex flex-col gap-3 pt-2">
        <button 
          onClick={handleAddToCart}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            added ? 'bg-[#4c6455] text-white' : 'bg-[#072417] text-white hover:bg-[#1e3a2b]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{added ? 'done' : 'shopping_bag'}</span>
          <span>{added ? 'Added to Bag!' : `Add to Bag (₹${product.price})`}</span>
        </button>

        <a 
          className="w-full py-3.5 px-6 rounded-xl bg-[#4c6455] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#4c6455]/90 transition-colors text-center shadow-sm cursor-pointer"
          href={`https://wa.me/919579408654?text=Hello%20PRAKRITI,%20I%20would%20like%20to%20order%20the%20${encodeURIComponent(product.name)}%20(₹${product.price}).`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Order Instantly on WhatsApp</span>
        </a>
      </div>

      {/* Product Reviews Section */}
      <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ebefeb]">
          <div>
            <h2 className="font-['Playfair_Display'] text-[20px] font-bold text-[#072417]">Customer Reviews</h2>
            <p className="text-[12px] text-[#607769]">Average Rating: {avgRating} out of 5 ({totalCount} verified ratings)</p>
          </div>
          <div className="flex items-center gap-1 bg-[#ffdcbd] px-3 py-1 rounded-full text-[#072417] font-bold text-xs">
            <span>★ {avgRating}</span>
          </div>
        </div>

        {/* Submit Review Form */}
        <div className="bg-[#fbf9f6] border border-[#d2dcd5] rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-[14px] text-[#072417] mb-2">Leave a Review</h3>
          {currentUser ? (
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              {reviewError && <p className="text-red-600 text-[12px]">{reviewError}</p>}
              <div className="flex items-center gap-2">
                <label className="text-[12px] font-semibold text-[#072417]">Rating:</label>
                <select 
                  value={newRating} 
                  onChange={e => setNewRating(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-[#d2dcd5] bg-white text-[12px] text-[#072417] focus:outline-none"
                >
                  <option value={5}>5 Stars - Excellent</option>
                  <option value={4}>4 Stars - Very Good</option>
                  <option value={3}>3 Stars - Good</option>
                  <option value={2}>2 Stars - Fair</option>
                  <option value={1}>1 Star - Poor</option>
                </select>
              </div>
              <div>
                <textarea 
                  rows={3}
                  required
                  placeholder="Share your experience with this botanical soap..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2dcd5] bg-white text-[#072417] text-[13px] focus:outline-none focus:border-[#072417]"
                />
              </div>
              <button 
                type="submit"
                className="px-5 py-2.5 bg-[#072417] text-[#ffdcbd] font-bold text-[12px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors cursor-pointer"
              >
                Submit Review
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-[13px] text-[#607769] mb-3">Please sign in to your customer account to leave a product review.</p>
              <button 
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-[#072417] text-[#ffdcbd] font-bold text-[12px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors cursor-pointer"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        {/* Reviews List */}
        {approvedReviews.length === 0 ? (
          <p className="text-[13px] text-[#607769] text-center py-6">Be the first customer to review this sacred botanical soap!</p>
        ) : (
          <div className="space-y-4">
            {approvedReviews.map(rev => (
              <div key={rev.id} className="border border-[#ebefeb] rounded-xl p-4 bg-[#fbf9f6]/40 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[13px] text-[#072417]">{rev.userName}</span>
                    <span className="text-[11px] text-[#607769]">• {rev.createdAt.split('T')[0]}</span>
                  </div>
                  <div className="flex text-amber-500 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`material-symbols-outlined text-[14px] ${i < rev.rating ? 'fill-current' : 'text-gray-300'}`}>
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-[13px] text-[#072417] leading-relaxed">{rev.comment}</p>
                </div>
                {currentUser && currentUser.id === rev.userId && (
                  <button
                    onClick={() => handleDeleteReview(rev.id)}
                    className="text-red-600 hover:text-red-800 text-[12px] font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
