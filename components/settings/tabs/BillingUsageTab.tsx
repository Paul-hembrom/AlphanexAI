'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Sparkles,
  Coins,
  ArrowUpRight,
  Receipt,
  Download,
  CheckCircle2,
  QrCode,
  Check,
  Copy,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { UserWallet, PaymentGateway, BillingTransaction } from '@/lib/types';
import { supabase, getStoredTransactions } from '@/lib/supabase';

interface BillingUsageTabProps {
  wallet: UserWallet;
  onTopUpSuccess: (addedCredits: number, newPlan?: 'Starter' | 'Pro Builder') => void;
}

const CREDIT_PACKS = [
  {
    id: 'pack_150',
    credits: 150,
    priceNpr: 200,
    badge: 'Starter Top-Up',
    description: 'Perfect for rapid debugging and diff inspection.',
  },
  {
    id: 'pack_450',
    credits: 450,
    priceNpr: 500,
    badge: 'Most Popular',
    popular: true,
    description: 'Ideal for continuous research & deep reasoning chains.',
  },
  {
    id: 'pack_1000',
    credits: 1000,
    priceNpr: 1000,
    badge: 'Enterprise Vault',
    description: 'Uncapped access for Claude Opus 5 & GPT-6 Astra simulations.',
  },
];

