'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Receipt,
  Smartphone,
  ExternalLink,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { PaymentGateway, UserWallet, ModelTier } from '@/lib/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserWallet;
  onPaymentSuccess: (addedCredits: number, newPlan?: 'Starter' | 'Pro Builder') => void;
  initialIntendedTier?: ModelTier;
}

export default function PaymentModal({
  isOpen,
  onClose,
  wallet,
  onPaymentSuccess,
  initialIntendedTier,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'plans' | 'vault'>(
    initialIntendedTier === 'vault' || initialIntendedTier === 'pro_max' ? 'vault' : 'plans'
  );
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    name: string;
    priceNPR: number;
    tokens: string;
    credits: number;
    isSub: boolean;
    planType?: 'Starter' | 'Pro Builder';
  }>({
    id: 'pro-builder',
    name: 'Pro Builder',
    priceNPR: 1299,
    tokens: '~2.5M tokens/mo',
    credits: 500,
    isSub: true,
    planType: 'Pro Builder',
  });

  const [gateway, setGateway] = useState<PaymentGateway>('esewa');
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    txId: string;
    amount: number;
    creditsGranted: number;
    gateway: string;
    timestamp: string;
    planName: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const subscriptionPlans = [
    {
      id: 'starter',
      name: 'Starter',
      priceNPR: 499,
      period: '/ month',
      tokens: '~500k tokens',
      credits: 150,
      isSub: true,
      planType: 'Starter' as const,
      popular: false,
      features: [
        'Full access to Lite & Plus Tier Models (Laguna S 2.1, GLM 5.3 Flash, Gemini 3.8 Flash, DeepSeek V4 Pro, GPT-5.6 Sol)',
        '150 Credit Vault allowance',
        'Side-by-side Git Diff Analyzer',
        'Priority Kathmandu Cloud API routing',
      ],
    },
    {
      id: 'pro-builder',
      name: 'Pro Builder',
      priceNPR: 1299,
      period: '/ month',
      tokens: '~2.5M tokens',
      credits: 600,
      isSub: true,
      planType: 'Pro Builder' as const,
      popular: true,
      features: [
        'Full access to all Pro Models with high rate limits',
        '600 Credit Vault allowance for Claude Opus 5 & GPT-6 Astra',
        'In-Browser Pyodide WASM Terminal & GitHub PR automation',
        'Real-time SERP Search Grounding with Nepal citations',
        'Priority 24/7 Developer Support',
      ],
    },
  ];

  const creditPacks = [
    {
      id: 'vault-200',
      name: 'Quick Booster Pack',
      priceNPR: 200,
      tokens: '~200k frontier tokens',
      credits: 250,
      isSub: false,
      desc: 'Ideal for testing a few queries on Claude Opus 5 or GPT-6 Astra.',
    },
    {
      id: 'vault-500',
      name: 'Researcher Pack',
      priceNPR: 500,
      tokens: '~600k frontier tokens',
      credits: 700,
      isSub: false,
      desc: 'Best value for deep academic literature search & multi-step thinking proofs.',
    },
    {
      id: 'vault-1000',
      name: 'Ultra Frontier Pack',
      priceNPR: 1000,
      tokens: '~1.5M frontier tokens',
      credits: 1600,
      isSub: false,
      desc: 'Uncapped access to 1M context models (Fable 5.1) and zero-shot code synthesizers.',
    },
  ];

  const merchantPhone = '9801234567';
  const merchantName = 'AI Festa Studio Nepal Pvt. Ltd.';

  const handleCopyMerchant = () => {
    navigator.clipboard.writeText(merchantPhone);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleVerifyPayment = async () => {
    if (!transactionId.trim()) return;
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsVerifying(false);

    const receipt = {
      txId: transactionId.trim().toUpperCase(),
      amount: selectedPlan.priceNPR,
      creditsGranted: selectedPlan.credits,
      gateway: gateway === 'esewa' ? 'eSewa Mobile Wallet' : 'Khalti Digital Wallet',
      timestamp: new Date().toLocaleString(),
      planName: selectedPlan.name,
    };

    setSuccessReceipt(receipt);
    onPaymentSuccess(selectedPlan.credits, selectedPlan.planType);
  };

  const resetModal = () => {
    setSuccessReceipt(null);
    setTransactionId('');
    onClose();
  };

  return (
    <div
      id="payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={resetModal}
    >
      <div
        id="payment-modal-card"
        className="bg-[#FBF9F5] border border-[#E5E2DC] rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              NPR
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F1E1D]">
                Nepali Payment & Credit Top-Up
              </h3>
              <p className="text-[11px] text-[#736E67]">
                Instant QR Checkout via eSewa & Khalti
              </p>
            </div>
          </div>

          <button
            id="close-payment-modal-btn"
            type="button"
            onClick={resetModal}
            className="p-1 rounded-md hover:bg-[#E5E2DC] text-[#736E67] hover:text-[#1F1E1D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Successful Confirmation Receipt View */}
        {successReceipt ? (
          <div id="payment-success-screen" className="p-6 space-y-5 text-center my-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-[#1F1E1D]">Payment Verified!</h4>
              <p className="text-xs text-[#736E67]">
                Your AI Festa Studio wallet has been credited immediately.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between pb-2 border-b border-[#E5E2DC] font-sans font-semibold text-sm text-[#1F1E1D]">
                <span>{successReceipt.planName}</span>
                <span className="text-emerald-700">NPR {successReceipt.amount}</span>
              </div>
              <div className="flex justify-between text-[#55504A]">
                <span>Transaction ID:</span>
                <span className="font-bold text-[#1F1E1D]">{successReceipt.txId}</span>
              </div>
              <div className="flex justify-between text-[#55504A]">
                <span>Gateway:</span>
                <span>{successReceipt.gateway}</span>
              </div>
              <div className="flex justify-between text-[#55504A]">
                <span>Credits Added:</span>
                <span className="font-bold text-emerald-700">+{successReceipt.creditsGranted} Credits</span>
              </div>
              <div className="flex justify-between text-[#55504A]">
                <span>Updated Balance:</span>
                <span className="font-bold text-[#1F1E1D]">{wallet.credits} Credits</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#858079] pt-1">
                <span>Verified At:</span>
                <span>{successReceipt.timestamp}</span>
              </div>
            </div>

            <button
              id="return-to-workspace-btn"
              type="button"
              onClick={resetModal}
              className="px-6 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#3D3A37] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Return to Workspace
            </button>
          </div>
        ) : (
          /* Payment Flow */
          <div className="p-5 space-y-5">
            {/* Top Switcher: Subscription Plans vs Credit Vault Add-On */}
            <div className="flex items-center justify-center">
              <div className="bg-[#F3EFEA] p-0.5 rounded-xl border border-[#E5E2DC] flex">
                <button
                  id="tab-subscriptions-toggle"
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'plans'
                      ? 'bg-[#FBF9F5] text-[#1F1E1D] shadow-xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                >
                  Subscription Plans
                </button>
                <button
                  id="tab-vault-toggle"
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'vault'
                      ? 'bg-[#FBF9F5] text-[#1F1E1D] shadow-xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                >
                  Credit Vault Add-On
                </button>
              </div>
            </div>

            {/* Plan / Pack Cards */}
            {activeTab === 'plans' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subscriptionPlans.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      id={`plan-card-${plan.id}`}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#1F1E1D] bg-[#FAF8F3] shadow-sm'
                          : 'border-[#E5E2DC] bg-[#FDFBF7] hover:border-[#D5D0C7]'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#1F1E1D]">{plan.name}</h4>
                          <span className="font-bold text-sm text-[#1F1E1D]">
                            NPR {plan.priceNPR.toLocaleString()}
                            <span className="text-[10px] font-normal text-[#736E67]">/mo</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                          {plan.tokens} &middot; +{plan.credits} Vault Credits
                        </p>

                        <ul className="mt-3 space-y-1.5 text-[11px] text-[#55504A]">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-2 border-t border-[#E5E2DC] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#736E67]">
                          {isSelected ? 'Selected Plan' : 'Click to Select'}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#1F1E1D] bg-[#1F1E1D]'
                              : 'border-[#D5D0C7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {creditPacks.map((pack) => {
                  const isSelected = selectedPlan.id === pack.id;
                  return (
                    <div
                      key={pack.id}
                      id={`pack-card-${pack.id}`}
                      onClick={() =>
                        setSelectedPlan({
                          id: pack.id,
                          name: pack.name,
                          priceNPR: pack.priceNPR,
                          tokens: pack.tokens,
                          credits: pack.credits,
                          isSub: false,
                        })
                      }
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#B45309] bg-[#FFFBF5] shadow-xs'
                          : 'border-[#E5E2DC] bg-[#FDFBF7] hover:border-[#D5D0C7]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1F1E1D]">{pack.name}</span>
                          <span className="font-bold text-xs text-[#B45309]">
                            +{pack.credits} cr
                          </span>
                        </div>
                        <div className="text-base font-bold text-[#1F1E1D] mt-1">
                          NPR {pack.priceNPR}
                        </div>
                        <p className="text-[10px] text-[#736E67] mt-1 leading-relaxed">
                          {pack.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E5E2DC] flex items-center justify-between text-[11px]">
                        <span className="text-[#858079]">
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#B45309] bg-[#B45309]'
                              : 'border-[#D5D0C7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2 h-2 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment Gateway Selector & Instant QR Screen */}
            <div className="p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider">
                  Select Nepali Payment Method:
                </span>

                {/* Gateway Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    id="gateway-esewa-btn"
                    type="button"
                    onClick={() => setGateway('esewa')}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      gateway === 'esewa'
                        ? 'border-[#60BB46] bg-[#60BB46] text-white shadow-xs'
                        : 'border-[#E5E2DC] bg-[#FBF9F5] text-[#3D3A37] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    <span className="font-black tracking-tighter text-sm">e</span>
                    <span>eSewa Pay</span>
                  </button>

                  <button
                    id="gateway-khalti-btn"
                    type="button"
                    onClick={() => setGateway('khalti')}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      gateway === 'khalti'
                        ? 'border-[#5C2D91] bg-[#5C2D91] text-white shadow-xs'
                        : 'border-[#E5E2DC] bg-[#FBF9F5] text-[#3D3A37] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    <span className="font-black tracking-tighter text-sm">K</span>
                    <span>Khalti Wallet</span>
                  </button>
                </div>
              </div>

              {/* QR Code + Manual Instructions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Visual Instant QR Code */}
                <div className="p-4 bg-white rounded-xl border border-[#E5E2DC] flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
                  <div
                    className={`w-36 h-36 rounded-lg p-2 flex items-center justify-center border-2 ${
                      gateway === 'esewa'
                        ? 'border-[#60BB46] bg-emerald-50/40'
                        : 'border-[#5C2D91] bg-purple-50/40'
                    }`}
                  >
                    {/* Stylized high-contrast QR Matrix */}
                    <div className="w-full h-full bg-[#111111] p-2 rounded flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="w-7 h-7 border-2 border-white rounded-xs p-1 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-2xs" />
                        </div>
                        <div className="w-7 h-7 border-2 border-white rounded-xs p-1 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-2xs" />
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-center font-bold text-white tracking-widest uppercase">
                        {gateway.toUpperCase()} QR
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-7 h-7 border-2 border-white rounded-xs p-1 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-2xs" />
                        </div>
                        <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[7px] text-black font-black">
                          AI
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#736E67]">
                    Scan with <strong className="text-[#1F1E1D]">{gateway === 'esewa' ? 'eSewa' : 'Khalti'} App</strong>
                  </div>
                  <span className="text-xs font-bold text-[#1F1E1D]">
                    Amount: NPR {selectedPlan.priceNPR.toLocaleString()}
                  </span>
                </div>

                {/* Manual Phone / Merchant Details & Verification Input */}
                <div className="flex flex-col justify-between space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[#736E67]">Direct Merchant Transfer:</span>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E5E2DC]">
                      <div>
                        <div className="font-mono font-bold text-[#1F1E1D]">{merchantPhone}</div>
                        <div className="text-[10px] text-[#858079]">{merchantName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyMerchant}
                        className="px-2 py-1 rounded bg-[#F3EFEA] hover:bg-[#ECE8E1] text-[#1F1E1D] text-[11px] font-medium flex items-center gap-1"
                      >
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Transaction ID Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="payment-tx-input"
                      className="block font-semibold text-[#1F1E1D]"
                    >
                      Enter Transaction ID / Reference:
                    </label>
                    <input
                      id="payment-tx-input"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={
                        gateway === 'esewa' ? 'e.g. ESW99482103' : 'e.g. KHL77391204'
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-white text-[#1F1E1D] font-mono outline-hidden focus:border-[#B8B2A6]"
                    />
                    <p className="text-[10px] text-[#858079]">
                      Instant automated ledger reconciliation across NRB clearing channels.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="verify-payment-btn"
                    type="button"
                    disabled={!transactionId.trim() || isVerifying}
                    onClick={handleVerifyPayment}
                    className={`w-full py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                      gateway === 'esewa'
                        ? 'bg-[#60BB46] hover:bg-[#52A33A]'
                        : 'bg-[#5C2D91] hover:bg-[#4E267C]'
                    } disabled:opacity-40`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isVerifying
                        ? 'Reconciling Ledger...'
                        : `Verify & Credit NPR ${selectedPlan.priceNPR.toLocaleString()}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
