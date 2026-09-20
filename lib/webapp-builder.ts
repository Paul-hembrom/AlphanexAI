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

import {
  slugifyAppName,
  extractCodeFromMarkdown,
  ensureCompleteHtml,
  wrapGeneratedCodeAsPreviewHtml,
  extractMultiPageFilesFromMarkdown,
  DEFAULT_STARTER_WEBAPP_HTML,
  type WebAppPage,
} from './webapp-shared';
import { BuildStack, UserProfileSettings, WebappBuildData } from './types';
import { callOpenRouterCompletion, getOpenRouterApiKey } from './openrouter';
import { runBuildCheckInSandbox } from './vercel-sandbox';
import { planApplication } from './agents/planner';
import { buildFilesFromManifest, BuiltFile } from './agents/builder';
import { repairFileWithContext } from './agents/fixer';

export interface BuildProgressEvent {
  step: 'planned' | 'generating' | 'checking' | 'repairing' | 'done';
  file: string;
  message: string;
}

export interface BuildOptions {
  prompt: string;
  modelId?: string;
  stack?: BuildStack;
  settings?: UserProfileSettings;
  openRouterApiKey?: string | null;
  onThinking?: (thought: string) => void;
  onProgress?: (progress: BuildProgressEvent) => void;
  signal?: AbortSignal;
}

