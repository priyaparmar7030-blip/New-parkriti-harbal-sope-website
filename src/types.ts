export type ViewState = 'home' | 'shop' | 'product-detail' | 'find-my-soap' | 'bag' | 'about' | 'admin-login' | 'admin-dashboard';

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
