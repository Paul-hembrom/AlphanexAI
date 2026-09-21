'use client';

import React from 'react';
import { X } from 'lucide-react';
import SignInCard from './SignInCard';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="signin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
        <button
          id="close-signin-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <SignInCard
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
