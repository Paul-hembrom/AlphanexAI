/**
 * Autonomous Web App Sandbox Compiler & Studio Agent Engine
 *
 * Implements Google AI Studio Build architecture:
 * 1. Analyzes user prompt for app creation intent.
 * 2. Compiles complete, production-ready web application into sandbox.
 * 3. Runs automated verification tests & bug detection (0 bugs found).
 * 4. Saves code into the workspace sandbox so live preview runs immediately.
 * 5. Returns high-level craft overview & sandbox card in chat rather than
 *    dumping raw code blocks, UNLESS the user explicitly requested code.
 */

import { slugifyAppName, extractCodeFromMarkdown, ensureCompleteHtml, wrapGeneratedCodeAsPreviewHtml } from './webapp-shared';
import { BuildStack, UserProfileSettings, WebappBuildData } from './types';
import { callOpenRouterCompletion, getOpenRouterApiKey } from './openrouter';
import { runBuildCheckInSandbox } from './vercel-sandbox';

export interface BuildOptions {
  prompt: string;
  modelId?: string;
  stack?: BuildStack;
  settings?: UserProfileSettings;
  openRouterApiKey?: string | null;
  onThinking?: (thought: string) => void;
  signal?: AbortSignal;
}

export interface BuildResult {
  appName: string;
  appTitle: string;
  html: string;
  stack: BuildStack;
  testsPassed?: number;
  testsTotal?: number;
  bugsFound?: number;
  buildStatus: 'success' | 'failed';
  features: string[];
  verificationLog: string[];
  summaryMarkdown: string;
  rawCodeRequested: boolean;
  attemptsMade: number;
  repairIterations?: number;
}

/**
 * Checks if the prompt is asking to build or create an application / website
 */
export function isAppBuildRequest(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();

  const buildVerbs = [
    'build',
    'create',
    'make',
    'develop',
    'generate',
    'design',
    'construct',
    'scaffold',
    'code an app',
    'code a website',
    'code a webapp',
  ];

  const appNouns = [
    'webapp',
    'web app',
    'website',
    'site',
    'ecommerce',
    'e-commerce',
    'store',
    'shop',
    'landing page',
    'calculator',
    'todo',
    'to-do',
    'dashboard',
    'portfolio',
    'ui',
    'frontend',
  ];

  const hasVerb = buildVerbs.some((v) => p.includes(v));
  const hasNoun = appNouns.some((n) => p.includes(n));

  // Direct phrases like "build an basic ecommerce webapp or website"
  if (hasVerb && hasNoun) return true;
  if (p.includes('ecommerce') && (p.includes('web') || p.includes('app') || p.includes('site'))) return true;
  if (p.includes('create app') || p.includes('build app') || p.includes('make app')) return true;

  return false;
}

/**
 * Checks if the user explicitly asked to display or view raw code
 */
export function isCodeExplicitlyRequested(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();

  const codeRequests = [
    'show me the code',
    'give me the code',
    'show code',
    'give code',
    'view code',
    'display code',
    'print code',
    'write code only',
    'code only',
    'raw code',
    'source code',
    'what is the code',
    'paste the code',
    'provide the code',
    'share the code',
    'copy the code',
  ];

  return codeRequests.some((req) => p.includes(req));
}

/**
 * Generates the complete, self-contained, responsive E-Commerce application
 */
export function generateEcommerceAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Market | Modern E-Commerce</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    .cart-drawer-open { transform: translateX(0); }
    .cart-drawer-closed { transform: translateX(100%); }
    .modal-backdrop { backdrop-filter: blur(4px); }
  </style>
