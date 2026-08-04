import type {
  Category,
  Customer,
  Order,
  OrderStatus,
  Product,
  ReturnRequest,
  StoreSettings,
} from "./types";

/**
 * One dedicated location for all admin demo data. Never imported directly
 * by page components — always accessed through `adminRepository`
 * (mock-repository.ts). A fixed "now" anchors relative dates so the demo
 * reads consistently within a session.
 */
const NOW = new Date("2026-08-04T09:00:00Z");

function daysAgo(n: number, hour = 10): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const CATEGORIES: Category[] = [
  { id: "cat-grooming", name: "Grooming", slug: "grooming", description: "Brushes, combs and tools for coat care.", petType: "all", order: 0, active: true },
  { id: "cat-walking", name: "Walking Essentials", slug: "walking-essentials", description: "Leashes, harnesses and collars for daily walks.", petType: "dog", order: 1, active: true },
  { id: "cat-paw-care", name: "Paw Care", slug: "paw-care", description: "Pads and balms that protect paws on any surface.", petType: "all", order: 2, active: true },
  { id: "cat-dog", name: "Dog Essentials", slug: "dog-essentials", description: "Everyday dog-care basics — feeding, comfort and training.", petType: "dog", order: 3, active: true },
  { id: "cat-cat", name: "Cat Essentials", slug: "cat-essentials", description: "Beds, posts and fountains built for cats.", petType: "cat", order: 4, active: true },
  { id: "cat-seasonal", name: "Seasonal", slug: "seasonal", description: "Limited-run seasonal picks.", petType: "all", order: 5, active: false },
];

