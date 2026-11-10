import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { RouteError } from '@/components/feedback/RouteError'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { CustomerLayout } from '@/layouts/customer/CustomerLayout'
import { RequireAdmin, RequireAuth, RequireRole } from './guards/RequireAdmin'
import { paths } from './paths'

/**
 * Pages are lazy-loaded, so each one is its own chunk and customers never
 * download admin code. Each page module must have a default export.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
})

const customerRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import('@/features/catalog/pages/HomePage')) },
  { path: paths.shop, lazy: page(() => import('@/features/catalog/pages/ShopPage')) },
  { path: paths.collection(), lazy: page(() => import('@/features/catalog/pages/CollectionPage')) },
  { path: paths.product(), lazy: page(() => import('@/features/catalog/pages/ProductDetailPage')) },
  { path: paths.cart, lazy: page(() => import('@/features/cart/pages/CartPage')) },
  { path: paths.checkout, lazy: page(() => import('@/features/cart/pages/CheckoutPage')) },
  { path: paths.wishlist, lazy: page(() => import('@/features/wishlist/WishlistPage')) },
  { path: paths.orderConfirmed(), lazy: page(() => import('@/features/orders/pages/OrderConfirmedPage')) },
  { path: paths.trackOrder, lazy: page(() => import('@/features/orders/pages/TrackOrderPage')) },
  { path: paths.login, lazy: page(() => import('@/features/auth/pages/LoginPage')) },
  { path: paths.register, lazy: page(() => import('@/features/auth/pages/RegisterPage')) },
  { path: paths.resetPassword, lazy: page(() => import('@/features/auth/pages/ResetPasswordPage')) },
  {
    element: <RequireAuth />,
    children: [
      { path: paths.account, lazy: page(() => import('@/features/account/pages/AccountPage')) },
      { path: paths.accountOrder(), lazy: page(() => import('@/features/account/pages/OrderDetailPage')) },
    ],
  },
  { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
]

const adminRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import('@/features/admin/dashboard/pages/DashboardPage')) },
  { path: paths.admin.products, lazy: page(() => import('@/features/admin/products/pages/ProductListPage')) },
  {
    path: paths.admin.productNew,
    lazy: page(() => import('@/features/admin/products/pages/ProductEditorPage')),
  },
  {
    path: paths.admin.productEdit(),
    lazy: page(() => import('@/features/admin/products/pages/ProductEditorPage')),
  },
  { path: paths.admin.brands, lazy: page(() => import('@/features/admin/catalog/pages/BrandsPage')) },
  { path: paths.admin.sizes, lazy: page(() => import('@/features/admin/catalog/pages/SizesPage')) },
  { path: paths.admin.inventory, lazy: page(() => import('@/features/admin/inventory/pages/InventoryPage')) },
  { path: paths.admin.orders, lazy: page(() => import('@/features/admin/orders/pages/OrdersPage')) },
  { path: paths.admin.returns, lazy: page(() => import('@/features/admin/returns/pages/ReturnsPage')) },
  { path: paths.admin.customers, lazy: page(() => import('@/features/admin/customers/pages/CustomersPage')) },
  { path: paths.admin.reviews, lazy: page(() => import('@/features/admin/reviews/pages/ReviewsPage')) },
  {
    // Admin only. The database enforces the same rule (set_user_role, store_settings RLS).
    element: <RequireRole roles={['admin']} />,
    children: [
      { path: paths.admin.users, lazy: page(() => import('@/features/admin/users/pages/UsersPage')) },
      {
        path: paths.admin.settings,
        lazy: page(() => import('@/features/admin/settings/pages/SettingsPage')),
      },
      // Owner finance: complete financial information is admin only (RLS + is_admin() in every function).
      {
        path: paths.admin.finance.root,
        lazy: page(() => import('@/features/finance/pages/FinanceOverviewPage')),
      },
      {
        path: paths.admin.finance.sales,
        lazy: page(() => import('@/features/finance/pages/SalesReportPage')),
      },
      {
        path: paths.admin.finance.expenses,
        lazy: page(() => import('@/features/finance/pages/ExpensesPage')),
      },
      {
        path: paths.admin.finance.purchases,
        lazy: page(() => import('@/features/finance/pages/PurchasesPage')),
      },
      {
        path: paths.admin.finance.suppliers,
        lazy: page(() => import('@/features/finance/pages/SuppliersPage')),
      },
      {
        path: paths.admin.finance.investments,
        lazy: page(() => import('@/features/finance/pages/InvestmentsPage')),
      },
      { path: paths.admin.finance.cod, lazy: page(() => import('@/features/finance/pages/CodPage')) },
      { path: paths.admin.finance.refunds, lazy: page(() => import('@/features/finance/pages/RefundsPage')) },
    ],
  },
]

export const router = createBrowserRouter([
  {
    path: paths.home,
    element: <CustomerLayout />,
    errorElement: <RouteError />,
    children: customerRoutes,
  },
  {
    path: paths.admin.root,
    element: <RequireAdmin />,
    errorElement: <RouteError />,
    children: [{ element: <AdminLayout />, children: adminRoutes }],
  },
  // Old back-office URL.
  { path: '/admin/*', element: <Navigate to={paths.admin.root} replace /> },
])