export default function BillingUsageTab({
  wallet,
  onTopUpSuccess,
}: BillingUsageTabProps) {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[1]);
  const [gateway, setGateway] = useState<PaymentGateway>('esewa');
  const [showCheckout, setShowCheckout] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Load transactions reactively
  useEffect(() => {
    const loadTx = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);
      if (data) setTransactions(data as BillingTransaction[]);
    };

    loadTx();

    const handleTxUpdate = () => {
      setTransactions(getStoredTransactions());
    };

    window.addEventListener('ai_festa_transactions_updated', handleTxUpdate);
    return () => {
      window.removeEventListener('ai_festa_transactions_updated', handleTxUpdate);
    };
  }, []);

  const handleVerifyPayment = async () => {
    if (!referenceCode.trim()) return;
    setIsVerifying(true);

    setTimeout(async () => {
      const creditsToAdd = selectedPack.credits;
      const newTxRecord = {
        gateway,
        amountNpr: selectedPack.priceNpr,
        creditsAdded: creditsToAdd,
        planName: `Credit Pack (${creditsToAdd} Cr)`,
        status: 'Completed' as const,
        referenceCode: referenceCode.trim().toUpperCase(),
      };

      await supabase.from('transactions').insert([newTxRecord]);

      onTopUpSuccess(creditsToAdd);
      setIsVerifying(false);
      setShowCheckout(false);
      setReferenceCode('');
      setPaymentSuccess(
        `Successfully credited ${creditsToAdd} Credits via ${gateway.toUpperCase()}!`
      );
      setTimeout(() => setPaymentSuccess(null), 5000);
    }, 1000);
  };

  const handleDownloadReceipt = (tx: BillingTransaction) => {
    setReceiptFeedback(`Receipt PDF for ${tx.invoiceRef} generated and downloaded.`);
    setTimeout(() => setReceiptFeedback(null), 3500);
  };

  // Usage calculations
  const totalCapacity = 600;
  const currentCredits = wallet.credits;
  const percentRemaining = Math.min(100, Math.round((currentCredits / totalCapacity) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Tab Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Subscription & Credit Vault</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Manage your active Nepal tier, view breakdown usage metrics, and top up via eSewa or Khalti.
        </p>
      </div>

      {paymentSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {receiptFeedback && (
        <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50 flex items-center gap-2.5 text-xs text-blue-900 font-semibold animate-in fade-in">
          <Download className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{receiptFeedback}</span>
        </div>
      )}

      {/* Plan Status Card */}
      <div className="p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F5] space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858079]">
              Active Plan
            </span>
            <div className="flex items-center gap-2.5">
              <h4 className="text-lg font-bold text-[#1F1E1D]">{wallet.plan}</h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                NPR 1,299 / mo
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-[#736E67] justify-end">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Allowance resets in <strong className="text-[#1F1E1D]">14 days</strong></span>
            </div>
            <span className="text-[11px] text-[#858079]">Auto-renews Oct 1, 2026</span>
          </div>
        </div>

        {/* Visual Credit Allowance Meter */}
        <div className="pt-3 border-t border-[#EAE6DF] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Credit Allowance</span>
            </span>
            <span className="font-mono font-bold text-[#1F1E1D]">
              {currentCredits} <span className="text-[#858079] font-normal">/ {totalCapacity} Credits Remaining</span>
            </span>
          </div>

          {/* Meter Bar */}
          <div className="h-3 w-full bg-[#E5E2DC] rounded-full overflow-hidden p-0.5 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, percentRemaining)}%` }}
            />
          </div>

          {/* Usage Breakdown Gauge */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-white border border-[#E5E2DC] space-y-0.5">
              <div className="flex items-center justify-between text-[#736E67]">
                <span>Developer Mode</span>
                <span className="font-bold text-[#1F1E1D]">60%</span>
              </div>
              <div className="h-1 bg-blue-500 rounded-full" />
              <span className="text-[10px] text-[#858079]">Diff & WASM code runs</span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-[#E5E2DC] space-y-0.5">
              <div className="flex items-center justify-between text-[#736E67]">
                <span>Researcher Mode</span>
                <span className="font-bold text-[#1F1E1D]">25%</span>
              </div>
              <div className="h-1 bg-emerald-500 rounded-full" />
              <span className="text-[10px] text-[#858079]">SERP & Nepal gazettes</span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-[#E5E2DC] space-y-0.5">
              <div className="flex items-center justify-between text-[#736E67]">
                <span>General Polymath</span>
                <span className="font-bold text-[#1F1E1D]">15%</span>
              </div>
              <div className="h-1 bg-amber-500 rounded-full" />
              <span className="text-[10px] text-[#858079]">Drafting & reasoning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Top-Up Credit Packs Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider">
              Instant Credit Top-Up (Nepal Local Gateways)
            </h4>
            <p className="text-xs text-[#736E67]">
              Recharge your credit vault instantly using eSewa or Khalti without subscription commitments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CREDIT_PACKS.map((pack) => {
            const isSelected = selectedPack.id === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3EFEA] text-[#55504A]">
                      {pack.badge}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>

                  <div className="mt-2">
                    <span className="text-lg font-extrabold text-[#1F1E1D]">
                      {pack.credits} <span className="text-xs font-semibold text-[#736E67]">Credits</span>
                    </span>
                    <div className="text-xs font-bold text-emerald-800 mt-0.5">
                      NPR {pack.priceNpr.toLocaleString()}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#736E67] mt-1.5 leading-tight">
                    {pack.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPack(pack);
                    setShowCheckout(true);
                  }}
                  className={`w-full mt-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#FAF8F5] hover:bg-[#F3EFEA] text-[#1F1E1D] border border-[#D5D0C7]'
                  }`}
                >
                  <span>Select & Pay</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Drawer/Modal if triggered */}
      {showCheckout && (
        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#1F1E1D]">
                Checkout: {selectedPack.credits} Credits for NPR {selectedPack.priceNpr}
              </h4>
              <span className="text-xs text-[#736E67]">
                Select local payment gateway and enter verification reference.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCheckout(false)}
              className="text-xs text-[#736E67] hover:text-[#1F1E1D] underline"
            >
              Cancel
            </button>
          </div>

          {/* Gateway Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGateway('esewa')}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                gateway === 'esewa'
                  ? 'border-[#60BB46] bg-[#60BB46]/10 text-[#2C6E1D] font-bold ring-1 ring-[#60BB46]/40'
                  : 'border-[#E5E2DC] bg-white text-[#736E67]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#60BB46] text-white flex items-center justify-center text-[10px] font-bold">
                  e
                </div>
                <span className="text-xs">eSewa Wallet / Fonepay</span>
              </div>
              {gateway === 'esewa' && <Check className="w-3.5 h-3.5 text-[#60BB46]" />}
            </button>

            <button
              type="button"
              onClick={() => setGateway('khalti')}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                gateway === 'khalti'
                  ? 'border-[#5C2D91] bg-[#5C2D91]/10 text-[#5C2D91] font-bold ring-1 ring-[#5C2D91]/40'
                  : 'border-[#E5E2DC] bg-white text-[#736E67]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#5C2D91] text-white flex items-center justify-center text-[10px] font-bold">
                  K
                </div>
                <span className="text-xs">Khalti Digital Wallet</span>
              </div>
              {gateway === 'khalti' && <Check className="w-3.5 h-3.5 text-[#5C2D91]" />}
            </button>
          </div>

          {/* QR Code & Reference submission */}
          <div className="p-3 bg-white rounded-xl border border-[#E5E2DC] flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-lg border border-[#E5E2DC] shadow-xs shrink-0 flex flex-col items-center">
              <QrCode className="w-20 h-20 text-[#1F1E1D]" />
              <span className="text-[10px] font-mono text-[#858079] mt-1">Scan via {gateway.toUpperCase()}</span>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <div className="text-xs text-[#736E67]">
                Merchant Code:{' '}
                <strong className="font-mono text-[#1F1E1D]">AI-FESTA-NP-9912</strong>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1F1E1D] mb-1">
                  Transaction Reference ID (from receipt screen)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder={gateway === 'esewa' ? 'e.g., ESEWA-TX-77889' : 'e.g., KHALTI-REF-1122'}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E2DC] text-xs font-mono outline-hidden focus:border-[#B8B2A6]"
                  />
                  <button
                    type="button"
                    disabled={!referenceCode.trim() || isVerifying}
                    onClick={handleVerifyPayment}
                    className="px-3 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-bold transition-all disabled:opacity-40"
                  >
                    {isVerifying ? 'Verifying...' : 'Submit ID'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing History / Invoice Ledger */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#736E67]" />
            <span>Billing History & Synced Invoices</span>
          </h4>
          <span className="text-[11px] text-[#858079]">
            Synced with Supabase <code className="font-mono bg-[#EFECE6] px-1 py-0.5 rounded">transactions</code>
          </span>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] overflow-hidden bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E5E2DC] text-[#736E67] text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                <th className="py-2.5 px-3 font-semibold">Gateway</th>
                <th className="py-2.5 px-3 font-semibold">Amount (NPR)</th>
                <th className="py-2.5 px-3 font-semibold">Credits Added</th>
                <th className="py-2.5 px-3 font-semibold">Ref Code</th>
                <th className="py-2.5 px-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="py-2.5 px-3 text-[#1F1E1D] font-mono text-[11px]">
                    {tx.date}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        tx.gateway === 'eSewa'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {tx.gateway}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#1F1E1D]">
                    Rs. {tx.amountNpr.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    +{tx.creditsAdded} Cr
                  </td>
                  <td className="py-2.5 px-3 text-[#858079] font-mono text-[11px]">
                    {tx.invoiceRef}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(tx)}
                      className="p-1 rounded-md hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors inline-flex items-center gap-1 text-[11px]"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
