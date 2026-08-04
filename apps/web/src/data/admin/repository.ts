import type {
  Category,
  CategoryInput,
  Customer,
  DashboardAnalyticsResult,
  DashboardFilter,
  DashboardFilterOptions,
  FulfilmentStatus,
  ListResult,
  Order,
  OrderListParams,
  OrderStatus,
  OrderSummary,
  PaymentStatus,
  Product,
  ProductInput,
  ProductListParams,
  ProductSummary,
  ReportsData,
  ReturnListParams,
  ReturnRequest,
  ReturnStatus,
  ShippingDetailsInput,
  StoreSettings,
} from "./types";

/**
 * Every method is a Promise, mirroring what a real REST-backed
 * implementation looks like. Swapping the demo `mockAdminRepository` for a
 * `RestAdminRepository` later means implementing this interface — no page
 * changes. See docs/ADMIN_PANEL_PLAN.md §6.
 */
export interface AdminRepository {
  getDashboardFilterOptions(): Promise<DashboardFilterOptions>;
  getDashboardAnalytics(filter: DashboardFilter): Promise<DashboardAnalyticsResult>;

  getProductSummary(): Promise<ProductSummary>;
  listProducts(params: ProductListParams): Promise<ListResult<Product>>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  duplicateProduct(id: string): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  bulkDeleteProducts(ids: string[]): Promise<void>;
  bulkSetProductStatus(ids: string[], status: Product["status"]): Promise<void>;

  listCategories(): Promise<Category[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: string, input: CategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  reorderCategory(id: string, direction: "up" | "down"): Promise<Category[]>;
  setCategoryActive(id: string, active: boolean): Promise<Category>;

  getOrderSummary(): Promise<OrderSummary>;
  listOrders(params: OrderListParams): Promise<ListResult<Order>>;
  getOrder(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  updateOrderFulfilmentStatus(id: string, status: FulfilmentStatus): Promise<Order>;
  updateOrderPaymentStatus(id: string, status: PaymentStatus): Promise<Order>;
  updateOrderShippingDetails(id: string, input: ShippingDetailsInput): Promise<Order>;
  bulkUpdateOrderStatus(ids: string[], status: OrderStatus): Promise<{ updated: number; skipped: number }>;
  addOrderNote(id: string, message: string): Promise<Order>;
  getReturnsForOrder(orderId: string): Promise<ReturnRequest[]>;

  listCustomers(params: { page?: number; pageSize?: number; search?: string }): Promise<
    ListResult<Customer>
  >;
  getCustomer(id: string): Promise<Customer | null>;
  getCustomerOrders(id: string): Promise<Order[]>;

  listReturns(params: ReturnListParams): Promise<ListResult<ReturnRequest>>;
  getReturn(id: string): Promise<ReturnRequest | null>;
  updateReturnStatus(
    id: string,
    status: ReturnStatus,
    resolutionNote?: string,
  ): Promise<ReturnRequest>;
  addReturnNote(id: string, message: string): Promise<ReturnRequest>;

  getReportsData(params: { from?: string; to?: string }): Promise<ReportsData>;

  getStoreSettings(): Promise<StoreSettings>;
  updateStoreSettings(input: StoreSettings): Promise<StoreSettings>;
}
