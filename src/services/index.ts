import { env } from '@/config/env'
import { demoProductService } from './products/demo-product.service'
import { productService } from './products/product.service'

export { productService, type ProductService } from './products/product.service'
export { adminProductService, type ProductFormValues } from './products/admin-product.service'
export { inventoryService, type InventoryService } from './inventory/inventory.service'
export { authService, type AuthService, type SignUpResult } from './auth/auth.service'
export { profileService } from './auth/profile.service'
export { orderService } from './orders/order.service'
export { wishlistService } from './wishlist/wishlist.service'
export { ServiceError, type ServiceErrorCode } from './core/errors'

/**
 * The catalog the storefront reads from: the demo catalog until Supabase is configured
 * (or VITE_USE_DEMO_CATALOG=true), then the real one. UI code imports this, not a backend.
 */
export const catalogService = env.useDemoCatalog ? demoProductService : productService