export const PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Mist-Powered Pet Grooming Brush",
    slug: "mist-powered-pet-grooming-brush",
    sku: "MPM-1001",
    description: "A mist-powered grooming brush designed to remove loose hair smoothly.",
    categoryId: "cat-grooming",
    petType: "all",
    tags: ["grooming", "brush", "bestseller"],
    featured: true,
    status: "active",
    price: 899,
    originalPrice: 1499,
    stock: 42,
    images: [
      { id: "img-1a", label: "Small dog being groomed with a mist brush", tone: "terracotta", alt: "Small dog being groomed with a mist-powered brush" },
      { id: "img-1b", label: "Close-up of the mist brush's bristle head", tone: "cream", alt: "Close-up of the mist brush bristle head" },
    ],
    variants: [
      { id: "v1", label: "Standard", sku: "MPB-STD", price: 899, stock: 30 },
      { id: "v2", label: "Travel size", sku: "MPB-TRV", price: 649, stock: 12 },
    ],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3),
  },
  {
    id: "prod-2",
    name: "Dog Anti-Slip Paw Pads",
    slug: "dog-anti-slip-paw-pads",
    sku: "MPM-1002",
    description: "Anti-slip pads for confident footing on tiled and wood floors.",
    categoryId: "cat-paw-care",
    petType: "dog",
    tags: ["paw-care", "bestseller"],
    featured: true,
    status: "active",
    price: 549,
    originalPrice: 799,
    stock: 8,
    images: [{ id: "img-2a", label: "Two small dogs wearing paw pads", tone: "cream", alt: "Two small dogs wearing anti-slip paw pads" }],
    variants: [{ id: "v1", label: "Pack of 4", sku: "PAW-4", price: 549, stock: 8 }],
    createdAt: daysAgo(85),
    updatedAt: daysAgo(10),
  },
  {
    id: "prod-3",
    name: "Ultimate Dual Dog Leash",
    slug: "ultimate-dual-dog-leash",
    sku: "MPM-1003",
    description: "360-degree tangle-free rotation for walking two dogs at once.",
    categoryId: "cat-walking",
    petType: "dog",
    tags: ["walking", "leash", "bestseller"],
    featured: true,
    status: "active",
    price: 1299,
    originalPrice: 1899,
    stock: 25,
    images: [
      { id: "img-3a", label: "Red dual dog leash coiled on a wooden surface", tone: "brown", alt: "Red dual dog leash coiled on a wooden surface" },
      { id: "img-3b", label: "Dual leash in use on a walk with two dogs", tone: "orange", alt: "Dual leash in use while walking two dogs" },
    ],
    variants: [{ id: "v1", label: "Standard", sku: "LSH-DUAL", price: 1299, stock: 25 }],
    createdAt: daysAgo(80),
    updatedAt: daysAgo(80),
  },
  {
    id: "prod-4",
    name: "Warm Clay Slow-Feed Bowl",
    slug: "warm-clay-slow-feed-bowl",
    sku: "MPM-1004",
    description: "Slow-feed bowl that reduces gulping and bloating risk.",
    categoryId: "cat-dog",
    petType: "dog",
    tags: ["feeding"],
    featured: false,
    status: "active",
    price: 649,
    originalPrice: 899,
    stock: 3,
    images: [{ id: "img-4a", label: "Small dog eating from a slow-feed bowl outdoors", tone: "mint", alt: "Small dog eating from a slow-feed bowl outdoors" }],
    variants: [{ id: "v1", label: "Standard", sku: "BWL-SLOW", price: 649, stock: 3 }],
    createdAt: daysAgo(75),
    updatedAt: daysAgo(1),
  },
  {
    id: "prod-5",
    name: "Arch Cave Cat Bed",
    slug: "arch-cave-cat-bed",
    sku: "MPM-1005",
    description: "A felt-shell cave bed cats can claim as their own.",
    categoryId: "cat-cat",
    petType: "cat",
    tags: ["bed", "comfort"],
    featured: false,
    status: "active",
    price: 1799,
    originalPrice: 2499,
    stock: 15,
    images: [{ id: "img-5a", label: "Ginger and white cat sitting on a pathway", tone: "peach", alt: "Ginger and white cat beside the arch cave bed" }],
    variants: [{ id: "v1", label: "Standard", sku: "BED-CAVE", price: 1799, stock: 15 }],
    createdAt: daysAgo(70),
    updatedAt: daysAgo(70),
  },
  {
    id: "prod-6",
    name: "Everyday Walking Harness",
    slug: "everyday-walking-harness",
    sku: "MPM-1006",
    description: "Padded chest harness for daily walks.",
    categoryId: "cat-walking",
    petType: "dog",
    tags: ["walking", "harness"],
    featured: false,
    status: "active",
    price: 1099,
    originalPrice: 1499,
    stock: 19,
    images: [
      { id: "img-6a", label: "Puppy running on grass at golden hour", tone: "orange", alt: "Puppy wearing the everyday walking harness on grass" },
      { id: "img-6b", label: "Harness laid flat showing padded chest panel", tone: "cream", alt: "Harness laid flat showing the padded chest panel" },
    ],
    variants: [
      { id: "v1", label: "Small", sku: "HAR-S", price: 1099, stock: 6 },
      { id: "v2", label: "Medium", sku: "HAR-M", price: 1099, stock: 8 },
      { id: "v3", label: "Large", sku: "HAR-L", price: 1199, stock: 5 },
    ],
    createdAt: daysAgo(65),
    updatedAt: daysAgo(5),
  },
  {
    id: "prod-7",
    name: "Hydrating Paw Balm",
    slug: "hydrating-paw-balm",
    sku: "MPM-1007",
    description: "Soothes cracked paw pads before and after walks.",
    categoryId: "cat-paw-care",
    petType: "dog",
    tags: ["paw-care"],
    featured: false,
    status: "active",
    price: 349,
    originalPrice: 499,
    stock: 0,
    images: [{ id: "img-7a", label: "French bulldog wearing a yellow hoodie against a blue background", tone: "peach", alt: "French bulldog after a paw-balm application" }],
    variants: [{ id: "v1", label: "30ml", sku: "BLM-30", price: 349, stock: 0 }],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  {
    id: "prod-8",
    name: "Rubber Bone Chew Toy",
    slug: "rubber-bone-chew-toy",
    sku: "MPM-1008",
    description: "Durable chew toy for medium to large dogs.",
    categoryId: "cat-dog",
    petType: "dog",
    tags: ["toy"],
    featured: false,
    status: "active",
    price: 449,
    originalPrice: 649,
    stock: 60,
    images: [{ id: "img-8a", label: "Golden retriever standing outdoors on a dirt path", tone: "cream", alt: "Golden retriever with the rubber bone chew toy" }],
    variants: [{ id: "v1", label: "Standard", sku: "TOY-BONE", price: 449, stock: 60 }],
    createdAt: daysAgo(55),
    updatedAt: daysAgo(55),
  },
  {
    id: "prod-9",
    name: "Reflective Night Collar",
    slug: "reflective-night-collar",
    sku: "MPM-1009",
    description: "High-visibility collar with reflective stitching for evening walks.",
    categoryId: "cat-walking",
    petType: "dog",
    tags: ["walking", "collar"],
    featured: false,
    status: "draft",
    price: 399,
    stock: 0,
    images: [{ id: "img-9a", label: "Dog collar with reflective stitching on a dark background", tone: "brown", alt: "Reflective night collar on a dark background" }],
    variants: [{ id: "v1", label: "Standard", sku: "CLR-NIGHT", price: 399, stock: 0 }],
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: "prod-10",
    name: "Cat Scratching Post — Tall",
    slug: "cat-scratching-post-tall",
    sku: "MPM-1010",
    description: "Sisal-wrapped scratching post with a perch platform.",
    categoryId: "cat-cat",
    petType: "cat",
    tags: ["scratching-post"],
    featured: false,
    status: "active",
    price: 2199,
    originalPrice: 2799,
    stock: 11,
    images: [{ id: "img-10a", label: "Tall cat scratching post in a sunlit room", tone: "mint", alt: "Tall sisal-wrapped cat scratching post" }],
    variants: [{ id: "v1", label: "Standard", sku: "POST-TALL", price: 2199, stock: 11 }],
    createdAt: daysAgo(48),
    updatedAt: daysAgo(48),
  },
  {
    id: "prod-11",
    name: "Puppy Training Pads (Pack of 30)",
    slug: "puppy-training-pads-30",
    sku: "MPM-1011",
    description: "Leak-proof training pads for house-training puppies.",
    categoryId: "cat-dog",
    petType: "dog",
    tags: ["training"],
    featured: false,
    status: "active",
    price: 799,
    originalPrice: 999,
    stock: 5,
    images: [{ id: "img-11a", label: "Stack of puppy training pads", tone: "cream", alt: "Stack of puppy training pads" }],
    variants: [{ id: "v1", label: "Pack of 30", sku: "PAD-30", price: 799, stock: 5 }],
    createdAt: daysAgo(40),
    updatedAt: daysAgo(4),
  },
  {
    id: "prod-12",
    name: "Grooming Comb — Double Sided",
    slug: "grooming-comb-double-sided",
    sku: "MPM-1012",
    description: "Fine and coarse teeth for detangling and de-shedding.",
    categoryId: "cat-grooming",
    petType: "all",
    tags: ["grooming", "comb"],
    featured: false,
    status: "active",
    price: 299,
    originalPrice: 399,
    stock: 33,
    images: [{ id: "img-12a", label: "Double-sided grooming comb on a wooden surface", tone: "orange", alt: "Double-sided grooming comb on a wooden surface" }],
    variants: [{ id: "v1", label: "Standard", sku: "CMB-2S", price: 299, stock: 33 }],
    createdAt: daysAgo(35),
    updatedAt: daysAgo(35),
  },
  {
    id: "prod-13",
    name: "Cat Water Fountain",
    slug: "cat-water-fountain",
    sku: "MPM-1013",
    description: "Quiet circulating fountain that encourages hydration.",
    categoryId: "cat-cat",
    petType: "cat",
    tags: ["fountain", "hydration"],
    featured: false,
    status: "archived",
    price: 1899,
    stock: 0,
    images: [{ id: "img-13a", label: "Cat water fountain on a kitchen counter", tone: "mint", alt: "Cat water fountain on a kitchen counter" }],
    variants: [{ id: "v1", label: "Standard", sku: "FTN-CAT", price: 1899, stock: 0 }],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(15),
  },
  {
    id: "prod-14",
    name: "Warm Fleece Pet Blanket",
    slug: "warm-fleece-pet-blanket",
    sku: "MPM-1014",
    description: "Soft fleece blanket sized for crates and beds.",
    categoryId: "cat-dog",
    petType: "all",
    tags: ["comfort", "blanket"],
    featured: false,
    status: "active",
    price: 599,
    originalPrice: 799,
    stock: 27,
    images: [{ id: "img-14a", label: "Fleece blanket folded on a dog bed", tone: "peach", alt: "Fleece blanket folded on a dog bed" }],
    variants: [{ id: "v1", label: "Standard", sku: "BLK-FLC", price: 599, stock: 27 }],
    createdAt: daysAgo(25),
    updatedAt: daysAgo(25),
  },
];

