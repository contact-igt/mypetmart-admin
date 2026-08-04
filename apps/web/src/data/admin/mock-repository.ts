import type { AdminRepository } from "./repository";
import { computeDashboardAnalytics, getDashboardFilterOptions as getDashboardFilterOptionsSync } from "./dashboard-analytics";
import {
  getValidNextFulfilmentStatuses,
  getValidNextOrderStatuses,
  getValidNextPaymentStatuses,
} from "./order-status-rules";
import {
  CATEGORIES,
  CUSTOMERS,
  ORDERS,
  PRODUCTS,
  RETURNS,
  STORE_SETTINGS,
} from "./fixtures";
import type {
  Category,
  CategoryInput,
  Customer,
  DashboardAnalyticsResult,
  DashboardFilter,
  DashboardFilterOptions,
  FulfilmentStatus,
  ListResult,
  Note,
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

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nextId(prefix: string, existing: { id: string }[]): string {
  let n = existing.length + 1;
  while (existing.some((item) => item.id === `${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

function paginate<T>(items: T[], page = 1, pageSize = 10): ListResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

const LOW_STOCK_THRESHOLD = 5;

function matchesStockLevel(product: Product, level: NonNullable<ProductListParams["stockLevel"]>): boolean {
  if (level === "out_of_stock") return product.stock === 0;
  if (level === "low_stock") return product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  return product.stock > LOW_STOCK_THRESHOLD;
}

/**
 * In-memory, module-singleton implementation of AdminRepository. State lives
 * only for the browser session (resets on hard reload) — never localStorage.
 * Fixtures are cloned on load so mutation never touches the original
 * fixture arrays (keeps behaviour predictable if this module were ever
 * re-imported).
 */
class MockAdminRepository implements AdminRepository {
  private products: Product[] = clone(PRODUCTS);
  private categories: Category[] = clone(CATEGORIES);
  private orders: Order[] = clone(ORDERS);
  private customers: Customer[] = clone(CUSTOMERS);
  private returns: ReturnRequest[] = clone(RETURNS);
  private settings: StoreSettings = clone(STORE_SETTINGS);

  // ---------------------------------------------------------------- dashboard
  async getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
    return delay(getDashboardFilterOptionsSync());
  }

  async getDashboardAnalytics(filter: DashboardFilter): Promise<DashboardAnalyticsResult> {
    return delay(computeDashboardAnalytics(filter));
  }

  // ----------------------------------------------------------------- products
  async getProductSummary(): Promise<ProductSummary> {
    return delay({
      total: this.products.length,
      active: this.products.filter((p) => p.status === "active").length,
      draft: this.products.filter((p) => p.status === "draft").length,
      archived: this.products.filter((p) => p.status === "archived").length,
      outOfStock: this.products.filter((p) => p.stock === 0).length,
    });
  }

  async listProducts(params: ProductListParams): Promise<ListResult<Product>> {
    let items = [...this.products];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(q)),
      );
    }
    if (params.categoryId) items = items.filter((p) => p.categoryId === params.categoryId);
    if (params.status) items = items.filter((p) => p.status === params.status);
    if (params.petType) items = items.filter((p) => p.petType === params.petType || p.petType === "all");
    if (params.stockLevel) items = items.filter((p) => matchesStockLevel(p, params.stockLevel!));

    const sortBy = params.sortBy ?? "updatedAt";
    const dir = params.sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      const av = a[sortBy as keyof Product];
      const bv = b[sortBy as keyof Product];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return delay(paginate(items, params.page, params.pageSize ?? 10));
  }

  async getProduct(id: string): Promise<Product | null> {
    return delay(this.products.find((p) => p.id === id) ?? null);
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = {
      ...input,
      id: nextId("prod", this.products),
      slug: slugify(input.name),
      createdAt: now,
      updatedAt: now,
    };
    this.products = [product, ...this.products];
    return delay(clone(product));
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Product not found");
    const updated: Product = {
      ...this.products[index],
      ...input,
      slug: slugify(input.name),
      updatedAt: new Date().toISOString(),
    };
    this.products[index] = updated;
    return delay(clone(updated));
  }

  async duplicateProduct(id: string): Promise<Product> {
    const source = this.products.find((p) => p.id === id);
    if (!source) throw new Error("Product not found");
    const now = new Date().toISOString();
    const newId = nextId("prod", this.products);
    const copy: Product = {
      ...clone(source),
      id: newId,
      name: `${source.name} (Copy)`,
      slug: slugify(`${source.name}-copy-${newId}`),
      sku: `${source.sku}-COPY`,
      status: "draft",
      images: source.images.map((img, i) => ({ ...img, id: `${newId}-img-${i + 1}` })),
      variants: source.variants.map((v, i) => ({ ...v, id: `${newId}-v${i + 1}`, sku: `${v.sku}-COPY` })),
      createdAt: now,
      updatedAt: now,
    };
    this.products = [copy, ...this.products];
    return delay(clone(copy));
  }

  async deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
    return delay(undefined);
  }

  async bulkDeleteProducts(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.products = this.products.filter((p) => !idSet.has(p.id));
    return delay(undefined);
  }

  async bulkSetProductStatus(ids: string[], status: Product["status"]): Promise<void> {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    this.products = this.products.map((p) => (idSet.has(p.id) ? { ...p, status, updatedAt: now } : p));
    return delay(undefined);
  }

  // --------------------------------------------------------------- categories
  private productCountFor(categoryId: string): number {
    return this.products.filter((p) => p.categoryId === categoryId).length;
  }

  async listCategories(): Promise<Category[]> {
    return delay(
      [...this.categories]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ ...c, productCount: this.productCountFor(c.id) })),
    );
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const category: Category = {
      id: nextId("cat", this.categories),
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      petType: input.petType,
      active: input.active,
      order: this.categories.length,
    };
    this.categories = [...this.categories, category];
    return delay({ ...clone(category), productCount: 0 });
  }

  async updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    const updated: Category = {
      ...this.categories[index],
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      petType: input.petType,
      active: input.active,
    };
    this.categories[index] = updated;
    return delay({ ...clone(updated), productCount: this.productCountFor(id) });
  }

  async deleteCategory(id: string): Promise<void> {
    const inUse = this.productCountFor(id);
    if (inUse > 0) {
      throw new Error(
        `${inUse} product${inUse === 1 ? "" : "s"} still use this category. Deactivate it instead, or move those products first.`,
      );
    }
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    this.categories = this.categories.filter((c) => c.id !== id);
    return delay(undefined);
  }

  async reorderCategory(id: string, direction: "up" | "down"): Promise<Category[]> {
    const sorted = [...this.categories].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((c) => c.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= sorted.length) {
      return delay([...sorted]);
    }
    const a = sorted[index];
    const b = sorted[swapWith];
    const tempOrder = a.order;
    a.order = b.order;
    b.order = tempOrder;
    this.categories = sorted;
    return delay([...sorted].sort((x, y) => x.order - y.order).map(clone));
  }

  async setCategoryActive(id: string, active: boolean): Promise<Category> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    this.categories[index] = { ...this.categories[index], active };
    return delay(clone(this.categories[index]));
  }

  // ------------------------------------------------------------------ orders
  private appendTimeline(order: Order, label: string): Order {
    return {
      ...order,
      timeline: [...order.timeline, { id: `t-${order.timeline.length + 1}-${Date.now()}`, label, at: new Date().toISOString() }],
    };
  }

  async getOrderSummary(): Promise<OrderSummary> {
    return delay({
      total: this.orders.length,
      pending: this.orders.filter((o) => o.status === "pending").length,
      processing: this.orders.filter((o) => o.status === "processing").length,
      shipped: this.orders.filter((o) => o.status === "shipped").length,
      delivered: this.orders.filter((o) => o.status === "delivered").length,
      cancelled: this.orders.filter((o) => o.status === "cancelled").length,
      returns: this.orders.filter((o) => o.status === "return_requested").length,
    });
  }

  async listOrders(params: OrderListParams): Promise<ListResult<Order>> {
    let items = [...this.orders];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((o) => {
        const customer = this.customers.find((c) => c.id === o.customerId);
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (customer?.email.toLowerCase().includes(q) ?? false) ||
          (customer?.phone.toLowerCase().includes(q) ?? false)
        );
      });
    }
    if (params.status) items = items.filter((o) => o.status === params.status);
    if (params.paymentStatus) items = items.filter((o) => o.paymentStatus === params.paymentStatus);
    if (params.fulfilmentStatus) items = items.filter((o) => o.fulfilmentStatus === params.fulfilmentStatus);
    if (params.productId) items = items.filter((o) => o.items.some((i) => i.productId === params.productId));
    if (params.state) items = items.filter((o) => o.state === params.state);
    if (params.from) items = items.filter((o) => o.placedAt >= params.from!);
    if (params.to) items = items.filter((o) => o.placedAt <= params.to!);

    const dir = params.sortDir === "asc" ? 1 : -1;
    if (params.sortBy === "total") {
      items.sort((a, b) => (a.total - b.total) * dir);
    } else {
      items.sort((a, b) => (new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()) * dir);
    }

    return delay(paginate(items, params.page, params.pageSize ?? 10));
  }

  async getOrder(id: string): Promise<Order | null> {
    return delay(this.orders.find((o) => o.id === id) ?? null);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const order = this.orders[index];
    if (!getValidNextOrderStatuses(order.status).includes(status)) {
      throw new Error(`Cannot move an order from "${order.status}" to "${status}".`);
    }
    const updated = this.appendTimeline({ ...order, status }, `Status changed to ${status.replace(/_/g, " ")}`);
    this.orders[index] = updated;
    return delay(clone(updated));
  }

  async updateOrderFulfilmentStatus(id: string, status: FulfilmentStatus): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const order = this.orders[index];
    if (!getValidNextFulfilmentStatuses(order.fulfilmentStatus).includes(status)) {
      throw new Error(`Cannot move fulfilment from "${order.fulfilmentStatus}" to "${status}".`);
    }
    const updated = this.appendTimeline({ ...order, fulfilmentStatus: status }, `Fulfilment changed to ${status}`);
    this.orders[index] = updated;
    return delay(clone(updated));
  }

  async updateOrderPaymentStatus(id: string, status: PaymentStatus): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const order = this.orders[index];
    if (!getValidNextPaymentStatuses(order.paymentStatus).includes(status)) {
      throw new Error(`Cannot move payment from "${order.paymentStatus}" to "${status}".`);
    }
    const updated = this.appendTimeline({ ...order, paymentStatus: status }, `Payment changed to ${status}`);
    this.orders[index] = updated;
    return delay(clone(updated));
  }

  async updateOrderShippingDetails(id: string, input: ShippingDetailsInput): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const order = this.orders[index];
    const updated = this.appendTimeline(
      { ...order, shippingMethod: input.shippingMethod, carrier: input.carrier, trackingNumber: input.trackingNumber },
      input.trackingNumber ? `Tracking updated — ${input.carrier} ${input.trackingNumber}` : "Shipping details updated",
    );
    this.orders[index] = updated;
    return delay(clone(updated));
  }

  async bulkUpdateOrderStatus(ids: string[], status: OrderStatus): Promise<{ updated: number; skipped: number }> {
    const idSet = new Set(ids);
    let updated = 0;
    let skipped = 0;
    this.orders = this.orders.map((o) => {
      if (!idSet.has(o.id)) return o;
      if (!getValidNextOrderStatuses(o.status).includes(status)) {
        skipped += 1;
        return o;
      }
      updated += 1;
      return this.appendTimeline({ ...o, status }, `Status changed to ${status.replace(/_/g, " ")} (bulk update)`);
    });
    return delay({ updated, skipped });
  }

  async addOrderNote(id: string, message: string): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const note: Note = {
      id: `n-${this.orders[index].notes.length + 1}-${Date.now()}`,
      author: "Demo Admin",
      message,
      createdAt: new Date().toISOString(),
    };
    this.orders[index] = { ...this.orders[index], notes: [...this.orders[index].notes, note] };
    return delay(clone(this.orders[index]));
  }

  async getReturnsForOrder(orderId: string): Promise<ReturnRequest[]> {
    return delay(this.returns.filter((r) => r.orderId === orderId).map(clone));
  }

  // --------------------------------------------------------------- customers
  async listCustomers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<ListResult<Customer>> {
    let items = [...this.customers];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      );
    }
    return delay(paginate(items, params.page, params.pageSize ?? 10));
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return delay(this.customers.find((c) => c.id === id) ?? null);
  }

  async getCustomerOrders(id: string): Promise<Order[]> {
    return delay(
      this.orders
        .filter((o) => o.customerId === id)
        .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()),
    );
  }

  // ----------------------------------------------------------------- returns
  async listReturns(params: ReturnListParams): Promise<ListResult<ReturnRequest>> {
    let items = [...this.returns];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.orderNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q),
      );
    }
    if (params.status) items = items.filter((r) => r.status === params.status);
    items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return delay(paginate(items, params.page, params.pageSize ?? 10));
  }

  async getReturn(id: string): Promise<ReturnRequest | null> {
    return delay(this.returns.find((r) => r.id === id) ?? null);
  }

  async updateReturnStatus(
    id: string,
    status: ReturnStatus,
    resolutionNote?: string,
  ): Promise<ReturnRequest> {
    const index = this.returns.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("Return request not found");
    this.returns[index] = {
      ...this.returns[index],
      status,
      resolutionNote: resolutionNote ?? this.returns[index].resolutionNote,
    };
    return delay(clone(this.returns[index]));
  }

  async addReturnNote(id: string, message: string): Promise<ReturnRequest> {
    const index = this.returns.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("Return request not found");
    const note: Note = {
      id: `n-${this.returns[index].notes.length + 1}-${Date.now()}`,
      author: "Demo Admin",
      message,
      createdAt: new Date().toISOString(),
    };
    this.returns[index] = { ...this.returns[index], notes: [...this.returns[index].notes, note] };
    return delay(clone(this.returns[index]));
  }

  // ----------------------------------------------------------------- reports
  async getReportsData(params: { from?: string; to?: string }): Promise<ReportsData> {
    let scoped = [...this.orders];
    if (params.from) scoped = scoped.filter((o) => o.placedAt >= params.from!);
    if (params.to) scoped = scoped.filter((o) => o.placedAt <= params.to!);

    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of scoped) {
      const day = order.placedAt.slice(0, 10);
      const entry = dayMap.get(day) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      dayMap.set(day, entry);
    }
    const dailySeries = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const perfMap = new Map<string, { name: string; unitsSold: number; revenue: number }>();
    for (const order of scoped) {
      for (const item of order.items) {
        const entry = perfMap.get(item.productId) ?? { name: item.name, unitsSold: 0, revenue: 0 };
        entry.unitsSold += item.quantity;
        entry.revenue += item.quantity * item.price;
        perfMap.set(item.productId, entry);
      }
    }
    const productPerformance = [...perfMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    const statusBreakdown = (
      ["pending", "processing", "shipped", "delivered", "cancelled"] as OrderStatus[]
    ).map((status) => ({ status, count: scoped.filter((o) => o.status === status).length }));

    return delay({
      dailySeries,
      productPerformance,
      statusBreakdown,
      totalOrders: scoped.length,
      totalRevenue: scoped.reduce((sum, o) => sum + o.total, 0),
    });
  }

  // ---------------------------------------------------------------- settings
  async getStoreSettings(): Promise<StoreSettings> {
    return delay(clone(this.settings));
  }

  async updateStoreSettings(input: StoreSettings): Promise<StoreSettings> {
    this.settings = { ...input };
    return delay(clone(this.settings));
  }
}

/** Single shared instance — swap for a RestAdminRepository by changing this line only. */
export const adminRepository: AdminRepository = new MockAdminRepository();
