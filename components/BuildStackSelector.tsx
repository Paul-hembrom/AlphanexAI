'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Globe,
  Smartphone,
  Check,
  Code2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BuildStack, WebBuildStack, MobileBuildStack } from '@/lib/types';
import {
  getStoredBuildStack,
  setStoredBuildStack,
  DEFAULT_BUILD_STACK,
} from '@/lib/webapp-preview';

interface BuildStackSelectorProps {
  currentStack?: BuildStack;
  onChangeStack?: (stack: BuildStack) => void;
  compact?: boolean;
}

interface StackOption {
  id: BuildStack;
  label: string;
  badge: string;
  group: 'web' | 'mobile';
  description: string;
  previewType: 'live' | 'code-only';
}

export const BUILD_STACK_OPTIONS: StackOption[] = [
  // Website Group
  {
    id: 'html-css-js',
    label: 'HTML / CSS / JS',
    badge: 'Instant Live Preview',
    group: 'web',
    description: 'Zero-bundler modern HTML5, Tailwind CSS, and pure client-side reactive state.',
    previewType: 'live',
  },
  {
    id: 'react',
    label: 'React (Tailwind)',
    badge: 'Component Tree',
    group: 'web',
    description: 'React components with hooks & Tailwind CSS, rendered live via client CDN.',
    previewType: 'live',
  },
  {
    id: 'vue',
    label: 'Vue 3',
    badge: 'Reactive View',
    group: 'web',
    description: 'Vue 3 Single-Page component with Composition API and live browser mounting.',
    previewType: 'live',
  },
  {
    id: 'nextjs',
    label: 'Next.js (App Router)',
    badge: 'Full-Stack Layout',
    group: 'web',
    description: 'Next.js App Router layout and client component tree with live preview.',
    previewType: 'live',
  },
  // Mobile App Group
  {
    id: 'react-native',
    label: 'React Native',
    badge: 'Source Code Only',
    group: 'mobile',
    description: 'React Native / Expo component source files with interactive code-tree viewer.',
    previewType: 'code-only',
  },
  {
    id: 'flutter',
    label: 'Flutter (Dart)',
    badge: 'Source Code Only',
    group: 'mobile',
    description: 'Flutter Dart widget tree and pubspec configuration in structural code viewer.',
    previewType: 'code-only',
  },
];

export default function BuildStackSelector({
  currentStack: controlledStack,
  onChangeStack,
  compact = false,
}: BuildStackSelectorProps) {
  const [internalStack, setInternalStack] = useState<BuildStack>(() => {
    return getStoredBuildStack();
  });

  const selectedStack = controlledStack ?? internalStack;
  const [activeGroup, setActiveGroup] = useState<'web' | 'mobile'>('web');

  // Listen to external changes
  useEffect(() => {
    const handleStackChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ stack: BuildStack }>;
      if (customEvent.detail && customEvent.detail.stack) {
        setInternalStack(customEvent.detail.stack);
      }
    };

    window.addEventListener('alphanex-build-stack-changed', handleStackChanged);
    return () => {
      window.removeEventListener('alphanex-build-stack-changed', handleStackChanged);
    };
  }, []);

  const handleSelectStack = (stack: BuildStack) => {
    setInternalStack(stack);
    setStoredBuildStack(stack);
    if (onChangeStack) {
      onChangeStack(stack);
    }
  };

  const currentOption = BUILD_STACK_OPTIONS.find((s) => s.id === selectedStack) || BUILD_STACK_OPTIONS[0];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Layers className="w-3.5 h-3.5 text-[#736E67]" />
        <span className="text-[#736E67] font-medium">Stack:</span>
        <select
          value={selectedStack}
          onChange={(e) => handleSelectStack(e.target.value as BuildStack)}
          className="bg-white border border-[#E5E2DC] rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#1F1E1D] focus:outline-none focus:border-[#B8B2A6] cursor-pointer"
        >
          <optgroup label="Website Group">
            <option value="html-css-js">HTML / CSS / JS</option>
            <option value="react">React (Tailwind)</option>
            <option value="vue">Vue 3</option>
            <option value="nextjs">Next.js</option>
          </optgroup>
          <optgroup label="Mobile App Group">
            <option value="react-native">React Native (Code)</option>
            <option value="flutter">Flutter Dart (Code)</option>
          </optgroup>
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Group Toggle: Website vs Mobile */}
      <div className="flex items-center p-0.5 bg-[#EFECE6] rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveGroup('web')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all cursor-pointer ${
            activeGroup === 'web'
              ? 'bg-white text-[#1F1E1D] shadow-xs'
              : 'text-[#736E67] hover:text-[#1F1E1D]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span>Website</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveGroup('mobile')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all cursor-pointer ${
            activeGroup === 'mobile'
              ? 'bg-white text-[#1F1E1D] shadow-xs'
              : 'text-[#736E67] hover:text-[#1F1E1D]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Mobile App</span>
        </button>
      </div>

      {/* Stack Options List */}
      <div className="space-y-1.5">
        {BUILD_STACK_OPTIONS.filter((opt) => opt.group === activeGroup).map((opt) => {
          const isSelected = selectedStack === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectStack(opt.id)}
              className={`w-full p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                  : 'bg-white border-[#E5E2DC] hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-indigo-950' : 'text-[#1F1E1D]'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                      opt.previewType === 'live'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <p className="text-[10.5px] text-[#736E67] leading-tight">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Notice about mobile preview honest limitation */}
      {activeGroup === 'mobile' && (
        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[10.5px] text-amber-900 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Honest Sandbox Notice:</strong> Native mobile emulators cannot run inside an in-browser iframe. Alphanex compiles clean, modular source files (component & widget tree) with interactive code inspection.
          </span>
        </div>
      )}
    </div>
  );
}