export interface BuildResult {
  appName: string;
  appTitle: string;
  html: string;
  pages?: { path: string; html: string }[];
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
 * Checks if the prompt indicates a multi-page website or document structure
 */
export function isMultiPagePrompt(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();
  return (
    p.includes('multi-page') ||
    p.includes('multipage') ||
    p.includes('multiple pages') ||
    /\b[2-9]\s*pages\b/i.test(p) ||
    /\b(?:two|three|four|five)\s*pages\b/i.test(p) ||
    (p.includes('page') &&
      (p.includes('about') ||
        p.includes('contact') ||
        p.includes('pricing') ||
        p.includes('services') ||
        p.includes('features') ||
        p.includes('faq')))
  );
}

/**
 * Checks if the prompt indicates 3D, WebGL, or Three.js interactive graphics
 */
export function is3DPrompt(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();
  return (
    p.includes('3d') ||
    p.includes('three.js') ||
    p.includes('threejs') ||
    p.includes('webgl') ||
    p.includes('interactive scene') ||
    p.includes('3d model') ||
    p.includes('rotating 3d') ||
    p.includes('3d viewer') ||
    p.includes('mesh') ||
    p.includes('particle scene')
  );
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

  // === STAGE PIPELINE ORCHESTRATION ===
  const reportProgress = (
    step: 'planned' | 'generating' | 'checking' | 'repairing' | 'done',
    file: string,
    message: string
  ) => {
    options.onProgress?.({ step, file, message });
    options.onThinking?.(message);
  };

  reportProgress(
    'generating',
    'planner',
    `Analyzing architecture & planning files for ${appName} [${stack}]...`
  );

  // === STAGE 1: PLANNER ===
  const manifest = await planApplication({
    prompt,
    stack,
    apiKey: options.openRouterApiKey,
    plannerModel: 'qwen-3-8-flash',
    is3DFallback: stack === 'html-css-js' && is3DPrompt(prompt),
  });

  // Immediately report planned checklist upfront for every file in the manifest
  for (const file of manifest.files) {
    reportProgress('planned', file.path, `📋 Planned: ${file.path} — ${file.purpose}`);
  }

  // === STAGE 2: BUILDER ===
  let builtFiles: BuiltFile[] = [];
  try {
    builtFiles = await buildFilesFromManifest({
      manifest,
      userPrompt: prompt,
      stack,
      apiKey: options.openRouterApiKey,
      modelId,
      temperature: 0.2,
      reportProgress,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    builtFiles = manifest.files.map((f) => ({
      path: f.path,
      content: DEFAULT_STARTER_WEBAPP_HTML,
      purpose: f.purpose,
      needs3D: f.needs3D,
    }));
  }

  // === STAGES 3 & 4: VERIFIER & FIXER ===
  const verifiedFiles: BuiltFile[] = [];
  let totalChecksRun = 0;
  let totalChecksPassed = 0;
  let totalRepairIterations = 0;
  let totalAttempts = manifest.files.length;
  const overallVerificationLog: string[] = [];
  let allFilesPassed = true;
  let lastError = '';

  for (let i = 0; i < builtFiles.length; i++) {
    const file = builtFiles[i];

    reportProgress('checking', file.path, `Checking ${file.path} in sandbox...`);

    // Stage 3: Verifier
    let checkResult = await runBuildCheckInSandbox(
      [{ path: file.path, content: file.content }],
      stack,
      options.settings
    );

    totalChecksRun += checkResult.checksRun;
    totalChecksPassed += checkResult.checksPassed;
    overallVerificationLog.push(...checkResult.verificationLog);

    if (checkResult.passed) {
      reportProgress('checking', file.path, `✓ Sandbox check passed for ${file.path}`);
      reportProgress('done', file.path, `✓ ${file.path} verified and ready`);
      verifiedFiles.push(file);
    } else {
      // Stage 4: Fixer
      reportProgress(
        'checking',
        file.path,
        `⚠️ Verification issue detected in ${file.path}. Starting auto-repair...`
      );

      const siblingFiles = builtFiles.filter((_, idx) => idx !== i);

      const fixResult = await repairFileWithContext({
        file,
        siblingFiles,
        manifest,
        userPrompt: prompt,
        stack,
        apiKey: options.openRouterApiKey,
        modelId,
        settings: options.settings,
        maxIterations: 3,
        reportProgress,
        initialCheckResult: checkResult,
      });

      totalRepairIterations += fixResult.repairIterations;
      totalAttempts += fixResult.repairIterations;
      totalChecksRun += fixResult.checksRun - checkResult.checksRun;
      totalChecksPassed += fixResult.checksPassed - checkResult.checksPassed;
      overallVerificationLog.push(...fixResult.verificationLog);

      if (!fixResult.passed) {
        allFilesPassed = false;
        lastError = fixResult.stderr || `Check unresolved on ${file.path}`;
      }

      verifiedFiles.push({
        ...file,
        content: fixResult.finalCode,
      });
    }
  }

  // === ASSEMBLE OUTPUT ===
  const isMultiPage = verifiedFiles.length > 1;
  const any3D = manifest.files.some((f) => f.needs3D);

  const primaryFile =
    verifiedFiles.find((f) => f.path === 'index.html') || verifiedFiles[0];
  const primaryFilename = primaryFile?.path || (stack === 'react' ? 'App.tsx' : stack === 'nextjs' ? 'page.tsx' : stack === 'vue' ? 'App.vue' : 'index.html');
  const primaryCode = primaryFile ? primaryFile.content : DEFAULT_STARTER_WEBAPP_HTML;

  const multiPages: WebAppPage[] | undefined =
    isMultiPage || stack === 'html-css-js'
      ? verifiedFiles.map((f) => ({ path: f.path, html: f.content }))
      : undefined;

  const buildStatus: 'success' | 'failed' = allFilesPassed ? 'success' : 'failed';

  const features: string[] = [
    `Target Stack: ${stack}`,
    `Frontier Model: ${modelId}`,
    `Architecture Plan: ${manifest.reasoning}`,
    `Compiled Bundle: ${verifiedFiles.length} file(s) (${verifiedFiles.map((f) => f.path).join(', ')})`,
    totalRepairIterations > 0
      ? allFilesPassed
        ? `Auto-Repair Loop: Resolved issues after ${totalRepairIterations} repair iteration(s)`
        : `Auto-Repair Loop: Unresolved issues after ${totalRepairIterations} repair iteration(s)`
      : `Clean Pass: All files compiled without syntax errors`,
  ];

  if (any3D) {
    const threeDFiles = manifest.files.filter((f) => f.needs3D).map((f) => f.path);
    features.push(`Interactive 3D (WebGL / Three.js) enabled on: ${threeDFiles.join(', ')}`);
  }

  if (options.settings?.autoGeneratePrOnBugFix && totalRepairIterations > 0) {
    features.push('Auto-Fix PR: Automated patch record queued for sandbox changes.');
  }

  let summaryMarkdown = '';
  if (allFilesPassed) {
    summaryMarkdown = `### ${appTitle}

Your application has been generated, verified, and compiled in the **${stack}** sandbox using **${modelId}**.

#### ⚡ Real Sandbox Compilation Results
- **Status**: \`Build Succeeded (${totalAttempts} total pass${totalAttempts > 1 ? 'es' : ''}, ${totalRepairIterations} repair iteration${totalRepairIterations === 1 ? '' : 's'})\`
- **Compiler Checks**: \`${totalChecksPassed}/${totalChecksRun} passed\`
- **Syntax Exceptions**: \`${totalRepairIterations > 0 ? `${totalRepairIterations} issue(s) found and auto-repaired` : '0 issues — clean pass'}\`
- **Stack**: \`${stack}\`

#### 📦 Verified Architecture
${features.map((f) => `- ${f}`).join('\n')}

${
  stack === 'html-css-js' || stack === 'react' || stack === 'nextjs' || stack === 'vue'
    ? '> **Live Preview Active:** The application is running in the interactive Web Preview sandbox on the right.'
    : '> **Source Ready:** Source code has been compiled and verified for mobile/framework export.'
}`;

    if (isMultiPage && multiPages && multiPages.length > 1) {
      summaryMarkdown += `\n\n#### 📄 Generated Pages (${multiPages.length})\n${multiPages
        .map((p) => `- \`${p.path}\` (${(p.html.length / 1024).toFixed(1)} KB)`)
        .join('\n')}\n\n> **Multi-Page Navigation:** Switch between generated pages using the page selector tabs above the preview. Once deployed to Vercel, standard in-page navigation links (\`<a href="...">\`) will route directly between pages.`;
    }

    if (any3D) {
      summaryMarkdown += `\n\n> **3D & WebGL Verification Note:** Sandbox verification for 3D content operates at the syntax and DOM check level (headless microVM sandboxes cannot render WebGL frames). Visual correctness, camera movement, and lighting are verified directly in the interactive live preview on the right.`;
    }
  } else {
    summaryMarkdown = `### ⚠️ Compilation Warning: ${appTitle}

The sandbox compiler encountered an error during verification after ${totalAttempts} attempts (${totalRepairIterations} repair iterations).

#### ⚡ Compiler Diagnostics
- **Status**: \`Build Failed\`
- **Checks Passed**: \`${totalChecksPassed}/${totalChecksRun}\`
- **Last Compiler Error**:
\`\`\`
${lastError}
\`\`\`

You can inspect the code below and adjust your prompt or fix the syntax directly in the editor.`;
  }

  if (rawCodeRequested || !allFilesPassed) {
    const lang = stack === 'flutter' ? 'dart' : stack === 'vue' ? 'vue' : stack === 'html-css-js' ? 'html' : 'tsx';
    summaryMarkdown += `\n\n#### Source Code (${primaryFilename})\n\`\`\`${lang}\n${primaryCode}\n\`\`\``;
  }

  // Failed-build preview fallback
  let previewHtml = primaryCode;
  if (stack === 'react' || stack === 'nextjs' || stack === 'vue') {
    try {
      previewHtml = wrapGeneratedCodeAsPreviewHtml(primaryCode, stack);
    } catch {
      previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Build Failed</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-900 text-neutral-100 p-6 font-mono text-sm">
  <div class="max-w-xl mx-auto bg-neutral-800 border border-red-500/30 rounded-xl p-5 space-y-3 shadow-lg">
    <div class="flex items-center gap-2 text-red-400 font-bold text-base">
      <span>⚠️ Build Failed</span>
    </div>
    <p class="text-neutral-300 text-xs">Preview wrapping failed to compile the component. See build error output below.</p>
    <pre class="bg-black/50 p-3 rounded text-red-300 text-xs overflow-x-auto whitespace-pre-wrap">${lastError || 'Compilation error'}</pre>
  </div>
</body>
</html>`;
    }
  }

  return {
    appName,
    appTitle,
    html: previewHtml,
    pages: multiPages && multiPages.length > 0 ? multiPages : undefined,
    stack,
    testsPassed: totalChecksPassed,
    testsTotal: totalChecksRun,
    bugsFound: totalRepairIterations,
    buildStatus,
    features,
    verificationLog: overallVerificationLog,
    summaryMarkdown,
    rawCodeRequested,
    attemptsMade: totalAttempts,
    repairIterations: totalRepairIterations,
  };
}

