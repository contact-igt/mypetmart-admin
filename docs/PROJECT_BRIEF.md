# MyPetMart — Project Brief

Last updated: 2026-07-30
Source of truth: Final Proposal PDF in `project-reference/`

---

## Objective

Build a clean, functional e-commerce website for MyPetMart where customers can
browse products, place orders, make payments and view order history. The admin
manages product details, pricing and images, and views day-wise order and
product tracking reports.

Presented by: Invictus Global Tech
Budget: ₹35,000 total (₹21,000 advance + ₹14,000 on delivery)
Timeline: 35–45 working days

---

## Locked stack

| Concern | Technology |
|---------|-----------|
| Frontend | Next.js 16 App Router |
| Frontend language | TypeScript |
| Frontend styling | Tailwind CSS |
| Backend | Express.js 5.2 |
| Backend language | TypeScript |
| API style | REST |
| Runtime | Node.js 24 LTS |
| Database | MySQL 8.4 LTS |
| ORM | Prisma |
| Auth | JWT access tokens + HTTP-only refresh tokens + bcrypt |
| Image storage | Cloudflare R2 |
| Monorepo | pnpm workspaces |
| Package manager | pnpm 11.18.0 (Corepack) |

---

## Architecture

```
mypetmart/
├── apps/
│   ├── web/          ← Next.js 16 (App Router)
│   └── api/          ← Express 5.2 REST API
├── packages/
│   └── shared/       ← types, Zod schemas, constants
├── docs/
└── project-reference/
```

Modular monolith. No microservices.

---

## Approved customer scope

### Pages
- **Home** — brand landing page (locked to UI_HOME.pdf)
- **Shop** — product listing page (locked to UI_SHOP.pdf)
- **Product Detail** — individual product page
- **Cart** — view and update cart
- **Checkout** — enter details, payment, confirmation
- **Login / Register** — customer auth
- **Account** — single-page: account info, order history, return/replace requests
- **Contact** — contact form (locked to UI_CONTACT.pdf.pdf)
- **Policy pages** — if content is provided by client

### Product data per item
Name · Image · Description · Pricing · Category · Add-to-Cart

### Checkout flow
Add to Cart → View & Update Cart → Enter Details → Confirmation

### Payment
- Payment gateway setup, connection and confirmation flow
- Gateway account (KYC, settlement) is the client's responsibility

### Shipping
- Basic shipping partner integration — details linked to order flow
- Courier account, API approval and disputes are the client's responsibility

### Customer account (single page)
- Secure login
- View basic account info
- Order history (past and current)
- Submit replace/return request (manual admin review)

### Replace/Return flow
Customer selects order → submits reason → admin reviews and approves

### Admin
- Product add/edit (name, image, description, pricing, category)
- Basic overview dashboard: total products/orders, day-wise order and product
  tracking, customer/order activity, replace/return request visibility

### Reports
- Day-wise order tracking
- Day-wise product activity
- Basic order count and product performance

### Analytics & tracking (setup only)
- Meta Pixel
- Google Analytics
- Microsoft Clarity
- Credentials handed over to client

### SEO & AEO
- Page titles and meta descriptions
- Keyword placement
- Image alt text and SEO-friendly URLs
- XML sitemap setup and submission
- AEO setup for AI search visibility

### Deliverables
1. Responsive customer-facing website (mobile-friendly)
2. Cart, checkout and payment gateway + shipping partner connected
3. Customer account (login, order history, replace/return)
4. Admin tools (product management + basic dashboard + day-wise reports)
5. SEO & deployment support + handover guidance
6. 1-year bug-fix and technical support post-launch

---

## Exclusions (do not build without separate approval)

### Product features
- Advanced filters
- Wishlist
- Product comparison
- Subscriptions
- Inventory automation

### Order/return features
- Automated refund processing
- Return-pickup automation
- Advanced approval workflows
- Replacement-logistics automation

### Reporting/analytics
- Advanced analytics dashboard
- Profit reports
- Inventory forecasting
- Automated report exports

### Marketing
- Ongoing SEO service
- Blog content
- Backlinks
- Google Ads
- WhatsApp / SMS / email automation
- Paid plugins or unapproved paid third-party services

---

## Module plan

| Module | Scope | Status |
|--------|-------|--------|
| M0 | Security, repo setup, toolchain, documentation | In progress |
| M1 | MySQL schema + Prisma migrations | Pending |
| M2 | Auth API (register, login, refresh, logout) | Pending |
| M3 | Product API + Cloudflare R2 image upload | Pending |
| M4 | Customer pages (Home, Shop, Product Detail) | Pending |
| M5 | Cart & Checkout + payment gateway integration | Pending |
| M6 | Customer account (order history, return/replace) | Pending |
| M7 | Admin dashboard + product management | Pending |
| M8 | SEO tags, analytics setup, sitemap | Pending |
| M9 | Deployment, handover | Pending |

---

## Model guidance

Use Claude Sonnet 5 as the default for all coding tasks. Escalate to a more
capable model only after two failed attempts on the same problem or when the
task is security-critical. Use a lighter model only for trivial edits (copy
changes, single-line CSS, read-only audits).

---

## Client responsibilities

- Domain purchase and renewal
- Payment gateway account (KYC, settlement, disputes)
- Shipping partner account (API approval, delivery charges, disputes)
- Product content (names, images, descriptions, pricing, categories)
- Contact details and policy content
- Timely feedback and approvals

Hosting managed by Invictus Global Tech for year 1; renewal ₹2,000 + GST/year
from year 2 onward, payable by client.