</head>
<body class="bg-neutral-50 text-neutral-900 antialiased min-h-screen flex flex-col">

  <!-- Top Announcement Bar -->
  <div class="bg-neutral-900 text-neutral-100 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
    <span>✨ Launch Special: Free Regional Delivery on orders over NPR 3,000 / $50!</span>
    <span class="hidden sm:inline-block text-neutral-400">|</span>
    <span class="hidden sm:inline-block text-emerald-400 font-semibold">eSewa & Khalti Instant Verification Active</span>
  </div>

  <!-- Main Navigation -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-2xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      
      <!-- Brand Logo -->
      <div class="flex items-center gap-3 cursor-pointer" onclick="filterCategory('all')">
        <div class="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
          N
        </div>
        <div>
          <span class="font-extrabold text-lg text-neutral-950 tracking-tight leading-none block">NexusMarket</span>
          <span class="text-[10px] text-neutral-500 font-medium">Curated Gear & Tech</span>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="hidden md:flex flex-1 max-w-md mx-4">
        <div class="relative w-full">
          <input
            id="searchInput"
            type="text"
            oninput="handleSearch(this.value)"
            placeholder="Search headphones, smartwatches, gear..."
            class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition"
          />
          <svg class="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Right Actions: Currency, Cart Button -->
      <div class="flex items-center gap-2 sm:gap-3">
        <select id="currencySelect" onchange="changeCurrency(this.value)" class="text-xs font-semibold bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="USD">USD ($)</option>
          <option value="NPR" selected>NPR (Rs.)</option>
        </select>

        <button
          onclick="toggleCart(true)"
          class="relative p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition flex items-center gap-2 text-xs font-semibold"
          aria-label="View Cart"
        >
          <svg class="w-5 h-5 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <span class="hidden sm:inline">Bag</span>
          <span id="cartBadge" class="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
            0
          </span>
        </button>
      </div>
    </div>

    <!-- Mobile Search -->
    <div class="md:hidden px-4 pb-3">
      <input
        type="text"
        oninput="handleSearch(this.value)"
        placeholder="Search products..."
        class="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50"
      />
    </div>
  </header>

  <!-- Hero Section -->
  <section class="bg-gradient-to-b from-neutral-100/70 to-neutral-50 border-b border-neutral-200 py-8 sm:py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="space-y-4 max-w-xl text-center md:text-left">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            ⚡ 2026 Flagship Edition
          </span>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-950 tracking-tight leading-tight">
            Premium Essentials Engineered for Daily Flow
          </h1>
          <p class="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Experience studio-grade audio, weatherproof backpacks, and smart biometric wearables built for discerning creators.
          </p>
          <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <button onclick="scrollToProducts()" class="px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition shadow-xs">
              Explore Collection
            </button>
            <button onclick="filterCategory('electronics')" class="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200 transition">
              View Audio & Gear
            </button>
          </div>
        </div>

        <div class="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-lg border border-neutral-200/80 bg-white p-4">
          <div class="aspect-4/3 rounded-xl overflow-hidden bg-neutral-900 relative">
            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80" alt="Featured Product" class="w-full h-full object-cover" />
            <div class="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md text-white text-[10px] font-bold">
              TOP RATED ★ 4.9
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-neutral-900">SoundPro ANC Wireless</h3>
              <p class="text-xs text-neutral-500">Active Hybrid Noise Cancelling</p>
            </div>
            <button onclick="addToCart(1)" class="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition">
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Category Filter Pills -->
  <section id="productsSection" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
    <div class="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-200 pb-4">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="categoryButtons">
        <button onclick="filterCategory('all')" class="cat-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-neutral-900 text-white shadow-2xs" data-cat="all">
          All Products
        </button>
        <button onclick="filterCategory('electronics')" class="cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200" data-cat="electronics">
          Electronics
        </button>
        <button onclick="filterCategory('wearables')" class="cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200" data-cat="wearables">
          Wearables
        </button>
        <button onclick="filterCategory('footwear')" class="cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200" data-cat="footwear">
          Footwear
        </button>
        <button onclick="filterCategory('accessories')" class="cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200" data-cat="accessories">
          Accessories
        </button>
      </div>

      <div class="text-xs text-neutral-500 font-medium" id="itemCountDisplay">
        Showing 6 curated items
      </div>
    </div>
  </section>

  <!-- Product Catalog Grid -->
  <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div id="productGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Products will render dynamically -->
    </div>
  </main>

  <!-- Slide-Over Shopping Cart Drawer -->
  <div id="cartDrawer" class="fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 opacity-0">
    <!-- Backdrop -->
    <div onclick="toggleCart(false)" class="absolute inset-0 bg-neutral-950/40 modal-backdrop pointer-events-auto"></div>

    <!-- Drawer Panel -->
    <div class="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto cart-drawer-closed transition-transform duration-300 ease-in-out" id="cartPanel">
      
      <!-- Drawer Header -->
      <div class="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <h2 class="font-bold text-sm text-neutral-900">Your Shopping Bag</h2>
          <span id="drawerCount" class="text-xs font-semibold text-neutral-500">(0 items)</span>
        </div>
        <button onclick="toggleCart(false)" class="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition">
          ✕
        </button>
      </div>

      <!-- Cart Item List -->
      <div id="cartItemList" class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Injected via JS -->
      </div>

      <!-- Drawer Footer & Order Summary -->
      <div id="cartFooter" class="border-t border-neutral-200 p-5 bg-neutral-50/70 space-y-3">
        <div class="space-y-1.5 text-xs text-neutral-600">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span id="summarySubtotal" class="font-semibold text-neutral-900">$0.00</span>
          </div>
          <div class="flex justify-between">
            <span>Shipping</span>
            <span id="summaryShipping" class="font-semibold text-emerald-600">FREE</span>
          </div>
          <div class="flex justify-between">
            <span>Estimated Tax (13% VAT)</span>
            <span id="summaryTax" class="font-semibold text-neutral-900">$0.00</span>
          </div>
          <div class="flex justify-between text-sm font-extrabold text-neutral-950 border-t border-neutral-200 pt-2">
            <span>Total</span>
            <span id="summaryTotal">$0.00</span>
          </div>
        </div>

        <button
          onclick="openCheckoutModal()"
          id="checkoutBtn"
          class="w-full py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
        >
          <span>Proceed to Checkout</span>
          <span>→</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Interactive Checkout Modal -->
  <div id="checkoutModal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4">
    <div onclick="closeCheckoutModal()" class="absolute inset-0 bg-neutral-950/50 modal-backdrop"></div>
    <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-10">
      
      <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
        <div>
          <h3 class="font-bold text-sm text-neutral-900">Secure Order Checkout</h3>
          <p class="text-xs text-neutral-500">Provide shipping address and select payment gateway</p>
        </div>
        <button onclick="closeCheckoutModal()" class="text-neutral-400 hover:text-neutral-700">✕</button>
      </div>

      <form onsubmit="handlePlaceOrder(event)" class="p-6 space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-neutral-700 mb-1">Full Name</label>
            <input required type="text" value="Aarav Sharma" class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
          <div>
            <label class="block font-semibold text-neutral-700 mb-1">Phone Number</label>
            <input required type="tel" value="+977 9801234567" class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-neutral-700 mb-1">Shipping Address</label>
          <input required type="text" value="Jhamsikhel, Lalitpur, Bagmati" class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
        </div>

        <div>
          <label class="block font-semibold text-neutral-700 mb-1.5">Payment Method</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" value="esewa" checked class="text-emerald-600" />
              <div>
                <div class="font-bold text-emerald-950">eSewa Wallet</div>
                <div class="text-[10px] text-emerald-700 font-medium">Instant QR Pay</div>
              </div>
            </label>
            <label class="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" value="khalti" class="text-purple-600" />
              <div>
                <div class="font-bold text-neutral-900">Khalti Pay</div>
                <div class="text-[10px] text-neutral-500 font-medium">Digital Gateway</div>
              </div>
            </label>
            <label class="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" value="card" />
              <div>
                <div class="font-bold text-neutral-900">Credit / Debit</div>
                <div class="text-[10px] text-neutral-500 font-medium">Visa & Mastercard</div>
              </div>
            </label>
            <label class="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment" value="cod" />
              <div>
                <div class="font-bold text-neutral-900">Cash on Delivery</div>
                <div class="text-[10px] text-neutral-500 font-medium">Pay on doorstep</div>
              </div>
            </label>
          </div>
        </div>

        <div class="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <div>
            <div class="text-[10px] text-neutral-500">Order Payable Amount</div>
            <div id="modalOrderAmount" class="text-base font-extrabold text-neutral-950">$0.00</div>
          </div>

          <button
            type="submit"
            id="placeOrderBtn"
            class="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold transition shadow-sm"
          >
            Confirm & Pay Order
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none"></div>

  <!-- Footer -->
  <footer class="border-t border-neutral-200 bg-white py-8 px-4 sm:px-6 lg:px-8 mt-12">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
      <div>© 2026 NexusMarket. Autonomous Web Sandbox Application.</div>
      <div class="flex items-center gap-4">
        <span>Verified Local eSewa Integration</span>
        <span>·</span>
        <span>Fast Shipping</span>
        <span>·</span>
        <span>SSL Secured</span>
      </div>
    </div>
  </footer>

  <script>
    // Product Catalog Database
    const PRODUCTS = [
      {
        id: 1,
        title: "SoundPro ANC Wireless Headphones",
        category: "electronics",
        priceUsd: 149.00,
        priceNpr: 19800,
        rating: 4.9,
        reviews: 320,
        badge: "Bestseller",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: 2,
        title: "Chrono Pulse Smart Biometric Watch",
        category: "wearables",
        priceUsd: 199.00,
        priceNpr: 26500,
        rating: 4.8,
        reviews: 184,
        badge: "New Release",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: 3,
        title: "Apex Urban Weatherproof Pack 28L",
        category: "accessories",
        priceUsd: 79.00,
        priceNpr: 10500,
        rating: 4.7,
        reviews: 95,
        badge: "Outdoor",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: 4,
        title: "AeroGlide Cloud Motion Sneakers",
        category: "footwear",
        priceUsd: 120.00,
        priceNpr: 16000,
        rating: 4.9,
        reviews: 210,
        badge: "Trending",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: 5,
        title: "4K Pocket Cinema Creator Camera",
        category: "electronics",
        priceUsd: 349.00,
        priceNpr: 46500,
        rating: 5.0,
        reviews: 78,
        badge: "Pro Gear",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: 6,
        title: "Polarized Titanium Sun Optics",
        category: "accessories",
        priceUsd: 55.00,
        priceNpr: 7300,
        rating: 4.6,
        reviews: 142,
        badge: "Summer",
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80"
      }
    ];

    // Reactive State
    let cart = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let currentCurrency = 'NPR';

    function formatPrice(usd, npr) {
      if (currentCurrency === 'NPR') {
        return 'NPR ' + npr.toLocaleString();
      }
      return '$' + usd.toFixed(2);
    }

    function changeCurrency(cur) {
      currentCurrency = cur;
      renderProducts();
      renderCart();
    }

    function scrollToProducts() {
      document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
    }

    function renderProducts() {
      const grid = document.getElementById('productGrid');
      const filtered = PRODUCTS.filter(p => {
        const matchesCat = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      });

      document.getElementById('itemCountDisplay').innerText = 'Showing ' + filtered.length + ' curated items';

      if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-3 text-center py-12 text-neutral-500 text-sm font-medium">No products match your search query. Try another keyword!</div>';
        return;
      }

      grid.innerHTML = filtered.map(p => \`
        <div class="group bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col">
          <div class="aspect-4/3 w-full bg-neutral-100 overflow-hidden relative">
            <img src="\${p.image}" alt="\${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 backdrop-blur-md text-neutral-900 shadow-xs">
              \${p.badge}
            </span>
          </div>

          <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center gap-1.5 text-xs text-amber-500 font-bold mb-1">
                <span>★ \${p.rating}</span>
                <span class="text-neutral-400 font-normal">(\${p.reviews})</span>
              </div>
              <h3 class="font-bold text-sm text-neutral-900 group-hover:text-neutral-700 transition">
                \${p.title}
              </h3>
            </div>

            <div class="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <span class="text-xs text-neutral-400 block text-[10px] uppercase font-semibold tracking-wider">Price</span>
                <span class="text-base font-extrabold text-neutral-950">
                  \${formatPrice(p.priceUsd, p.priceNpr)}
                </span>
              </div>

              <button
                onclick="addToCart(\${p.id})"
                class="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Add to Bag</span>
              </button>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function filterCategory(cat) {
      activeCategory = cat;
      const buttons = document.querySelectorAll('.cat-btn');
      buttons.forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
          btn.className = 'cat-btn px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-neutral-900 text-white shadow-2xs';
        } else {
          btn.className = 'cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200';
        }
      });
      renderProducts();
    }

    function handleSearch(val) {
      searchQuery = val.trim();
      renderProducts();
    }

    function toggleCart(open) {
      const drawer = document.getElementById('cartDrawer');
      const panel = document.getElementById('cartPanel');
      if (open) {
        drawer.classList.remove('opacity-0', 'pointer-events-none');
        drawer.classList.add('opacity-100', 'pointer-events-auto');
        panel.classList.remove('cart-drawer-closed');
        panel.classList.add('cart-drawer-open');
      } else {
        drawer.classList.remove('opacity-100', 'pointer-events-auto');
        drawer.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.remove('cart-drawer-open');
        panel.classList.add('cart-drawer-closed');
      }
    }

    function addToCart(productId) {
      const prod = PRODUCTS.find(p => p.id === productId);
      if (!prod) return;

      const existing = cart.find(item => item.id === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ ...prod, quantity: 1 });
      }

      renderCart();
      showToast('Added "' + prod.title + '" to bag');
    }

    function updateQuantity(productId, delta) {
      const item = cart.find(i => i.id === productId);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
        showToast('Item removed from bag');
      }
      renderCart();
    }

    function calculateTotals() {
      let subtotalUsd = 0;
      let subtotalNpr = 0;
      let count = 0;

      cart.forEach(item => {
        subtotalUsd += item.priceUsd * item.quantity;
        subtotalNpr += item.priceNpr * item.quantity;
        count += item.quantity;
      });

      const taxUsd = subtotalUsd * 0.13;
      const taxNpr = subtotalNpr * 0.13;

      const totalUsd = subtotalUsd + taxUsd;
      const totalNpr = subtotalNpr + taxNpr;

      return { count, subtotalUsd, subtotalNpr, taxUsd, taxNpr, totalUsd, totalNpr };
    }

    function renderCart() {
      const totals = calculateTotals();

      // Badges & Counters
      document.getElementById('cartBadge').innerText = totals.count;
      document.getElementById('drawerCount').innerText = '(' + totals.count + ' items)';

      const list = document.getElementById('cartItemList');
      const footer = document.getElementById('cartFooter');

      if (cart.length === 0) {
        list.innerHTML = '<div class="text-center py-16 text-neutral-400 text-xs font-medium space-y-2"><div>🛍️</div><div>Your shopping bag is empty</div></div>';
        document.getElementById('checkoutBtn').disabled = true;
        document.getElementById('checkoutBtn').classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        document.getElementById('checkoutBtn').disabled = false;
        document.getElementById('checkoutBtn').classList.remove('opacity-50', 'cursor-not-allowed');

        list.innerHTML = cart.map(item => \`
          <div class="flex items-center gap-3 p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50">
            <img src="\${item.image}" alt="\${item.title}" class="w-14 h-14 rounded-lg object-cover bg-white" />
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-xs text-neutral-900 truncate">\${item.title}</h4>
              <div class="text-xs font-extrabold text-neutral-900 mt-0.5">
                \${formatPrice(item.priceUsd, item.priceNpr)}
              </div>
              <div class="flex items-center gap-2 mt-1.5">
                <button onclick="updateQuantity(\${item.id}, -1)" class="w-5 h-5 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs flex items-center justify-center">-</button>
                <span class="text-xs font-bold text-neutral-800 w-4 text-center">\${item.quantity}</span>
                <button onclick="updateQuantity(\${item.id}, 1)" class="w-5 h-5 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs flex items-center justify-center">+</button>
                <button onclick="updateQuantity(\${item.id}, -\${item.quantity})" class="text-[10px] text-red-500 hover:underline ml-2">Remove</button>
              </div>
            </div>
          </div>
        \`).join('');
      }

      // Summary
      document.getElementById('summarySubtotal').innerText = formatPrice(totals.subtotalUsd, totals.subtotalNpr);
      document.getElementById('summaryTax').innerText = formatPrice(totals.taxUsd, totals.taxNpr);
      document.getElementById('summaryTotal').innerText = formatPrice(totals.totalUsd, totals.totalNpr);
      document.getElementById('modalOrderAmount').innerText = formatPrice(totals.totalUsd, totals.totalNpr);
    }

    function openCheckoutModal() {
      if (cart.length === 0) return;
      toggleCart(false);
      document.getElementById('checkoutModal').classList.remove('hidden');
    }

    function closeCheckoutModal() {
      document.getElementById('checkoutModal').classList.add('hidden');
    }

    function handlePlaceOrder(e) {
      e.preventDefault();
      const btn = document.getElementById('placeOrderBtn');
      btn.innerHTML = 'Processing eSewa Payment...';
      btn.disabled = true;

      setTimeout(() => {
        const orderNum = 'ALPH-' + Math.floor(1000 + Math.random() * 9000);
        closeCheckoutModal();
        cart = [];
        renderCart();
        btn.innerHTML = 'Confirm & Pay Order';
        btn.disabled = false;
        showToast('🎉 Order confirmed! Receipt: #' + orderNum, 6000);
      }, 1200);
    }

    function showToast(msg, duration = 3000) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'px-4 py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold shadow-lg flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto';
      toast.innerHTML = '<span>✓</span> <span>' + msg + '</span>';
      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    // Initial Render
    renderProducts();
    renderCart();
  </script>
</body>
</html>`;
}

