import type { PlaceholderTone } from "@/components/image-placeholder";

/**
 * Admin-panel domain types. Demo-data foundation only — see
 * docs/ADMIN_PANEL_PLAN.md §6. Shapes are written so a future
 * RestAdminRepository can implement the same `AdminRepository` interface
 * without any page-level changes.
 */

export type ProductStatus = "active" | "draft" | "archived";
export type PetType = "dog" | "cat" | "all";

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
};

export type ProductImage = {
  id: string;
  /** Placeholder content description — no licensed photography, see ImagePlaceholder. */
  label: string;
  tone: PlaceholderTone;
  /** Editable accessible alt text, independent of `label`. */
  alt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  petType: PetType;
  tags: string[];
  featured: boolean;
  status: ProductStatus;
  price: number;
  originalPrice?: number;
  stock: number;
  /** First image is the primary/listing image. */
  images: ProductImage[];
  variants: ProductVariant[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">;

export type ProductSummary = {
  total: number;
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  petType: PetType;
  order: number;
  active: boolean;
  /** Derived at read time from the current product set — never stored. */
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type CategoryInput = {
  name: string;
  slug: string;
  description: string;
  petType: PetType;
  active: boolean;
  displayOrder: number;
};

export type Customer = {
  id: number | string;
  referenceCode?: string;
  name: string;
  email: string;
  phone: string;
  status?: "active" | "disabled";
  address: string;
  joinedAt: string;
  lastLoginAt?: string | null;
  addresses?: Array<{
    id: number;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
    isDefault: boolean;
  }>;
};

/**
 * pending -> confirmed -> processing -> shipped -> delivered is the canonical
 * forward path. cancelled is reachable from any pre-delivery stage;
 * return_requested is reachable only from delivered. Both are terminal. See
 * order-status-rules.ts for the enforced transition graph — this type only
 * declares the vocabulary, not which moves are legal.
 */
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested";

/** Separate from OrderStatus — fulfilment tracks the physical pack/ship pipeline independently of the order's commercial status. */
export type FulfilmentStatus = "unfulfilled" | "processing" | "packed" | "shipped" | "delivered";

/** Separate from OrderStatus and FulfilmentStatus — see order-status-rules.ts. */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type ShippingMethod = "standard" | "express";

export type OrderItem = {
  productId: string;
  name: string;
  sku: string;
  variantLabel?: string;
  quantity: number;
  price: number;
};

export type Note = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  label: string;
  at: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  shippingAddress: string;
  city: string;
  state: string;
  shippingMethod: ShippingMethod;
  /** Demo fields only — no live courier integration. Editable during the session. */
  carrier: string;
  trackingNumber: string;
  placedAt: string;
  timeline: TimelineEvent[];
  notes: Note[];
};

export type OrderSummary = {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returns: number;
};

export type ShippingDetailsInput = {
  shippingMethod: ShippingMethod;
  carrier: string;
  trackingNumber: string;
};

export type ReturnType = "return" | "replacement";
export type ReturnStatus = "requested" | "approved" | "rejected" | "resolved";

export type ReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productName: string;
  type: ReturnType;
  reason: string;
  status: ReturnStatus;
  evidenceImageLabel?: string;
  requestedAt: string;
  notes: Note[];
  resolutionNote?: string;
};

export type DailyPoint = { date: string; orders: number; revenue: number };
export type StatusCount = { status: OrderStatus; count: number };

export type ProductPerformance = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
};

export type ReportsData = {
  dailySeries: DailyPoint[];
  productPerformance: ProductPerformance[];
  statusBreakdown: StatusCount[];
  totalOrders: number;
  totalRevenue: number;
};

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
};

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type StockLevel = "in_stock" | "low_stock" | "out_of_stock";

export type ProductListParams = ListParams & {
  categoryId?: string;
  status?: ProductStatus;
  petType?: PetType;
  stockLevel?: StockLevel;
};

