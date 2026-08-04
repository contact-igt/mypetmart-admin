import type { AdminRepository } from "./repository";
import { computeDashboardAnalytics, getDashboardFilterOptions as getDashboardFilterOptionsSync } from "./dashboard-analytics";
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
  ListResult,
  Note,
  Order,
  OrderListParams,
  OrderStatus,
  Product,
  ProductInput,
  ProductListParams,
  ReportsData,
  ReturnListParams,
  ReturnRequest,
  ReturnStatus,
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
  async listProducts(params: ProductListParams): Promise<ListResult<Product>> {
    let items = [...this.products];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q));
    }
    if (params.categoryId) items = items.filter((p) => p.categoryId === params.categoryId);
    if (params.status) items = items.filter((p) => p.status === params.status);

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

  async deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
    return delay(undefined);
  }

  async bulkDeleteProducts(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.products = this.products.filter((p) => !idSet.has(p.id));
    return delay(undefined);
  }

  // --------------------------------------------------------------- categories
  async listCategories(): Promise<Category[]> {
    return delay([...this.categories].sort((a, b) => a.order - b.order));
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const category: Category = {
      id: nextId("cat", this.categories),
      name: input.name,
      slug: slugify(input.name),
      active: input.active,
      order: this.categories.length,
    };
    this.categories = [...this.categories, category];
    return delay(clone(category));
  }

  async updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    const updated: Category = {
      ...this.categories[index],
      name: input.name,
      slug: slugify(input.name),
      active: input.active,
    };
    this.categories[index] = updated;
    return delay(clone(updated));
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
  async listOrders(params: OrderListParams): Promise<ListResult<Order>> {
    let items = [...this.orders];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q),
      );
    }
    if (params.status) items = items.filter((o) => o.status === params.status);
    if (params.from) items = items.filter((o) => o.placedAt >= params.from!);
    if (params.to) items = items.filter((o) => o.placedAt <= params.to!);

    const dir = params.sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => (new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()) * dir);

    return delay(paginate(items, params.page, params.pageSize ?? 10));
  }

  async getOrder(id: string): Promise<Order | null> {
    return delay(this.orders.find((o) => o.id === id) ?? null);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Order not found");
    const order = this.orders[index];
    const updated: Order = {
      ...order,
      status,
      timeline: [
        ...order.timeline,
        { id: `t-${order.timeline.length + 1}`, label: `Status changed to ${status}`, at: new Date().toISOString() },
      ],
    };
    this.orders[index] = updated;
    return delay(clone(updated));
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