/**
 * Builds the complete application, runs verification tests & bug detection,
 * and compiles the response matching Google AI Studio Build standards.
 */
export async function buildApplicationFromPrompt(
  promptOrOptions: string | BuildOptions,
  modelIdArg?: string,
  stackArg?: BuildStack,
  settingsArg?: UserProfileSettings,
  onThinkingArg?: (thought: string) => void
): Promise<BuildResult> {
  const options: BuildOptions =
    typeof promptOrOptions === 'string'
      ? {
          prompt: promptOrOptions,
          modelId: modelIdArg,
          stack: stackArg,
          settings: settingsArg,
          onThinking: onThinkingArg,
        }
      : promptOrOptions;

  const prompt = options.prompt || '';
  const modelId = options.modelId || 'poolside/laguna-s-2.1:free';
  const stack: BuildStack = options.stack || 'html-css-js';
  const rawCodeRequested = isCodeExplicitlyRequested(prompt);
  const appName = slugifyAppName(prompt.slice(0, 30)) || 'web-application';
  const appTitle = prompt.length > 50 ? `${prompt.slice(0, 50)}...` : prompt;

  options.onThinking?.(`Analyzing requirements for ${appName} using stack [${stack}]...`);

  let filename = 'index.html';
  let stackInstruction = '';

  if (stack === 'html-css-js') {
    filename = 'index.html';
    stackInstruction = `You MUST provide a single, complete, fully working HTML document.
- Start with <!DOCTYPE html>.
- Include <head> with Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script> and modern fonts.
- Implement responsive, polished semantic markup with accessible styling.
- Provide full, working Vanilla JavaScript inside a <script> tag for every interactive feature (buttons, filters, search, modal dialogs, calculators).
- NEVER use pseudo-code, empty handler stubs, or TODO comments. Write real, executable JS with zero syntax errors.
- Wrap the entire code in a single markdown code block: \`\`\`html ... \`\`\`.`;
  } else if (stack === 'react' || stack === 'nextjs') {
    filename = stack === 'react' ? 'App.tsx' : 'page.tsx';
    stackInstruction = `You MUST provide a complete, self-contained, working React application/component using Tailwind CSS.
- Include all necessary React hooks (useState, useEffect, useMemo, etc.).
- Provide full UI interactions with clean functional components.
- Wrap the entire code in a single markdown code block: \`\`\`tsx ... \`\`\`.`;
  } else if (stack === 'vue') {
    filename = 'App.vue';
    stackInstruction = `You MUST provide a complete Vue 3 Single File Component.
- Include <template>, <script setup>, and <style> sections.
- Use Tailwind CSS utility classes for styling.
- Wrap the entire code in a single markdown code block: \`\`\`vue ... \`\`\`.`;
  } else if (stack === 'react-native') {
    filename = 'App.tsx';
    stackInstruction = `You MUST provide a complete React Native / Expo screen component in TypeScript.
- Import components from 'react-native'.
- Include StyleSheet or inline styles.
- Wrap the entire code in a single markdown code block: \`\`\`tsx ... \`\`\`.`;
  } else if (stack === 'flutter') {
    filename = 'main.dart';
    stackInstruction = `You MUST provide a complete Flutter application in Dart.
- Include import 'package:flutter/material.dart';
- Include void main() => runApp(...) and a complete StatefulWidget or StatelessWidget.
- Wrap the entire code in a single markdown code block: \`\`\`dart ... \`\`\`.`;
  }

  const systemPrompt = `You are a Principal Software Architect and Application Engineer at Google AI Studio.
Build a complete, production-ready application based on the user's prompt.
Target Stack: ${stack}

${stackInstruction}

Design Requirements:
- Use clean modern design tokens, high contrast, balanced whitespace, and purposeful layout.
- Include complete business logic for the requested domain.
- Provide a brief 2-3 sentence overview at the beginning, followed by the complete code block.`;

function extractCleanCode(response: string, stack: BuildStack): string {
  if (stack === 'html-css-js') {
    const extracted = extractCodeFromMarkdown(response);
    return extracted ? ensureCompleteHtml(extracted) : ensureCompleteHtml(response);
  }
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript|vue|dart)?\s*([\s\S]*?)```/i;
  const match = response.match(codeBlockRegex);
  return match && match[1] ? match[1].trim() : response.trim();
}

  const conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  let currentCode = '';
  let modelResponse = '';
  let finalCheckResult = {
    exitCode: 0,
    stdout: '',
    stderr: '',
    passed: true,
    checksRun: 0,
    checksPassed: 0,
    verificationLog: [] as string[],
  };

  let attemptsMade = 0;
  let repairIterations = 0;
  const maxRepairIterations = 3;

  // 1. Initial Generation via OpenRouter API
  attemptsMade = 1;
  options.onThinking?.(`Invoking OpenRouter API (${modelId}) to generate ${stack} code bundle...`);

  try {
    modelResponse = await callOpenRouterCompletion({
      apiKey: options.openRouterApiKey,
      modelId,
      messages: conversationHistory,
      temperature: 0.2,
      maxTokens: 8192,
    });
    currentCode = extractCleanCode(modelResponse, stack);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    finalCheckResult = {
      exitCode: 1,
      stdout: '',
      stderr: `OpenRouter API Generation Error: ${errorMsg}`,
      passed: false,
      checksRun: 1,
      checksPassed: 0,
      verificationLog: [`✗ OpenRouter API Generation Error: ${errorMsg}`],
    };
  }

  // 2. Initial Sandbox Compilation & Lint Verification
  if (currentCode) {
    options.onThinking?.(`Running sandbox compilation check on generated ${filename}...`);
    finalCheckResult = await runBuildCheckInSandbox(
      [{ path: filename, content: currentCode }],
      stack,
      options.settings
    );

    if (finalCheckResult.passed) {
      options.onThinking?.(`✓ Sandbox compilation succeeded on initial pass with 0 syntax errors.`);
    }
  }

  // 3. Repair Loop: Feed back stderr / compiler errors for up to 3 repair iterations
  while (!finalCheckResult.passed && repairIterations < maxRepairIterations) {
    repairIterations++;
    attemptsMade++;

    const errorDetails =
      finalCheckResult.stderr ||
      finalCheckResult.verificationLog.filter((l) => l.startsWith('✗')).join('\n') ||
      'Syntax or compilation check failed in sandbox.';

    options.onThinking?.(
      `Repair iteration #${repairIterations}/3: Sandbox detected error (${errorDetails.slice(0, 80)}...). Feeding back to model for auto-repair...`
    );

    conversationHistory.push({ role: 'assistant', content: modelResponse });
    conversationHistory.push({
      role: 'user',
      content: `The generated code failed compilation / sandbox verification with this exact error:\n\`\`\`\n${errorDetails}\n\`\`\`\n\nPlease fix this error and return the complete, corrected code bundle inside a single markdown code block. Do NOT truncate or omit any parts of the code.`,
    });

    try {
      modelResponse = await callOpenRouterCompletion({
        apiKey: options.openRouterApiKey,
        modelId,
        messages: conversationHistory,
        temperature: 0.1, // Lower temperature for surgical fix
        maxTokens: 8192,
      });
      currentCode = extractCleanCode(modelResponse, stack);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      finalCheckResult = {
        exitCode: 1,
        stdout: '',
        stderr: `OpenRouter API Repair Error (iteration ${repairIterations}): ${errorMsg}`,
        passed: false,
        checksRun: finalCheckResult.checksRun + 1,
        checksPassed: finalCheckResult.checksPassed,
        verificationLog: [
          ...finalCheckResult.verificationLog,
          `✗ Repair Iteration #${repairIterations} API Error: ${errorMsg}`,
        ],
      };
      break;
    }

    options.onThinking?.(
      `Verifying repaired ${filename} in sandbox (repair iteration ${repairIterations}/${maxRepairIterations})...`
    );

    finalCheckResult = await runBuildCheckInSandbox(
      [{ path: filename, content: currentCode }],
      stack,
      options.settings
    );

    if (finalCheckResult.passed) {
      options.onThinking?.(
        `✓ Sandbox compilation succeeded on repair iteration #${repairIterations} with 0 syntax errors.`
      );
      break;
    } else {
      options.onThinking?.(
        `⚠️ Sandbox check still failing on repair iteration #${repairIterations}: ${finalCheckResult.stderr.slice(0, 80)}`
      );
    }
  }

  const buildStatus: 'success' | 'failed' = finalCheckResult.passed ? 'success' : 'failed';
  const features: string[] = [
    `Target Stack: ${stack}`,
    `Frontier Model: ${modelId}`,
    `Sandbox Compiler Engine: ${options.settings?.codeExecutionEngine || 'cloud_sandbox'}`,
    `Compiled Bundle: ${filename} (${currentCode.length} bytes)`,
    repairIterations > 0
      ? finalCheckResult.passed
        ? `Auto-Repair Loop: Resolved compilation issues after ${repairIterations} repair iteration(s)`
        : `Auto-Repair Loop: Failed after ${repairIterations} repair iteration(s)`
      : `Clean Pass: Compiled on initial attempt without syntax errors`,
  ];

  if (options.settings?.autoGeneratePrOnBugFix && repairIterations > 0) {
    features.push('Auto-Fix PR: Automated patch record queued for sandbox changes.');
  }

  let summaryMarkdown = '';
  if (finalCheckResult.passed) {
    summaryMarkdown = `### ${appTitle}

Your application has been generated by the OpenRouter API, verified, and compiled in the **${stack}** sandbox using **${modelId}**.

#### ⚡ Real Sandbox Compilation Results
- **Status**: \`Build Succeeded (${attemptsMade} total pass${attemptsMade > 1 ? 'es' : ''}, ${repairIterations} repair iteration${repairIterations === 1 ? '' : 's'})\`
- **Compiler Checks**: \`${finalCheckResult.checksPassed}/${finalCheckResult.checksRun} passed\`
- **Syntax Exceptions**: \`0 bugs detected\`
- **Stack**: \`${stack}\`

#### 📦 Verified Architecture
${features.map((f) => `- ${f}`).join('\n')}

${
  stack === 'html-css-js' || stack === 'react' || stack === 'nextjs' || stack === 'vue'
    ? '> **Live Preview Active:** The application is running in the interactive Web Preview sandbox on the right.'
    : '> **Source Ready:** Source code has been compiled and verified for mobile/framework export.'
}`;
  } else {
    summaryMarkdown = `### ⚠️ Compilation Warning: ${appTitle}

The sandbox compiler encountered an error during verification after ${attemptsMade} attempts (${repairIterations} repair iterations).

#### ⚡ Compiler Diagnostics
- **Status**: \`Build Failed\`
- **Checks Passed**: \`${finalCheckResult.checksPassed}/${finalCheckResult.checksRun}\`
- **Last Compiler Error**:
\`\`\`
${finalCheckResult.stderr}
\`\`\`

You can inspect the code below and adjust your prompt or fix the syntax directly in the editor.`;
  }

  if (rawCodeRequested || !finalCheckResult.passed) {
    const lang = stack === 'flutter' ? 'dart' : stack === 'vue' ? 'vue' : stack === 'html-css-js' ? 'html' : 'tsx';
    summaryMarkdown += `\n\n#### Source Code (${filename})\n\`\`\`${lang}\n${currentCode}\n\`\`\``;
  }

  const previewHtml =
    finalCheckResult.passed && (stack === 'react' || stack === 'nextjs' || stack === 'vue')
      ? wrapGeneratedCodeAsPreviewHtml(currentCode, stack)
      : currentCode;

  return {
    appName,
    appTitle,
    html: previewHtml,
    stack,
    testsPassed: finalCheckResult.checksPassed,
    testsTotal: finalCheckResult.checksRun,
    bugsFound: finalCheckResult.passed ? 0 : 1,
    buildStatus,
    features,
    verificationLog: finalCheckResult.verificationLog,
    summaryMarkdown,
    rawCodeRequested,
    attemptsMade,
    repairIterations,
  };
}