export type OrderListParams = ListParams & {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfilmentStatus?: FulfilmentStatus;
  productId?: string;
  state?: string;
  from?: string;
  to?: string;
};

export type ReturnListParams = ListParams & {
  status?: ReturnStatus;
};

export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Dashboard analytics domain — backed by GET /admin/dashboard/summary and
 * /admin/dashboard/filter-options (see mypetmart-backend's DashboardModels).
 * There is no session/page-view/traffic-source tracking anywhere in this
 * system, so metrics that would require it (conversion rate, the
 * sessions->views->cart->checkout funnel, traffic sources, product view
 * counts) are not part of this type domain at all — seeing them would mean
 * they were fabricated. Everything here is derived from real Orders,
 * OrderItems, ReturnRequests and Shipments.
 */

/** Status vocabulary for the dashboard's Order-status donut — the same
 *  7-value OrderStatus the backend uses everywhere else (incl. /admin/orders). */
export type DashboardOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested";

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export type DashboardFilter = {
  preset: DateRangePreset;
  from: string;
  to: string;
  compare: boolean;
  productId?: number;
  orderStatus?: DashboardOrderStatus;
  state?: string;
};

export type DashboardFilterOptions = {
  products: { id: number; name: string }[];
  states: string[];
  orderStatuses: DashboardOrderStatus[];
};

export type MetricComparison = {
  value: number;
  previousValue: number;
  /** null when there is no previous-period data to compare against (e.g. compare is off). */
  changePct: number | null;
};

export type CommerceSummary = {
  grossSales: MetricComparison;
  orders: MetricComparison;
  averageOrderValue: MetricComparison;
  customers: MetricComparison;
  openReturns: MetricComparison;
};

export type TimeSeriesPoint = { date: string; label: string; sales: number; orders: number; units: number };

export type TimeSeries = {
  current: TimeSeriesPoint[];
  previous: TimeSeriesPoint[];
  groupBy: "day" | "week";
};

export type ProductPerformanceRow = {
  productId: number;
  name: string;
  unitsSold: number;
  revenue: number;
  returnRequests: number;
};

export type OrderStatusSlice = { status: DashboardOrderStatus; count: number; percentage: number };

export type FulfilmentSummary = {
  awaitingFulfilment: number;
  packed: number;
  shipped: number;
  delivered: number;
  delayed: number;
  avgProcessingHours: number;
  avgDeliveryDays: number;
  standardOrders: number;
  expressOrders: number;
};

export type LocationPerformance = {
  state: string;
  city: string;
  orders: number;
  customers: number;
  revenue: number;
  averageOrderValue: number;
};

export type CustomerOverview = {
  newCustomers: number;
  returningCustomers: number;
  firstTimeBuyers: number;
  repeatPurchaseRate: number;
  returningCustomerRevenue: number;
  recentCustomers: { id: number; name: string; joinedAt: string; isReturning: boolean }[];
};

export type ReturnsOverview = {
  open: number;
  statusBreakdown: { status: "requested" | "approved" | "rejected" | "resolved"; count: number }[];
};

export type BusinessInsight = {
  id: string;
  tone: "positive" | "neutral" | "warning";
  text: string;
};

export type DashboardOrderRow = {
  orderId: number;
  orderNumber: string;
  customerLabel: string;
  total: number;
  status: DashboardOrderStatus;
  placedAt: string;
  itemCount: number;
};

export type DashboardAnalyticsResult = {
  isEmpty: boolean;
  summary: CommerceSummary;
  timeSeries: TimeSeries;
  productPerformance: ProductPerformanceRow[];
  orderStatus: OrderStatusSlice[];
  recentOrders: DashboardOrderRow[];
  fulfilment: FulfilmentSummary;
  locations: LocationPerformance[];
  customerOverview: CustomerOverview;
  returns: ReturnsOverview;
  insights: BusinessInsight[];
};