export const CUSTOMERS: Customer[] = [
  { id: "cust-1", name: "Ananya S.", email: "ananya.s@example.com", phone: "+91 98450 11223", address: "14 Lake View Road, Chennai – 600028", joinedAt: daysAgo(200) },
  { id: "cust-2", name: "Rahul K.", email: "rahul.k@example.com", phone: "+91 90031 44556", address: "7 MG Road, Bengaluru – 560001", joinedAt: daysAgo(180) },
  { id: "cust-3", name: "Priya M.", email: "priya.m@example.com", phone: "+91 99401 77889", address: "22 Anna Nagar, Chennai – 600040", joinedAt: daysAgo(150) },
  { id: "cust-4", name: "Karthik R.", email: "karthik.r@example.com", phone: "+91 98844 33221", address: "3 Besant Nagar, Chennai – 600090", joinedAt: daysAgo(120) },
  { id: "cust-5", name: "Meera D.", email: "meera.d@example.com", phone: "+91 97890 66112", address: "56 Koramangala, Bengaluru – 560034", joinedAt: daysAgo(100) },
  { id: "cust-6", name: "Vishal A.", email: "vishal.a@example.com", phone: "+91 90000 55443", address: "9 T Nagar, Chennai – 600017", joinedAt: daysAgo(90) },
  { id: "cust-7", name: "Divya S.", email: "divya.s@example.com", phone: "+91 96771 22334", address: "18 Adyar, Chennai – 600020", joinedAt: daysAgo(60) },
  { id: "cust-8", name: "Arjun N.", email: "arjun.n@example.com", phone: "+91 89012 34567", address: "44 Indiranagar, Bengaluru – 560038", joinedAt: daysAgo(45) },
  { id: "cust-9", name: "Sneha P.", email: "sneha.p@example.com", phone: "+91 88123 99887", address: "12 Velachery, Chennai – 600042", joinedAt: daysAgo(30) },
  { id: "cust-10", name: "Rohit V.", email: "rohit.v@example.com", phone: "+91 87654 32109", address: "5 Mylapore, Chennai – 600004", joinedAt: daysAgo(14) },
];

