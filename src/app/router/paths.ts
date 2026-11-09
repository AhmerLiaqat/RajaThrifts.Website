import type { CollectionSlug } from '@/constants/collections'

/**
 * Every URL in the app is built from here. Never hard-code paths in components.
 */
export const paths = {
  // Customer storefront
  home: '/',
  shop: '/shop',
  collection: (slug: CollectionSlug | ':collectionSlug' = ':collectionSlug') => `/collections/${slug}`,
  product: (slug = ':productSlug') => `/products/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
  wishlist: '/wishlist',

  // Auth & account
  login: '/login',
  register: '/register',
  resetPassword: '/reset-password',
  account: '/account',
  accountOrder: (orderNumber = ':orderNumber') => `/account/orders/${orderNumber}`,

  // Shopkeeper dashboard (shopkeeper + admin; users & settings are admin only)
  admin: {
    root: '/dashboard',
    products: '/dashboard/products',
    productNew: '/dashboard/products/new',
    productEdit: (id = ':productId') => `/dashboard/products/${id}`,
    brands: '/dashboard/brands',
    sizes: '/dashboard/sizes',
    inventory: '/dashboard/inventory',
    orders: '/dashboard/orders',
    returns: '/dashboard/returns',
    customers: '/dashboard/customers',
    users: '/dashboard/users',
    settings: '/dashboard/settings',
    finance: {
      root: '/dashboard/finance',
      sales: '/dashboard/finance/sales',
      expenses: '/dashboard/finance/expenses',
      purchases: '/dashboard/finance/purchases',
      suppliers: '/dashboard/finance/suppliers',
      investments: '/dashboard/finance/investments',
      cod: '/dashboard/finance/cod',
      refunds: '/dashboard/finance/refunds',
    },
  },
} as const
