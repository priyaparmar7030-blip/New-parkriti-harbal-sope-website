import { SoapProduct } from '../types';

export const SOAPS_DATA: SoapProduct[] = [
  {
    id: 'neem-soap',
    name: 'Prakriti Neem Soap',
    subtitle: 'Organic cold-pressed neem & raw leaves',
    price: 99,
    originalPrice: 120,
    rating: 4.9,
    badge: 'BESTSELLER',
    stockStatus: 'In Stock',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrt0k2BcBwZxqYbLe2jc-ujuQJkq2-Y19VXEFOUJRGrK97whP5PtVhDFc-b2YJ8mVrVC68c9s1Imp3C1VXVvsjLS4LR750c3tLpU-cgVErU2sa96xa2X-FeHUMre7UniI9RT5htiJXEHdd2fWLYRDXNukZnzRJ5cWeJuXSVwScS2OOpNQJzR-36yqcdoXNqrTWNbKIEGdX8Vnh1Hc_9xe1C57XDBSjCmoGALBEFBBEoU4g_wTMToo',
    tags: ['all', 'oily', 'under100', 'daily'],
    category: 'oily',
    description: 'Based on your oily skin profile and focus on excess oil, Neem Soap with cold-pressed oils is thoughtfully crafted for your balanced cleansing routine.',
    benefits: [
      'Regulates excess sebum production naturally',
      'Purifying wild-harvested neem leaf extract',
      'Gentle, non-drying glycerin enriched formula'
    ],
    weight: '100g Pure Bar'
  },
  {
    id: 'tulsi-mint',
    name: 'Organic Tulsi & Mint',
    subtitle: 'Holy basil infusion & wild spearmint',
    price: 105,
    originalPrice: 130,
    rating: 4.8,
    badge: 'NEW',
    stockStatus: 'In Stock',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkfXpyg6ZgT-VuzvzBx2MYphcpjmuhZwpl1H6vu7kO6lcJJBzXDgSEVJryENjuCAH6r4AJtMIOe4hbRRasbisys9p0jzEHm-cswhzemY29cGYbS_jhGaKFF_IoqMMdSzrNSeKeuW9rUO5ftN5Xpog4sxAUNH416QAVgz7bpOrIcCuMkK8KFWj5WmM1W8NssHDAwTMYRGfSsws92eOy4O1LzYU_eRTzQqOewiOwGjOg7nz6T0rK6Uo',
    tags: ['all', 'oily', 'daily'],
    category: 'daily',
    description: 'Cooling spearmint and sacred holy basil infusion to purify pores and revive tired skin with natural botanical prana.',
    benefits: [
      'Instant cooling and anti-bacterial refreshment',
      'Purifies pores and removes urban impurities',
      'Infused with pure organic tulsi leaf oils'
    ],
    weight: '100g Pure Bar'
  },
  {
    id: 'sandalwood-kesar',
    name: 'Raw Sandalwood & Kesar',
    subtitle: 'Mysore chandan & pure Kashmiri saffron',
    price: 125,
    originalPrice: 150,
    rating: 5.0,
    badge: 'POPULAR',
    stockStatus: 'Only 3 left',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5ECXg383vW8FFM1k5jFxYMGVIwX0iIVsqJ-XctVRMG0lubhloQ7yTFrplDYwmVFMWB-n7Tjjqm90nBG30DSiCTpGuNTjPUJQdei6ULcb_mcv-Kz6cmupCz-mCXNC9olJPV9KabKOkg_RYvXjDZ3xChwCKT6x4A85U31g2l7aOFKGcjg9Od4EYyUtUlRWm9Eg4U-Hjthsmp4FiIA7rXCdWFjqWtRSPq9D1z-WIcd4XGZzc4A-omcw',
    tags: ['all', 'dry', 'sensitive'],
    category: 'dry',
    description: 'Exquisite Mysore chandan extract paired with pristine Kashmiri saffron threads for a radiant, even-toned complexion.',
    benefits: [
      'Brightens complexion and fades natural blemishes',
      'Deeply nourishing traditional Chandan aroma',
      'Pure saffron threads for natural skin glow'
    ],
    weight: '100g Pure Bar'
  },
  {
    id: 'aloe-honey',
    name: 'Calming Aloe & Honey',
    subtitle: 'Fresh aloe gel & wild forest honey',
    price: 89,
    originalPrice: 110,
    rating: 4.7,
    badge: 'OFFER',
    stockStatus: 'In Stock',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBV8Ujghr5BRY9SYMTGoKq6HpdUdfAKi2KG0tlmzmuMLfFtdauPW_FkxBsBVBQXmUyPJHOdDbH7tVaFh3etruXtu2fZKRtGoJk7hsFfvX_DKKQJMRXdbQWIwM7ha555hl9NwYQtrbIlfHKYV9CJ92J0gCLIlOmJPCOAjHi-m6VW7TDk9_11viZq9PWbBauGJ4R3HG1JxfoShG5lWbnKI71MrxQiazA7cDHGiLgZy7nrZCFRjk96jZk',
    tags: ['all', 'sensitive', 'daily', 'under100'],
    category: 'sensitive',
    description: 'Translucent jade aloe bar enriched with raw forest honey drops to soothe dry and reactive skin barriers.',
    benefits: [
      'Locks in natural moisture without heavy oils',
      'Soothes irritated and sun-exposed skin',
      'Enriched with wild organic forest honey'
    ],
    weight: '100g Pure Bar'
  },
  {
    id: 'multani-mitti',
    name: 'Multani Mitti & Vetiver',
    subtitle: "Fuller's earth & wild khus root extract",
    price: 95,
    originalPrice: 115,
    rating: 4.9,
    stockStatus: 'In Stock',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxhBDqUyoxceocOO9J1w4UV0j6e8DyG-_kK__-e-dNi6bNv0vSvXxchf38f0awygGbjZbvVU5C86ZLIiUEdLB_xRWmYQ-v3NQBRzcmlYG1vOj1hBMqCeF_QUAMndT5OY3Aamh7x1SRgpz0Zyn5LFpOaJRr75iXcwM8nX5p52dXczQGdPCm1KWXeUvoBdUpqX7w4-aNh9Vpdo4R9rIf6dztTfkokSRSu0-vFhQ-qW_HKcHnZrmF5lQ',
    tags: ['all', 'oily', 'under100'],
    category: 'oily',
    description: "Authentic Fuller's earth clay infused with aromatic vetiver roots to absorb deep impurities and cool body heat.",
    benefits: [
      'Deep pore cleansing and oil extraction',
      'Cooling vetiver aroma for holistic relaxation',
      'Sun-dried natural mineral clay formulation'
    ],
    weight: '100g Pure Bar'
  },
  {
    id: 'wild-rose',
    name: 'Wild Rose Petal Scrub',
    subtitle: 'Desi Gulab water & walnut husk',
    price: 115,
    originalPrice: 135,
    rating: 4.8,
    badge: 'SOLD OUT',
    stockStatus: 'Out of Stock',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZCRmojMjHVoubQWo9Oz_A_xcdXZMCiGswEQAsG8HDhQ8Eai2J4YZHWgqvQEctuUCBpeNJ8n-0rh7kn6w6fry4_mM053EIEc7bU2Mc2xjG0osft3MOxM-nenR8uJqvGK3kLBjWPpEPhU8r_PZzVYDq-B5peDWg717gbe7Yjbbkc4MRYnor5ImTretfrP7IbPHAfT1aRkpt1MFmy5vmZ1Rk408Pam63189oQYXrBQ-Nx6-yyTJC7hs',
    tags: ['all', 'dry', 'daily'],
    category: 'dry',
    description: 'Blush pink handcrafted Ayurvedic rose water and crushed organic rose petals exfoliating soap bar.',
    benefits: [
      'Gentle natural exfoliation with walnut shell powder',
      'Pure desi gulab hydration for soft supple skin',
      'Cured with organic coconut milk'
    ],
    weight: '100g Pure Bar'
  }
];