const STATUS_CYCLE: OrderStatus[] = ["delivered", "delivered", "shipped", "processing", "pending", "cancelled"];

/** Every demo customer's home address is in one of these two cities — used to fill Order.city/state without inventing new customer data. */
const CUSTOMER_LOCATION: Record<string, { city: string; state: string }> = {
  "cust-1": { city: "Chennai", state: "Tamil Nadu" },
  "cust-2": { city: "Bengaluru", state: "Karnataka" },
  "cust-3": { city: "Chennai", state: "Tamil Nadu" },
  "cust-4": { city: "Chennai", state: "Tamil Nadu" },
  "cust-5": { city: "Bengaluru", state: "Karnataka" },
  "cust-6": { city: "Chennai", state: "Tamil Nadu" },
  "cust-7": { city: "Chennai", state: "Tamil Nadu" },
  "cust-8": { city: "Bengaluru", state: "Karnataka" },
  "cust-9": { city: "Chennai", state: "Tamil Nadu" },
  "cust-10": { city: "Chennai", state: "Tamil Nadu" },
};

const CARRIERS = ["Blue Dart", "Delhivery", "India Post", "Ecom Express"];

/** Fulfilment starts out matching order status at creation time, then the two evolve independently once an admin edits either. */
function initialFulfilmentStatus(status: OrderStatus): Order["fulfilmentStatus"] {
  if (status === "processing") return "processing";
  if (status === "shipped") return "shipped";
  if (status === "delivered" || status === "return_requested") return "delivered";
  return "unfulfilled";
}

