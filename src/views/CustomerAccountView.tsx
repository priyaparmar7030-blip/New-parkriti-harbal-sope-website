import React, { useState, useEffect } from 'react';
import { CustomerUser, Order, Review, ViewState } from '../types';

interface CustomerAccountViewProps {
  currentUser: CustomerUser;
  onLogout: () => void;
  setCurrentView: (view: ViewState) => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({ currentUser, onLogout, setCurrentView }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    try {
      const savedOrders = JSON.parse(localStorage.getItem('prakriti_orders') || '[]');
      setOrders(savedOrders);

      const savedReviews = JSON.parse(localStorage.getItem('prakriti_reviews') || '[]');
      setReviews(savedReviews.filter((r: Review) => r.userId === currentUser.id));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleDeleteReview = (reviewId: string) => {
    try {
      const allReviews = JSON.parse(localStorage.getItem('prakriti_reviews') || '[]');
      const updated = allReviews.filter((r: Review) => r.id !== reviewId);
      localStorage.setItem('prakriti_reviews', JSON.stringify(updated));
      setReviews(updated.filter((r: Review) => r.userId === currentUser.id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full px-4 max-w-4xl mx-auto animate-fadeIn">
      <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#072417] text-[#ffdcbd] font-['Playfair_Display'] text-[22px] font-bold flex items-center justify-center">
            {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <h1 className="font-['Playfair_Display'] text-[22px] sm:text-[26px] font-bold text-[#072417]">
              {currentUser.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {currentUser.customerId && (
                <span className="bg-[#ffdcbd] text-[#072417] text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                  ID: {currentUser.customerId}
                </span>
              )}
              {currentUser.email && (
                <span className="text-[13px] text-[#607769]">{currentUser.email}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 border border-[#d2dcd5] rounded-xl text-[12px] font-bold text-[#072417] hover:bg-[#efeeeb] transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>

      {/* Orders Section */}
      <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
        <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">package</span> My Orders
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-[#607769] text-[13px]">
            <p>You haven't placed any orders yet.</p>
            <button 
              onClick={() => setCurrentView('shop')}
              className="mt-3 px-5 py-2.5 bg-[#072417] text-[#ffdcbd] font-bold text-[12px] uppercase tracking-wider rounded-xl hover:bg-[#0c3623] transition-colors cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="border border-[#ebefeb] rounded-xl p-4 bg-[#fbf9f6]/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[13px] mb-2 gap-1">
                  <span className="font-bold text-[#072417]">Order #{order.id}</span>
                  <span className="text-[#607769]">{order.date}</span>
                </div>
                <p className="text-[13px] text-[#072417] mb-2">{order.items}</p>
                <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[#ebefeb]">
                  <span className="font-bold text-[#072417]">Total: ₹{order.total}</span>
                  <span className="px-2.5 py-0.5 bg-[#e2ede6] text-[#072417] rounded-full font-semibold">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Reviews Section */}
      <div className="bg-white border border-[#d2dcd5] rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="font-['Playfair_Display'] text-[18px] font-bold text-[#072417] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">star</span> My Product Reviews ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <p className="text-[13px] text-[#607769] py-4 text-center">You haven't left any reviews yet. Visit a product page to share your experience!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(rev => (
              <div key={rev.id} className="border border-[#ebefeb] rounded-xl p-4 bg-[#fbf9f6]/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`material-symbols-outlined text-[14px] ${i < rev.rating ? 'fill-current' : 'text-gray-300'}`}>
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#607769]">{rev.createdAt.split('T')[0]}</span>
                  </div>
                  <p className="text-[13px] text-[#072417] leading-relaxed">{rev.comment}</p>
                </div>
                <button
                  onClick={() => handleDeleteReview(rev.id)}
                  className="text-red-600 hover:text-red-800 text-[12px] font-semibold cursor-pointer"
                  title="Delete Review"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
