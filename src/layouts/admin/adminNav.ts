import {
  Banknote,
  Boxes,
  ChartColumn,
  Container,
  Factory,
  Landmark,
  PiggyBank,
  Undo2,
  Wallet,
  FileUp,
  Footprints,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  Tags,
  UserRound,
  Users,
} from 'lucide-react'
import { paths } from '@/app/router/paths'
import type { UserRole } from '@/types/auth'

export type NavBadgeKey = 'pendingOrders' | 'openReturns' | 'lowStock' | 'pendingCod'

export interface NavItem {
  to: string
  label: string
  icon: typeof Package
  end?: boolean
  roles: UserRole[]
  badge?: NavBadgeKey
}

// Admin only: there is no separate shopkeeper portal any more.
const STAFF: UserRole[] = ['admin']
const ADMIN: UserRole[] = ['admin']

/** Dashboard navigation, grouped. Filtered by role in the sidebar and mobile drawer. */
export const DASHBOARD_NAV: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [{ to: paths.admin.root, label: 'Dashboard', icon: LayoutDashboard, end: true, roles: STAFF }],
  },
  {
    label: 'Catalog',
    items: [
      { to: paths.admin.products, label: 'Products', icon: Package, end: true, roles: STAFF },
      { to: paths.admin.productImport, label: 'Bulk import', icon: FileUp, roles: STAFF },
      { to: paths.admin.brands, label: 'Brands', icon: Tags, roles: STAFF },
      { to: paths.admin.sizes, label: 'Size chart', icon: Footprints, roles: STAFF },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: paths.admin.inventory, label: 'Inventory & SKUs', icon: Boxes, roles: STAFF, badge: 'lowStock' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: paths.admin.orders, label: 'Orders', icon: Receipt, roles: STAFF, badge: 'pendingOrders' },
      { to: paths.admin.returns, label: 'Returns', icon: RotateCcw, roles: STAFF, badge: 'openReturns' },
      { to: paths.admin.customers, label: 'Customers', icon: UserRound, roles: STAFF },
      { to: paths.admin.reviews, label: 'Reviews', icon: MessageSquareQuote, roles: STAFF },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: paths.admin.finance.root, label: 'Profit & cash flow', icon: Landmark, end: true, roles: ADMIN },
      { to: paths.admin.finance.sales, label: 'Sales report', icon: ChartColumn, roles: ADMIN },
      { to: paths.admin.finance.expenses, label: 'Expenses', icon: Wallet, roles: ADMIN },
      { to: paths.admin.finance.purchases, label: 'Stock purchases', icon: Container, roles: ADMIN },
      { to: paths.admin.finance.suppliers, label: 'Suppliers', icon: Factory, roles: ADMIN },
      { to: paths.admin.finance.investments, label: 'Investments', icon: PiggyBank, roles: ADMIN },
      {
        to: paths.admin.finance.cod,
        label: 'COD & settlements',
        icon: Banknote,
        roles: ADMIN,
        badge: 'pendingCod',
      },
      { to: paths.admin.finance.refunds, label: 'Returns & refunds', icon: Undo2, roles: ADMIN },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: paths.admin.users, label: 'Users & roles', icon: Users, roles: ADMIN },
      { to: paths.admin.settings, label: 'Store settings', icon: Settings, roles: ADMIN },
    ],
  },
]