function buildOrder(
  index: number,
  daysBack: number,
  customer: Customer,
  items: { product: Product; quantity: number }[],
  statusOverride?: OrderStatus,
): Order {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shippingFee = subtotal > 999 ? 0 : 79;
  const status = statusOverride ?? STATUS_CYCLE[index % STATUS_CYCLE.length];
  const placedAt = daysAgo(daysBack, 9 + (index % 8));
  const confirmedStages: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered", "return_requested"];
  const processingStages: OrderStatus[] = ["processing", "shipped", "delivered", "return_requested"];
  const shippedStages: OrderStatus[] = ["shipped", "delivered", "return_requested"];
  const deliveredStages: OrderStatus[] = ["delivered", "return_requested"];

  const timeline: Order["timeline"] = [{ id: "t1", label: "Order placed", at: placedAt }];
  if (status !== "pending") {
    timeline.push({ id: "t2", label: "Payment confirmed", at: daysAgo(daysBack, 10) });
  }
  if (confirmedStages.includes(status)) {
    timeline.push({ id: "t2b", label: "Order confirmed", at: daysAgo(daysBack, 10) });
  }
  if (processingStages.includes(status)) {
    timeline.push({ id: "t3", label: "Processing started", at: daysAgo(Math.max(daysBack - 1, 0), 11) });
  }
  if (shippedStages.includes(status)) {
    timeline.push({ id: "t4", label: "Shipped", at: daysAgo(Math.max(daysBack - 2, 0), 14) });
  }
  if (deliveredStages.includes(status)) {
    timeline.push({ id: "t5", label: "Delivered", at: daysAgo(Math.max(daysBack - 4, 0), 16) });
  }
  if (status === "return_requested") {
    // Must land after "Delivered" chronologically (daysAgo lower = more recent; hour 20 > delivered's hour 16 covers the same-day case too).
    const deliveredDaysAgo = Math.max(daysBack - 4, 0);
    timeline.push({ id: "t6", label: "Return requested", at: daysAgo(Math.max(deliveredDaysAgo - 1, 0), 20) });
  }
  if (status === "cancelled") {
    timeline.push({ id: "t5", label: "Cancelled", at: daysAgo(Math.max(daysBack - 1, 0), 12) });
  }

  const location = CUSTOMER_LOCATION[customer.id] ?? { city: "Chennai", state: "Tamil Nadu" };
  const shippingMethod: Order["shippingMethod"] = index % 3 === 0 ? "express" : "standard";
  const hasShipped = shippedStages.includes(status);

  return {
    id: `order-${index + 1}`,
    orderNumber: `MPM-${1024 + index}`,
    customerId: customer.id,
    customerName: customer.name,
    status,
    fulfilmentStatus: initialFulfilmentStatus(status),
    items: items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      sku: i.product.sku,
      variantLabel: i.product.variants[0]?.label,
      quantity: i.quantity,
      price: i.product.price,
    })),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    paymentMethod: index % 3 === 0 ? "UPI" : index % 3 === 1 ? "Card" : "Net Banking",
    paymentStatus: status === "cancelled" ? "refunded" : status === "pending" ? "pending" : "paid",
    shippingAddress: customer.address,
    city: location.city,
    state: location.state,
    shippingMethod,
    carrier: hasShipped ? CARRIERS[index % CARRIERS.length] : "",
    trackingNumber: hasShipped ? `AWB${1000 + index}IN` : "",
    placedAt,
    timeline,
    notes:
      index % 4 === 0
        ? [{ id: "n1", author: "Admin", message: "Customer requested gift wrap.", createdAt: placedAt }]
        : [],
  };
}

const p = (id: string) => PRODUCTS.find((product) => product.id === id)!;

export const ORDERS: Order[] = [
  buildOrder(0, 0, CUSTOMERS[0], [{ product: p("prod-1"), quantity: 1 }], "pending"),
  buildOrder(1, 0, CUSTOMERS[1], [{ product: p("prod-3"), quantity: 1 }, { product: p("prod-6"), quantity: 1 }], "processing"),
  buildOrder(2, 1, CUSTOMERS[2], [{ product: p("prod-2"), quantity: 2 }], "confirmed"),
  buildOrder(3, 1, CUSTOMERS[3], [{ product: p("prod-5"), quantity: 1 }], "shipped"),
  buildOrder(4, 2, CUSTOMERS[4], [{ product: p("prod-4"), quantity: 1 }, { product: p("prod-7"), quantity: 2 }], "shipped"),
  buildOrder(5, 3, CUSTOMERS[5], [{ product: p("prod-8"), quantity: 3 }], "delivered"),
  buildOrder(6, 3, CUSTOMERS[6], [{ product: p("prod-1"), quantity: 1 }], "delivered"),
  buildOrder(7, 4, CUSTOMERS[7], [{ product: p("prod-10"), quantity: 1 }], "delivered"),
  buildOrder(8, 5, CUSTOMERS[8], [{ product: p("prod-11"), quantity: 1 }, { product: p("prod-12"), quantity: 1 }], "delivered"),
  buildOrder(9, 6, CUSTOMERS[9], [{ product: p("prod-14"), quantity: 1 }], "return_requested"),
  buildOrder(10, 7, CUSTOMERS[0], [{ product: p("prod-6"), quantity: 1 }], "delivered"),
  buildOrder(11, 8, CUSTOMERS[1], [{ product: p("prod-3"), quantity: 1 }], "cancelled"),
  buildOrder(12, 9, CUSTOMERS[2], [{ product: p("prod-2"), quantity: 1 }], "delivered"),
  buildOrder(13, 10, CUSTOMERS[3], [{ product: p("prod-1"), quantity: 2 }], "delivered"),
  buildOrder(14, 11, CUSTOMERS[4], [{ product: p("prod-5"), quantity: 1 }], "delivered"),
  buildOrder(15, 12, CUSTOMERS[5], [{ product: p("prod-8"), quantity: 1 }], "delivered"),
  buildOrder(16, 13, CUSTOMERS[6], [{ product: p("prod-4"), quantity: 1 }], "delivered"),
];

