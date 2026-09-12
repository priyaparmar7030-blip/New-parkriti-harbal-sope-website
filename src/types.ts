export type ViewState = 'home' | 'shop' | 'product-detail' | 'find-my-soap' | 'bag' | 'about' | 'customer-account' | 'admin-dashboard';

export interface SoapProduct {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  rating: number;
  badge?: string;
  stockStatus: 'In Stock' | 'Only 3 left' | 'Out of Stock';
  image: string;
  tags: string[];
  category: string;
  description: string;
  benefits: string[];
  weight: string;
  ingredients?: string[];
  suitableSkinTypes?: string[];
  isActive?: boolean;
  stockCount?: number;
}

export interface CartItem {
  product: SoapProduct;
  quantity: number;
}

export interface CustomerUser {
  id: string;
  customerId?: string;
  email: string;
  fullName: string;
  role?: 'customer' | 'owner';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  status?: 'approved' | 'hidden';
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress: string;
  date: string;
  items: string;
  quantities?: { productId: string; name: string; quantity: number }[];
  total: number;
  status: string;
  createdAt: string;
}

export interface CustomerOffer {
  id: string;
  customerId: string;
  customerName?: string;
  offerType: 'rupee_off' | 'percent_off' | 'free_soap' | 'free_shipping' | 'gift' | 'custom';
  title: string;
  discountCode: string;
  description: string;
  status: 'active' | 'redeemed' | 'expired';
  createdAt: string;
  expiresAt?: string;
  createdByName?: string;
}

export interface RewardHistoryItem {
  id: string;
  type: 'unlocked' | 'revealed' | 'redeemed';
  title: string;
  timestamp: string;
  note?: string;
}

export interface LoyaltyRecord {
  customerId: string;
  customerName: string;
  stamps: number;
  target: number;
  progress: string; // e.g. "7/10"
  unlocked: boolean;
  gift: string;
  secretGiftRevealed?: boolean;
  revealedGiftDescription?: string;
  rewardRedeemed?: boolean;
  redeemedAt?: string;
  rewardHistory?: RewardHistoryItem[];
  processedOrderIds: string[];
  updatedAt: string;
}

export interface WebsiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  announcement: string;
  promoBanner: string;
  whatsappNumber: string;
  phoneNumber: string;
  address: string;
  instagram: string;
  facebook: string;
  featuredProductIds: string;
  newProductIds: string;
}
