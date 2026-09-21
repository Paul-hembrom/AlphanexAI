'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/use-auth';
import SignInModal from '@/components/auth/SignInModal';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Code2,
  Globe,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Sliders,
  Check,
  ChevronRight,
  Menu,
  X,
  Zap,
  BookOpen,
  FileCode2,
  GitBranch,
  Search,
  ExternalLink,
  Table,
  Lock,
} from 'lucide-react';
import { AVAILABLE_MODELS } from '@/lib/constants';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'developer' | 'researcher' | 'studio'>('developer');
  const [modelTierFilter, setModelTierFilter] = useState<'all' | 'free' | 'lite' | 'plus' | 'pro_max'>('all');
  const [showHomeSpecsModal, setShowHomeSpecsModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const handleTryAlphanex = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (user) {
      router.push('/workspace');
    } else {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleLogIn = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (user) {
      router.push('/workspace');
    } else {
      setAuthModalMode('signin');
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1F1E1D] selection:bg-amber-200 selection:text-black antialiased font-sans">
      {/* OpenAI-style Minimalist Navigation Bar */}
      <nav
        id="alphanex-navbar"
        className="sticky top-0 z-50 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#E5E2DC] transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              aria-label="AlphanexAI Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1F1E1D] text-[#FBF9F5] flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform relative">
                <span className="font-mono text-amber-400 font-black tracking-tighter text-sm">AN</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#1F1E1D] font-serif">
                  AlphanexAI
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#736E67] border border-[#E5E2DC]">
                  Frontier
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (OpenAI style) */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#736E67]">
              <a href="#research" className="hover:text-[#1F1E1D] transition-colors">
                Research
              </a>
              <a href="#capabilities" className="hover:text-[#1F1E1D] transition-colors">
                Capabilities
              </a>
              <a href="#models" className="hover:text-[#1F1E1D] transition-colors">
                Models
              </a>
              <a href="#safety" className="hover:text-[#1F1E1D] transition-colors">
                Safety
              </a>
              <a href="#pricing" className="hover:text-[#1F1E1D] transition-colors">
                Pricing
              </a>
            </div>
          </div>

          {/* Right: Section with Login & Try AlphanexAI CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/workspace"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F1E1D] px-3 py-1.5 rounded-full bg-[#EFECE6] hover:bg-[#E5E2DC] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Workspace</span>
              </Link>
            ) : (
              <button
                id="login-nav-btn"
                type="button"
                onClick={handleLogIn}
                className="hidden sm:inline-flex text-sm font-medium text-[#736E67] hover:text-[#1F1E1D] px-3 py-1.5 rounded-full hover:bg-[#EFECE6]/70 transition-colors cursor-pointer"
              >
                Log in
              </button>
            )}

            {/* Crucial CTA requested: "Try AlphanexAI" */}
            <button
              id="try-alphanex-nav-btn"
              type="button"
              onClick={handleTryAlphanex}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-xs sm:text-sm font-medium transition-all shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Try AlphanexAI</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E5E2DC] bg-[#FAF8F4] px-4 pt-2 pb-6 space-y-3">
            <a
              href="#research"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#4D4943] hover:text-black"
            >
              Research
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#4D4943] hover:text-black"
            >
              Capabilities
            </a>
            <a
              href="#models"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#4D4943] hover:text-black"
            >
              Models
            </a>
            <a
              href="#safety"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#4D4943] hover:text-black"
            >
              Safety
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#4D4943] hover:text-black"
            >
              Pricing
            </a>
            <div className="pt-2 flex flex-col gap-2">
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogIn();
                  }}
                  className="w-full text-center py-2.5 rounded-full border border-[#DDD8CE] bg-white text-[#1F1E1D] text-sm font-medium cursor-pointer"
                >
                  Log in
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleTryAlphanex();
                }}
                className="w-full text-center py-2.5 rounded-full bg-[#1F1E1D] text-[#FBF9F5] text-sm font-medium shadow-xs cursor-pointer"
              >
                Try AlphanexAI &rarr;
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section (OpenAI high-contrast editorial design) */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden border-b border-[#E5E2DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Top Announcement Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFECE6] border border-[#DDD8CE] text-xs text-[#55504A] mb-6 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[#1F1E1D]">Alphanex Release 2.5</span>
              <span className="text-[#A39E96]">&middot;</span>
              <span>Frontier Multi-Model Reasoning Engine</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-medium tracking-tight text-[#1F1E1D] leading-[1.08] mb-6">
              Pioneering intelligence for developers & frontier research.
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-[#55504A] font-normal leading-relaxed mb-8 max-w-2xl">
              AlphanexAI unifies state-of-the-art hybrid reasoning, interactive code diff canvases,
              Google AI Studio style parameter inspectors, and localized research grounding into one seamless workspace.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                id="hero-try-alphanex-btn"
                type="button"
                onClick={handleTryAlphanex}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-sm sm:text-base font-medium transition-all shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Try AlphanexAI</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
              <a
                href="#capabilities"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#F3EFEA] border border-[#DDD8CE] text-[#1F1E1D] text-sm sm:text-base font-medium transition-all shadow-2xs"
              >
                <span>Explore Capabilities</span>
                <ChevronRight className="w-4 h-4 text-[#8C877F]" />
              </a>
            </div>

            {/* Micro Badges */}
            <div className="mt-8 pt-6 border-t border-[#E5E2DC]/80 flex flex-wrap items-center gap-6 text-xs text-[#736E67]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Qwen 3.8, DeepSeek V4 & Gemini 3.8</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Interactive Side-by-Side Diffs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Localized eSewa & Khalti Top-ups</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Workspace Showcase */}
          <div className="mt-14 relative rounded-2xl border border-[#D5D0C7] bg-[#FAF8F4] shadow-2xl overflow-hidden">
            {/* Window Frame Bar */}
            <div className="px-4 py-3 bg-[#EFECE6] border-b border-[#DDD8CE] flex items-center justify-between text-xs text-[#736E67]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#E57373] border border-[#D32F2F]/20" />
                  <span className="w-3 h-3 rounded-full bg-[#FFB74D] border border-[#F57C00]/20" />
                  <span className="w-3 h-3 rounded-full bg-[#81C784] border border-[#388E3C]/20" />
                </div>
                <span className="text-[#A39E96] ml-2">|</span>
                <span className="font-mono text-[11px] text-[#4D4943]">workspace.alphanex.ai</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-[11px] font-medium text-[#1F1E1D] border border-[#DDD8CE]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live Environment
                </span>
                <Link
                  href="/workspace"
                  className="px-3 py-1 rounded-md bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] font-medium text-[11px] flex items-center gap-1 transition-colors"
                >
                  <span>Launch Workspace</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-400" />
                </Link>
              </div>
            </div>

            {/* Workspace Mockup Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] divide-y lg:divide-y-0 lg:divide-x divide-[#E5E2DC]">
              {/* Left Column: Chat Conversation Stream */}
              <div className="lg:col-span-6 p-4 sm:p-6 flex flex-col justify-between bg-[#FDFBF7]">
                <div className="space-y-4">
                  {/* Mode & Model selector bar mockup */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6]">
                    <div className="flex items-center gap-1.5 bg-[#EFECE6] p-0.5 rounded-lg text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-white text-[#1F1E1D] font-semibold shadow-2xs">
                        Developer
                      </span>
                      <span className="px-2 py-0.5 text-[#736E67]">Researcher</span>
                      <span className="px-2 py-0.5 text-[#736E67]">General</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#736E67] font-mono">
                      Qwen 3.8 Flash (Hybrid Thinking)
                    </span>
                  </div>

                  {/* User Query */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#1F1E1D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-[#EFECE6] p-3 rounded-xl text-xs text-[#1F1E1D] max-w-[85%] font-medium">
                      Refactor our FastAPI payment verification handler to add HMAC-SHA256 signature verification with constant-time comparison.
                    </div>
                  </div>

                  {/* Assistant Response with Reasoning */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      AN
                    </div>
                    <div className="space-y-2 max-w-[90%]">
                      {/* Thought block */}
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F4] border border-[#E5E2DC] text-[11px] text-[#736E67] flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Analyzed timing-attack vulnerabilities. Generated side-by-side diff in Canvas.</span>
                      </div>
                      <p className="text-xs text-[#33302C] leading-relaxed">
                        I updated the verification route to use <code className="px-1 py-0.5 bg-[#EFECE6] rounded font-mono text-[11px]">hmac.compare_digest</code> and added structured validation. Review the live diff on the right.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gemini style input pill mockup */}
                <div className="mt-4 pt-3 border-t border-[#EFECE6]">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-[#DDD8CE] bg-white text-xs text-[#9E9890] shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span className="flex-1">Ask Alphanex to write or debug code...</span>
                    <div className="w-6 h-6 rounded-full bg-[#1F1E1D] text-white flex items-center justify-center">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Code Diff Canvas Preview */}
              <div className="lg:col-span-6 p-4 sm:p-6 bg-[#FAF8F4] flex flex-col justify-between font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E2DC]">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-[#1F1E1D] font-sans text-xs">
                        payment_verifier.py
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans font-medium">
                        Diff Preview
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#736E67] font-sans">
                      <span className="text-emerald-700 font-bold">+14</span>
                      <span className="text-red-600 font-bold">-4</span>
                    </div>
                  </div>

                  {/* Diff Lines preview */}
                  <div className="space-y-1 overflow-hidden rounded-lg border border-[#DDD8CE] bg-white p-2.5 text-[11px]">
                    <div className="text-[#8C877F] select-none">@@ -14,8 +14,12 @@ def verify_signature(data, sig):</div>
                    <div className="bg-red-50 text-red-800 px-2 py-0.5 rounded flex items-center gap-2">
                      <span className="text-red-400 select-none">-</span>
                      <span>expected = hmac.new(SECRET, data, sha256).hexdigest()</span>
                    </div>
                    <div className="bg-red-50 text-red-800 px-2 py-0.5 rounded flex items-center gap-2">
                      <span className="text-red-400 select-none">-</span>
                      <span>return expected == sig  # timing attack risk</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded flex items-center gap-2 font-medium">
                      <span className="text-emerald-600 select-none">+</span>
                      <span>computed = hmac.new(SECRET_KEY, payload, hashlib.sha256).digest()</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded flex items-center gap-2 font-medium">
                      <span className="text-emerald-600 select-none">+</span>
                      <span># Constant-time comparison prevents timing discrepancies</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded flex items-center gap-2 font-medium">
                      <span className="text-emerald-600 select-none">+</span>
                      <span>return hmac.compare_digest(computed, signature_bytes)</span>
                    </div>
                  </div>
                </div>

                {/* Direct Entry CTA Banner in Preview */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#EFECE6] border border-[#DDD8CE] flex items-center justify-between">
                  <div className="font-sans text-xs">
                    <p className="font-semibold text-[#1F1E1D]">Experience the full workspace</p>
                    <p className="text-[#736E67] text-[11px]">No setup required · Free credits included</p>
                  </div>
                  <Link
                    href="/workspace"
                    className="px-3.5 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research & Editorial Grid (OpenAI style) */}
      <section id="research" className="py-20 sm:py-24 border-b border-[#E5E2DC] bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-mono text-[#736E67] mb-2 font-bold">
                Frontier Research
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#1F1E1D]">
                Latest breakthroughs & system updates
              </h2>
            </div>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F1E1D] hover:underline"
            >
              <span>Test in Alphanex Studio</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Research Card 1 */}
            <Link
              href="/workspace"
              className="group p-6 rounded-2xl bg-white border border-[#E5E2DC] hover:border-[#B8B2A6] hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#736E67] mb-4">
                  <span className="font-mono uppercase font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    Reasoning
                  </span>
                  <span>March 2026</span>
                </div>
                <h3 className="text-xl font-serif font-semibold text-[#1F1E1D] group-hover:text-blue-900 transition-colors mb-3 leading-snug">
                  Adaptive Test-Time Compute in Alphanex v2.5
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  How dynamic token allocation and deep reflection trees enable frontier precision for complex mathematical derivations and systems code.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EFECE6] flex items-center gap-1.5 text-xs font-semibold text-[#1F1E1D] group-hover:gap-2.5 transition-all">
                <span>Explore reasoning engine</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
              </div>
            </Link>

            {/* Research Card 2 */}
            <Link
              href="/workspace"
              className="group p-6 rounded-2xl bg-white border border-[#E5E2DC] hover:border-[#B8B2A6] hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#736E67] mb-4">
                  <span className="font-mono uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Architecture
                  </span>
                  <span>February 2026</span>
                </div>
                <h3 className="text-xl font-serif font-semibold text-[#1F1E1D] group-hover:text-emerald-900 transition-colors mb-3 leading-snug">
                  Side-by-Side Canvas Diffing: Eliminating Context Degradation
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  Decoupling full-file code diffing from chat stream context to preserve token bandwidth and ensure zero degradation across iterations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EFECE6] flex items-center gap-1.5 text-xs font-semibold text-[#1F1E1D] group-hover:gap-2.5 transition-all">
                <span>View Canvas architecture</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </Link>

            {/* Research Card 3 */}
            <Link
              href="/workspace"
              className="group p-6 rounded-2xl bg-white border border-[#E5E2DC] hover:border-[#B8B2A6] hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#736E67] mb-4">
                  <span className="font-mono uppercase font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Grounding
                  </span>
                  <span>January 2026</span>
                </div>
                <h3 className="text-xl font-serif font-semibold text-[#1F1E1D] group-hover:text-amber-900 transition-colors mb-3 leading-snug">
                  Regional Intelligence & South Asian Fintech Verification
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  Integrating localized Nepal NRB banking guidelines, eSewa and Khalti protocol specifications directly with verified citation chains.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EFECE6] flex items-center gap-1.5 text-xs font-semibold text-[#1F1E1D] group-hover:gap-2.5 transition-all">
                <span>Read grounding report</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Capabilities & Workflows */}
      <section id="capabilities" className="py-20 sm:py-28 border-b border-[#E5E2DC] bg-[#FBF9F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <p className="text-xs uppercase tracking-widest font-mono text-[#736E67] mb-2 font-bold">
              Integrated Workspaces
            </p>
            <h2 className="text-3xl sm:text-5xl font-serif font-medium text-[#1F1E1D] mb-4">
              Engineered for specialized cognitive disciplines.
            </h2>
            <p className="text-base sm:text-lg text-[#55504A]">
              Switch between dedicated personas instantly with tuned system prompts, custom tools, and parameter drawers.
            </p>
          </div>

          {/* Workflow Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#EFECE6] w-fit mb-8 border border-[#DDD8CE]">
            <button
              type="button"
              onClick={() => setActiveTab('developer')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'developer'
                  ? 'bg-white text-[#1F1E1D] shadow-xs'
                  : 'text-[#736E67] hover:text-[#1F1E1D]'
              }`}
            >
              Developer Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('researcher')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'researcher'
                  ? 'bg-white text-[#1F1E1D] shadow-xs'
                  : 'text-[#736E67] hover:text-[#1F1E1D]'
              }`}
            >
              Researcher Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white text-[#1F1E1D] shadow-xs'
                  : 'text-[#736E67] hover:text-[#1F1E1D]'
              }`}
            >
              Google AI Studio Inspector
            </button>
          </div>

          {/* Tab Content 1: Developer */}
          {activeTab === 'developer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 rounded-2xl bg-white border border-[#E5E2DC]">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1F1E1D]">
                  Interactive Code Evolution & Side-by-Side Diffs
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  No more messy full-file chat dumps. Alphanex renders Git-style green and red line additions, unified diff viewers, syntax-highlighted blocks, and Pyodide WASM in-browser execution.
                </p>
                <ul className="space-y-2 text-xs text-[#33302C]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Real-time line additions and deletions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>One-click copy, download, and file replacement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Side drawer with responsive drag divider and full-screen expansion</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <span>Launch Developer Mode in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#1F1E1D] text-white font-mono text-xs overflow-hidden shadow-md">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-neutral-400">
                  <span>diff --git a/auth.ts b/auth.ts</span>
                  <span className="text-emerald-400">clean diff</span>
                </div>
                <div className="text-neutral-500">@@ -22,4 +22,7 @@ async function verifyToken(req)</div>
                <div className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded">- const isValid = token === SECRET;</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded font-bold">+ const isValid = crypto.timingSafeEqual(</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded font-bold">+   Buffer.from(token), Buffer.from(SECRET)</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded font-bold">+ );</div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Researcher */}
          {activeTab === 'researcher' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 rounded-2xl bg-white border border-[#E5E2DC]">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1F1E1D]">
                  Live Grounding & Academic Citations
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  Equip your queries with live internet search grounding, verifiable URL citations, LaTeX formula rendering, and structured executive briefs formatted for publication.
                </p>
                <ul className="space-y-2 text-xs text-[#33302C]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Real-time web search grounding enabled with Qwen 3.8 Flash & Gemini 3.8 Flash</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Clickable source chips directly in the canvas drawer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Regional South Asian and Himalayan research datasets</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    <span>Launch Researcher Mode in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#DDD8CE] text-xs space-y-3">
                <div className="flex items-center gap-2 text-[#736E67] font-semibold text-[11px]">
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Grounding Sources Verified (3 citations)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E2DC] text-[11px] space-y-1">
                  <div className="font-semibold text-[#1F1E1D]">Nepal Rastra Bank Fintech Report 2025/26</div>
                  <div className="text-[#736E67] truncate">https://nrb.org.np/publications/fintech-indicators</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E2DC] text-[11px] space-y-1">
                  <div className="font-semibold text-[#1F1E1D]">International Centre for Integrated Mountain Development (ICIMOD)</div>
                  <div className="text-[#736E67] truncate">https://icimod.org/cryosphere-data-portal</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Studio */}
          {activeTab === 'studio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 rounded-2xl bg-white border border-[#E5E2DC]">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1F1E1D]">
                  Google AI Studio Parameter Control
                </h3>
                <p className="text-sm text-[#55504A] leading-relaxed">
                  Inspect and tweak low-level hyper-parameters just like Google AI Studio: Temperature, Top-P, Top-K, Maximum Output Tokens, and custom system instructions per session.
                </p>
                <ul className="space-y-2 text-xs text-[#33302C]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Continuous temperature control (0.0 - 2.0)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Persistent system instructions tailored per conversation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Dynamic token budget & cost inspection in real-time</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-900"
                  >
                    <span>Open Parameter Drawer in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#DDD8CE] text-xs space-y-3 font-mono">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#4D4943]">temperature</span>
                  <span className="font-bold text-[#1F1E1D]">0.70</span>
                </div>
                <div className="w-full bg-[#E5E2DC] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#1F1E1D] h-full w-[35%]" />
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-[#4D4943]">top_p</span>
                  <span className="font-bold text-[#1F1E1D]">0.95</span>
                </div>
                <div className="w-full bg-[#E5E2DC] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#1F1E1D] h-full w-[95%]" />
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-[#4D4943]">max_output_tokens</span>
                  <span className="font-bold text-[#1F1E1D]">8192</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Model Roster Section */}
      <section id="models" className="py-20 sm:py-24 border-b border-[#E5E2DC] bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-widest font-mono text-[#736E67] mb-2 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Next-Gen Frontier Roster</span>
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#1F1E1D] mb-3">
                One unified interface. Multi-tier foundation intelligence.
              </h2>
              <p className="text-sm sm:text-base text-[#55504A]">
                Access the latest generation of hybrid-thinking, MoE, and frontier reasoning models from Qwen, DeepSeek, Google, OpenAI, Moonshot, and Anthropic.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHomeSpecsModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#DDD8CE] text-xs font-semibold text-[#1F1E1D] hover:bg-[#F3EFEA] transition-colors shadow-2xs"
              >
                <Table className="w-3.5 h-3.5 text-blue-600" />
                <span>Specs & Pricing Matrix</span>
              </button>
            </div>
          </div>

          {/* Tier Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-[#E5E2DC] pb-4">
            <button
              type="button"
              onClick={() => setModelTierFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                modelTierFilter === 'all'
                  ? 'bg-[#1F1E1D] text-white shadow-xs'
                  : 'bg-white text-[#736E67] border border-[#E5E2DC] hover:border-[#B8B2A6]'
              }`}
            >
              All Models ({AVAILABLE_MODELS.length})
            </button>
            <button
              type="button"
              onClick={() => setModelTierFilter('free')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                modelTierFilter === 'free'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Free Tier ({AVAILABLE_MODELS.filter((m) => m.tier === 'free').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setModelTierFilter('lite')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                modelTierFilter === 'lite'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-teal-800 border border-teal-200 hover:bg-teal-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>Lite Tier ({AVAILABLE_MODELS.filter((m) => m.tier === 'lite').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setModelTierFilter('plus')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                modelTierFilter === 'plus'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Plus Tier ({AVAILABLE_MODELS.filter((m) => m.tier === 'plus').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setModelTierFilter('pro_max')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                modelTierFilter === 'pro_max'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Pro / Max Tier ({AVAILABLE_MODELS.filter((m) => m.tier === 'pro' || m.tier === 'max' || m.tier === 'vault').length})</span>
            </button>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {AVAILABLE_MODELS.filter((m) => {
              if (modelTierFilter === 'free') return m.tier === 'free';
              if (modelTierFilter === 'lite') return m.tier === 'lite';
              if (modelTierFilter === 'plus') return m.tier === 'plus';
              if (modelTierFilter === 'pro_max') return m.tier === 'pro_max';
              return true;
            }).map((model) => {
              const tierBadgeColor =
                model.tier === 'free'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : model.tier === 'lite'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : model.tier === 'plus'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200';

              const tierLabel =
                model.tier === 'free'
                  ? 'Free Tier'
                  : model.tier === 'lite'
                  ? 'Lite Tier'
                  : model.tier === 'plus'
                  ? 'Plus Tier'
                  : 'Pro / Max';

              return (
                <div
                  key={model.id}
                  className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-[#E5E2DC] shadow-2xs hover:border-[#B8B2A6] hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Top Tag & Tier Pill */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#F5F2EC] text-[#635E58] border border-[#E5E2DC] truncate max-w-[130px]">
                        {model.provider}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${tierBadgeColor}`}>
                        {tierLabel}
                      </span>
                    </div>

                    {/* Model Name & Badges */}
                    <h3 className="text-base font-bold text-[#1F1E1D] group-hover:text-black transition-colors mb-1.5 flex items-center justify-between">
                      <span>{model.name}</span>
                    </h3>

                    {/* Context and Thinking Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[#F7F5F0] text-[#736E67] border border-[#EBE7DF]">
                        {model.contextWindow}
                      </span>
                      {model.supportsThinking && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Thinking
                        </span>
                      )}
                    </div>

                    {/* Pricing Pill */}
                    <div className="p-2 rounded-xl bg-[#FAF8F4] border border-[#EFECE6] mb-3 text-[11px] font-mono space-y-0.5">
                      <div className="flex items-center justify-between text-[#736E67]">
                        <span>Input:</span>
                        <span className="font-semibold text-[#1F1E1D]">{model.inputPrice}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#736E67]">
                        <span>Output:</span>
                        <span className="font-semibold text-[#1F1E1D]">{model.outputPrice}</span>
                      </div>
                    </div>

                    {/* Differentiators */}
                    <p className="text-xs text-[#55504A] leading-relaxed mb-4 line-clamp-3">
                      {model.differentiators}
                    </p>
                  </div>

                  {/* Launch CTA */}
                  <div className="pt-3 border-t border-[#EFECE6]">
                    <Link
                      href={`/workspace?model=${encodeURIComponent(model.id)}`}
                      className="w-full inline-flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F5F0] hover:bg-[#1F1E1D] text-[#1F1E1D] hover:text-white text-xs font-semibold transition-all group-hover:bg-[#1F1E1D] group-hover:text-white"
                    >
                      <span>Try in Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Home Specs & Pricing Matrix Modal */}
        {showHomeSpecsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FAF8F4] border border-[#D5D0C7] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#E5E2DC] bg-[#F3EFEA] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#1F1E1D] flex items-center gap-2">
                    <Table className="w-5 h-5 text-blue-600" />
                    <span>Complete Frontier Model Specifications & Pricing</span>
                  </h3>
                  <p className="text-xs text-[#736E67]">
                    Official rate matrix per 1 Million tokens, architectural differentiators, and context capacities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHomeSpecsModal(false)}
                  className="p-1.5 rounded-lg hover:bg-[#E5E2DC] text-[#736E67]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-auto p-4 sm:p-6 text-xs font-sans">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#D5D0C7] text-left text-[11px] font-mono text-[#736E67] uppercase">
                      <th className="pb-3 pr-4">Model & Tier</th>
                      <th className="pb-3 px-3">Provider</th>
                      <th className="pb-3 px-3">Context</th>
                      <th className="pb-3 px-3">Input / 1M</th>
                      <th className="pb-3 px-3">Output / 1M</th>
                      <th className="pb-3 px-3">Thinking</th>
                      <th className="pb-3 pl-3">Differentiators</th>
                      <th className="pb-3 pl-3">Launch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2DC]">
                    {AVAILABLE_MODELS.map((m) => (
                      <tr key={m.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-3 pr-4 font-semibold text-[#1F1E1D]">
                          <div className="flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                m.tier === 'free'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.tier === 'lite'
                                  ? 'bg-teal-100 text-teal-800'
                                  : m.tier === 'plus'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {m.tier === 'free' ? 'FREE' : m.tier === 'lite' ? 'LITE' : m.tier === 'plus' ? 'PLUS' : 'PRO/MAX'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#55504A] font-mono text-[11px]">{m.provider}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{m.contextWindow}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-emerald-800 font-semibold">
                          {m.inputPrice}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-blue-800 font-semibold">
                          {m.outputPrice}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {m.supportsThinking ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[#A39E96]">Autoregressive</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-[#55504A] max-w-xs text-[11px] leading-relaxed">
                          {m.differentiators}
                        </td>
                        <td className="py-3 pl-3">
                          <Link
                            href={`/workspace?model=${m.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F1E1D] text-white hover:bg-black text-[11px] font-medium transition-colors"
                          >
                            <span>Launch</span>
                            <ArrowUpRight className="w-3 h-3 text-amber-400" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-[#E5E2DC] bg-[#F3EFEA] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHomeSpecsModal(false)}
                  className="px-4 py-2 rounded-full bg-[#1F1E1D] text-white text-xs font-semibold hover:bg-black transition-colors"
                >
                  Close Matrix
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Localized Payments & Regional Ecosystem (eSewa & Khalti) */}
      <section id="pricing" className="py-20 sm:py-24 border-b border-[#E5E2DC] bg-[#FBF9F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#1F1E1D] text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-amber-300">
                <span>Nepal Regional Gateway</span>
                <span>&bull;</span>
                <span>eSewa & Khalti</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white">
                Frictionless access for creators in Nepal and beyond.
              </h2>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                No international credit cards required. Top up developer credits directly using eSewa or Khalti QR codes in Nepalese Rupees (NPR), or start immediately with generous free credits.
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={handleTryAlphanex}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-[#1F1E1D] font-bold text-sm sm:text-base transition-all shadow-md cursor-pointer"
              >
                <span>Try AlphanexAI Free</span>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Footer Call to Action (OpenAI style big editorial statement) */}
      <section className="py-24 sm:py-32 bg-[#FAF8F4] border-b border-[#E5E2DC] text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium text-[#1F1E1D] mb-6 tracking-tight">
            Step into the next tier of intelligence.
          </h2>
          <p className="text-base sm:text-xl text-[#55504A] font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
            Begin with Qwen 3.8 Flash or DeepSeek V4 for free, explore Laguna S 2.1, GLM 5.3 & DeepSeek V4.1 in Lite, or unlock Gemini 3.8 Flash, GPT-6 Astra, and Claude Opus 5 with instant side-by-side diffing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="cta-bottom-try-btn"
              type="button"
              onClick={handleTryAlphanex}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-base font-semibold transition-all shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Try AlphanexAI</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
            <Link
              href="/workspace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-[#F3EFEA] border border-[#DDD8CE] text-[#1F1E1D] text-base font-semibold transition-all shadow-2xs"
            >
              <span>Explore Workspace Demo</span>
              <ChevronRight className="w-4 h-4 text-[#736E67]" />
            </Link>
          </div>
        </div>
      </section>

      {/* OpenAI Minimalist Multi-Column Footer */}
      <footer className="bg-[#FAF8F4] text-[#736E67] text-xs py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1F1E1D] text-[#FBF9F5] flex items-center justify-center font-bold text-xs shadow-xs">
                  <span className="font-mono text-amber-400 font-black">AN</span>
                </div>
                <span className="font-bold text-base text-[#1F1E1D] font-serif">
                  AlphanexAI
                </span>
              </div>
              <p className="text-xs text-[#858079] max-w-sm leading-relaxed">
                Frontier AI workspace fusing Claude aesthetic, Google AI Studio parameter inspector, and multi-model synthesis for global and regional creators.
              </p>
              <div className="pt-2">
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1F1E1D] text-[#FBF9F5] text-xs font-semibold hover:bg-black transition-colors"
                >
                  <span>Launch Workspace</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-400" />
                </Link>
              </div>
            </div>

            {/* Column 2: Research */}
            <div className="space-y-3">
              <p className="font-bold text-[#1F1E1D] font-mono uppercase tracking-wider text-[11px]">
                Research
              </p>
              <ul className="space-y-2">
                <li><a href="#research" className="hover:text-[#1F1E1D]">Overview</a></li>
                <li><a href="#research" className="hover:text-[#1F1E1D]">Adaptive Reasoning</a></li>
                <li><a href="#capabilities" className="hover:text-[#1F1E1D]">Canvas Diffs</a></li>
                <li><a href="#safety" className="hover:text-[#1F1E1D]">Safety Evaluation</a></li>
              </ul>
            </div>

            {/* Column 3: Products */}
            <div className="space-y-3">
              <p className="font-bold text-[#1F1E1D] font-mono uppercase tracking-wider text-[11px]">
                Products
              </p>
              <ul className="space-y-2">
                <li><Link href="/workspace" className="hover:text-[#1F1E1D]">Workspace</Link></li>
                <li><Link href="/workspace" className="hover:text-[#1F1E1D]">Developer Engine</Link></li>
                <li><Link href="/workspace" className="hover:text-[#1F1E1D]">Researcher Hub</Link></li>
                <li><a href="#models" className="hover:text-[#1F1E1D]">Model Roster</a></li>
                <li><a href="#pricing" className="hover:text-[#1F1E1D]">eSewa & Khalti Billing</a></li>
              </ul>
            </div>

            {/* Column 4: Company & Safety */}
            <div className="space-y-3">
              <p className="font-bold text-[#1F1E1D] font-mono uppercase tracking-wider text-[11px]">
                Company
              </p>
              <ul className="space-y-2">
                <li><a href="#research" className="hover:text-[#1F1E1D]">About Alphanex</a></li>
                <li><a href="#capabilities" className="hover:text-[#1F1E1D]">Regional Focus</a></li>
                <li><Link href="/workspace" className="hover:text-[#1F1E1D]">Status</Link></li>
                <li><Link href="/workspace" className="hover:text-[#1F1E1D]">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E5E2DC] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8C877F]">
            <p>AlphanexAI &copy; 2026. Built with state-of-the-art reasoning architectures.</p>
            <div className="flex items-center gap-6">
              <a href="#safety" className="hover:text-[#1F1E1D]">Privacy Policy</a>
              <a href="#safety" className="hover:text-[#1F1E1D]">Terms of Service</a>
              <Link href="/workspace" className="text-blue-700 font-medium hover:underline">
                Enter Studio &rarr;
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Real Supabase Authentication Modal with Sign In / Sign Up Google Auth */}
      <SignInModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          router.push('/workspace');
        }}
      />
    </div>
  );
}