export const RETURNS: ReturnRequest[] = [
  {
    id: "ret-1",
    orderId: "order-6",
    orderNumber: ORDERS[5].orderNumber,
    customerId: "cust-6",
    customerName: "Vishal A.",
    productName: "Rubber Bone Chew Toy",
    type: "replacement",
    reason: "Item arrived with a small tear.",
    status: "requested",
    evidenceImageLabel: "Photo of a torn rubber chew toy",
    requestedAt: daysAgo(1),
    notes: [],
  },
  {
    id: "ret-2",
    orderId: "order-7",
    orderNumber: ORDERS[6].orderNumber,
    customerId: "cust-7",
    customerName: "Divya S.",
    productName: "Mist-Powered Pet Grooming Brush",
    type: "return",
    reason: "Doesn't fit my grip comfortably.",
    status: "approved",
    requestedAt: daysAgo(2),
    notes: [{ id: "n1", author: "Admin", message: "Approved — pickup arranged manually.", createdAt: daysAgo(1) }],
  },
  {
    id: "ret-3",
    orderId: "order-8",
    orderNumber: ORDERS[7].orderNumber,
    customerId: "cust-8",
    customerName: "Arjun N.",
    productName: "Cat Scratching Post — Tall",
    type: "return",
    reason: "Changed my mind, cat prefers her old post.",
    status: "rejected",
    requestedAt: daysAgo(4),
    notes: [{ id: "n1", author: "Admin", message: "Outside the 7-day return window.", createdAt: daysAgo(3) }],
    resolutionNote: "Rejected — outside return window.",
  },
  {
    id: "ret-4",
    orderId: "order-9",
    orderNumber: ORDERS[8].orderNumber,
    customerId: "cust-9",
    customerName: "Sneha P.",
    productName: "Puppy Training Pads (Pack of 30)",
    type: "replacement",
    reason: "Wrong pack size delivered.",
    status: "resolved",
    requestedAt: daysAgo(6),
    notes: [
      { id: "n1", author: "Admin", message: "Confirmed wrong SKU shipped.", createdAt: daysAgo(5) },
      { id: "n2", author: "Admin", message: "Replacement sent via courier.", createdAt: daysAgo(4) },
    ],
    resolutionNote: "Replacement shipped, resolved.",
  },
  {
    id: "ret-5",
    orderId: "order-12",
    orderNumber: ORDERS[11].orderNumber,
    customerId: "cust-2",
    customerName: "Rahul K.",
    productName: "Ultimate Dual Dog Leash",
    type: "return",
    reason: "Order was cancelled before dispatch.",
    status: "resolved",
    requestedAt: daysAgo(8),
    notes: [],
    resolutionNote: "Refund processed manually alongside cancellation.",
  },
  {
    id: "ret-6",
    orderId: "order-2",
    orderNumber: ORDERS[1].orderNumber,
    customerId: "cust-2",
    customerName: "Rahul K.",
    productName: "Everyday Walking Harness",
    type: "replacement",
    reason: "Buckle feels loose on the medium size.",
    status: "requested",
    requestedAt: daysAgo(0),
    notes: [],
  },
  {
    id: "ret-7",
    orderId: "order-10",
    orderNumber: ORDERS[9].orderNumber,
    customerId: "cust-10",
    customerName: "Rohit V.",
    productName: "Warm Fleece Pet Blanket",
    type: "return",
    reason: "Blanket shed more than expected after the first wash.",
    status: "requested",
    requestedAt: daysAgo(5),
    notes: [],
  },
];

export const STORE_SETTINGS: StoreSettings = {
  storeName: "My Pet Mart",
  supportEmail: "mypetmartstore@gmail.com",
  supportPhone: "+91 94440 25511",
  address: "12A, JR Enclave, MGR Nagar, Ayyapakkam, Chennai – 600077",
};
