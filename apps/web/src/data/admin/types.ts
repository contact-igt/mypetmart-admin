import type { PlaceholderTone } from "@/components/image-placeholder";

/**
 * Admin-panel domain types. Demo-data foundation only — see
 * docs/ADMIN_PANEL_PLAN.md §6. Shapes are written so a future
 * RestAdminRepository can implement the same `AdminRepository` interface
 * without any page-level changes.
 */

export type ProductStatus = "active" | "draft" | "archived";

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  status: ProductStatus;
  price: number;
  originalPrice?: number;
  stock: number;
  imageLabel: string;
  tone: PlaceholderTone;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">;

export type Category = {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
};

export type CategoryInput = { name: string; active: boolean };

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedAt: string;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  productId: string;
  name: string;
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
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "paid" | "pending" | "refunded";
  shippingAddress: string;
  placedAt: string;
  timeline: TimelineEvent[];
  notes: Note[];
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

export type ProductListParams = ListParams & {
  categoryId?: string;
  status?: ProductStatus;
};

export type OrderListParams = ListParams & {
  status?: OrderStatus;
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
 * Dashboard analytics domain — a self-contained event-driven demo dataset
 * (data/admin/dashboard-fixtures.ts) distinct from the Order/Customer
 * fixtures used by /admin/orders and /admin/customers. See
 * docs/audits/admin-dashboard-refinement-digest.md for why the two are
 * separate demo datasets rather than one shared source.
 */

export type TrafficSource =
  | "direct"
  | "instagram"
  | "facebook"
  | "google_organic"
  | "meta_ads"
  | "youtube"
  | "other";

export type CommerceEventType =
  | "session_started"
  | "product_viewed"
  | "added_to_cart"
  | "checkout_started"
  | "order_completed"
  | "order_fulfilled"
  | "return_requested";

/** Status vocabulary for the dashboard's Order-status donut — intentionally
 *  separate from the 5-value `OrderStatus` used by /admin/orders, since the
 *  donut requires "Confirmed" and "Return requested" buckets that the order
 *  list's status field does not carry. */
export type DashboardOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested";

export type ShippingMode = "standard" | "express";
export type ReturnReasonCode = "damaged" | "wrong_item" | "other";

export type CommerceEvent = {
  id: string;
  type: CommerceEventType;
  at: string;
  sessionId: string;
  /** Present once a session is attributable to a known or synthetic customer identity (assigned at order_completed and carried onto related events for that order). Whether this is the customer's first-ever order is derived downstream from the full event history, not stored here. */
  customerId?: string;
  /** Single line-item granularity: a 2-item order emits 2 order_completed events sharing orderId. */
  productId?: string;
  quantity?: number;
  source: TrafficSource;
  state: string;
  city: string;
  orderId?: string;
  orderValue?: number;
  orderStatus?: DashboardOrderStatus;
  shippingMode?: ShippingMode;
  returnReason?: ReturnReasonCode;
};

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export type DashboardFilter = {
  preset: DateRangePreset;
  from: string;
  to: string;
  compare: boolean;
  productId?: string;
  orderStatus?: DashboardOrderStatus;
  state?: string;
  source?: TrafficSource;
};

export type DashboardFilterOptions = {
  products: { id: string; name: string }[];
  states: string[];
  orderStatuses: DashboardOrderStatus[];
  sources: TrafficSource[];
};

export type MetricComparison = {
  value: number;
  previousValue: number;
  /** null when there is no previous-period data to compare against (e.g. compare is off, or previous period is entirely outside the 90-day dataset). */
  changePct: number | null;
};

export type CommerceSummary = {
  grossSales: MetricComparison;
  orders: MetricComparison;
  averageOrderValue: MetricComparison;
  conversionRate: MetricComparison;
  customers: MetricComparison;
  openReturns: MetricComparison;
};

export type TimeSeriesPoint = { date: string; label: string; sales: number; orders: number; units: number };

export type TimeSeries = {
  current: TimeSeriesPoint[];
  previous: TimeSeriesPoint[];
  groupBy: "day" | "week";
};

export type FunnelStage = {
  key: "sessions" | "product_views" | "added_to_cart" | "checkout_started" | "purchase_completed";
  label: string;
  count: number;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
};

export type ProductPerformanceRow = {
  productId: string;
  name: string;
  views: number;
  cartAdds: number;
  checkouts: number;
  unitsSold: number;
  conversionRate: number;
  revenue: number;
  returnRequests: number;
};

export type ProductInterestRow = {
  productId: string;
  name: string;
  views: number;
  uniqueVisitors: number;
  cartAdds: number;
  viewToCartRate: number;
  cartToPurchaseRate: number;
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
  recentCustomers: { id: string; name: string; joinedAt: string; isReturning: boolean }[];
};

export type ReturnsOverview = {
  open: number;
  damaged: number;
  wrongItem: number;
  other: number;
  statusBreakdown: { status: "requested" | "approved" | "rejected" | "resolved"; count: number }[];
  eligibleWithinWindowPct: number;
  returnWindowDays: number;
};

export type TrafficSourceRow = {
  source: TrafficSource;
  label: string;
  sessions: number;
  orders: number;
  conversionRate: number;
  revenue: number;
};

export type BusinessInsight = {
  id: string;
  tone: "positive" | "neutral" | "warning";
  text: string;
};

export type DashboardOrderRow = {
  orderId: string;
  orderNumber: string;
  customerLabel: string;
  total: number;
  status: DashboardOrderStatus;
  placedAt: string;
  itemCount: number;
};

export type DashboardAnalyticsResult = {
  filter: DashboardFilter;
  isEmpty: boolean;
  summary: CommerceSummary;
  timeSeries: TimeSeries;
  funnel: FunnelStage[];
  productPerformance: ProductPerformanceRow[];
  productInterest: ProductInterestRow[];
  mostViewedProductName: string | null;
  orderStatus: OrderStatusSlice[];
  recentOrders: DashboardOrderRow[];
  fulfilment: FulfilmentSummary;
  locations: LocationPerformance[];
  customerOverview: CustomerOverview;
  returns: ReturnsOverview;
  trafficSources: TrafficSourceRow[];
  insights: BusinessInsight[];
};
