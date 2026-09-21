'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Brain,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Globe,
  Terminal,
  FileCode2,
  CheckCircle2,
  Zap,
  Clock,
  Wrench,
  Loader2,
  ClipboardList,
  Github,
  Paperclip,
  Trash2,
  Eye,
  EyeOff,
  FolderGit2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ChatMessage,
  Citation,
  DiffData,
  WorkMode,
  ModelInfo,
  ChatAttachment,
} from '@/lib/types';
import { SAMPLE_PROMPTS_BY_MODE, AVAILABLE_MODELS } from '@/lib/constants';
import { detectFileType, tokenizeDiffLine } from '@/lib/code-detection';

interface ChatAreaProps {
  messages: ChatMessage[];
  currentMode: WorkMode;
  selectedModel: ModelInfo;
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onOpenInCanvas: (diff?: DiffData, code?: string) => void;
  onOpenWebPreview?: (appName?: string) => void;
  onSelectPrompt: (prompt: string) => void;
  userCredits: number;
  onChangeMode?: (mode: WorkMode) => void;
  pendingAttachments?: ChatAttachment[];
  onRemoveAttachment?: (index: number) => void;
  onOpenRepoBrowser?: () => void;
}

export default function ChatArea({
  messages,
  currentMode,
  selectedModel,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenInCanvas,
  onOpenWebPreview,
  onSelectPrompt,
  userCredits,
  onChangeMode,
  pendingAttachments = [],
  onRemoveAttachment,
  onOpenRepoBrowser,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState('');
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [expandedAttachmentId, setExpandedAttachmentId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitationModal, setActiveCitationModal] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message or stream update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Adjust textarea height smoothly and compactly (Gemini chatbot / SMS single-line style)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (!inputText) {
        textareaRef.current.style.height = '24px';
      } else {
        const scrollH = textareaRef.current.scrollHeight;
        const targetH = Math.min(Math.max(scrollH, 24), 110);
        textareaRef.current.style.height = `${targetH}px`;
      }
    }
  }, [inputText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleThinking = (messageId: string) => {
    setExpandedThinking((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = SAMPLE_PROMPTS_BY_MODE[currentMode] || [];

  return (
    <div
      id="chat-pane-container"
      className="flex-1 flex flex-col h-full bg-[#FBF9F5] overflow-hidden relative"
    >
      {/* Citation Popover Modal */}
      {activeCitationModal && (
        <div
          id="citation-preview-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs"
          onClick={() => setActiveCitationModal(null)}
        >
          <div
            className="bg-[#FBF9F5] border border-[#E5E2DC] rounded-xl max-w-md w-full p-4 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E2DC]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeCitationModal.sourceName}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                {activeCitationModal.reliabilityScore || 95}% Reliability
              </span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1F1E1D]">
                {activeCitationModal.title}
              </h4>
              <p className="text-xs text-[#55504A] mt-2 leading-relaxed bg-[#F3EFEA] p-2.5 rounded-lg border border-[#E5E2DC]">
                &ldquo;{activeCitationModal.snippet}&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href={activeCitationModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline"
              >
                <span>Visit Source URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setActiveCitationModal(null)}
                className="px-3 py-1 rounded bg-[#EFECE6] hover:bg-[#E5E2DC] text-[#1F1E1D] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Conversation Context & Mode Detection Bar */}
      {messages.length > 0 && (
        <div
          id="chat-active-mode-bar"
          className="px-4 sm:px-8 py-2 bg-[#F6F3EC] border-b border-[#E8E4DC] flex items-center justify-between text-xs text-[#736E67] shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#858079]">Active Mode:</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-[#E0DCD4] font-semibold text-[#1F1E1D] shadow-2xs">
              {currentMode === 'developer' && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
              {currentMode === 'researcher' && <Globe className="w-3.5 h-3.5 text-emerald-600" />}
              {currentMode === 'general' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
              <span className="capitalize">{currentMode}</span>
            </div>
            <span className="text-[11px] text-[#8C877E] hidden md:inline">
              {currentMode === 'developer'
                ? '• Code inspection & interactive diffs'
                : currentMode === 'researcher'
                ? '• Live web grounding & verified citations'
                : '• Conversational reasoning & drafting'}
            </span>
          </div>

          {onChangeMode && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#858079] hidden sm:inline">Switch on the fly:</span>
              <div className="flex items-center gap-1 bg-[#ECE8E0] p-0.5 rounded-lg border border-[#DDD8CE]">
                {(['developer', 'researcher', 'general'] as WorkMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChangeMode(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      currentMode === m
                        ? 'bg-white text-[#1F1E1D] font-bold shadow-2xs'
                        : 'text-[#736E67] hover:text-[#1F1E1D]'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Stream Area */}
      <div
        id="chat-messages-stream"
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6"
      >
        {messages.length === 0 ? (
          /* Empty State / Welcome Screen with Nepal Specialized Prompts */
          <div
            id="chat-empty-welcome"
            className="max-w-2xl mx-auto my-auto pt-6 pb-10 text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFEA] border border-[#E5E2DC] text-xs font-medium text-[#736E67]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Running in {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode on{' '}
                <strong className="text-[#1F1E1D]">{selectedModel.name}</strong>
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#1F1E1D] tracking-tight">
                Welcome to Alphanex AI Studio
              </h2>
              <p className="text-sm text-[#736E67] max-w-lg mx-auto leading-relaxed">
                The premier workspace fusing Claude&apos;s warm minimalist design, Google AI Studio&apos;s
                rigorous inspector, and localized workflows for Nepal.
              </p>
            </div>

            {/* Quick Starters Grid */}
            <div className="pt-2 text-left space-y-2">
              <div className="text-xs font-semibold text-[#858079] uppercase tracking-wider px-1">
                Suggested {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Queries:
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    id={`sample-prompt-btn-${idx}`}
                    type="button"
                    onClick={() => onSelectPrompt(item.prompt)}
                    className="p-3.5 rounded-xl border border-[#E5E2DC] bg-[#FDFBF7] hover:bg-[#F3EFEA] hover:border-[#D5D0C7] text-left transition-all group flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-[#1F1E1D] group-hover:text-blue-900 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#736E67] mt-0.5 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#ECE8E1] text-[#736E67] font-medium shrink-0 mt-0.5">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isAssistant = message.role === 'assistant';
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';

            if (isSystem) {
              return (
                <div
                  key={message.id}
                  id={`chat-message-${message.id}`}
                  className="w-full flex items-center justify-center my-3"
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2EDE5] border border-[#DDD7CD] text-xs text-[#55504A] font-medium shadow-2xs">
                    {message.mode === 'developer' && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
                    {message.mode === 'researcher' && <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                    {message.mode === 'general' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{message.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                id={`chat-message-${message.id}`}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}
              >
                {/* User Prompt Bubble */}
                {isUser && (
                  <div className="max-w-[85%] flex flex-col items-end gap-1.5">
                    {/* Attached Repo Files Chips */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {message.attachments.map((att, attIdx) => {
                          const attKey = `${message.id}-att-${attIdx}`;
                          const isExpanded = expandedAttachmentId === attKey;
                          const sizeKb = att.size ? (att.size / 1024).toFixed(1) : null;

                          return (
                            <div
                              key={attIdx}
                              className="inline-flex flex-col text-xs rounded-xl bg-[#2A2927] border border-[#3E3C39] text-[#E5E2DC] shadow-2xs overflow-hidden max-w-full"
                            >
                              <div className="flex items-center gap-1.5 px-2.5 py-1">
                                <Github className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="font-mono text-[11px] text-white truncate max-w-[220px]" title={att.path || att.name}>
                                  {att.path || att.name}
                                </span>
                                {sizeKb && (
                                  <span className="text-[10px] text-[#A8A298] font-mono">
                                    {sizeKb} KB
                                  </span>
                                )}
                                {att.content && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAttachmentId(isExpanded ? null : attKey)}
                                    className="p-0.5 rounded text-[#A8A298] hover:text-white cursor-pointer ml-1"
                                    title={isExpanded ? 'Hide code preview' : 'Preview attached code'}
                                  >
                                    {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              {isExpanded && att.content && (
                                <div className="px-3 py-2 bg-[#191817] border-t border-[#3E3C39] max-h-48 overflow-y-auto text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
                                  {att.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="bg-[#1F1E1D] text-[#FBF9F5] rounded-2xl rounded-tr-xs px-4 py-3 text-sm leading-relaxed shadow-sm w-full">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                )}

                {/* Assistant Bubble */}
                {isAssistant && (
                  <div className="w-full space-y-3">
                    {/* Header meta badge */}
                    {(() => {
                      const msgModel =
                        AVAILABLE_MODELS.find((m) => m.id === message.modelId) || selectedModel;
                      return (
                        <div className="flex items-center justify-between text-xs text-[#858079] pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[#1F1E1D]">{msgModel.name}</span>
                            <span>&middot;</span>
                            <span className="capitalize">{message.mode} Mode</span>
                            {message.routedModel && (
                              <>
                                <span>&middot;</span>
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#55504A] font-mono text-[10px] border border-[#E0DCD5]"
                                  title={`Backend routed to ${message.providerName || 'OpenRouter'}: ${message.routedModel}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {message.routedModel}
                                </span>
                              </>
                            )}
                            {message.reasoningEffort && (
                              <>
                                <span>&middot;</span>
                                <span className="text-amber-800 font-medium">
                                  {message.reasoningEffort} Reasoning
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(message.content, message.id)}
                              className="hover:text-[#1F1E1D] flex items-center gap-1 text-[11px]"
                              title="Copy response"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Thinking / Reasoning Accordion (MoE & Hybrid Thinking style) */}
                    {(message.thinkingContent || message.isThinking) && (
                      <div
                        id={`thinking-block-${message.id}`}
                        className="rounded-xl border border-[#E5E2DC] bg-[#F7F5F0] overflow-hidden text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => toggleThinking(message.id)}
                          className="w-full px-3 py-2 flex items-center justify-between text-[#55504A] hover:bg-[#EFECE6] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Brain className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                            <span className="font-semibold text-[#1F1E1D]">
                              {message.isThinking ? 'Thinking...' : 'Reasoning Process'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                              {message.reasoningEffort || 'Medium'} compute
                            </span>
                          </div>
                          {expandedThinking[message.id] ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#858079]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#858079]" />
                          )}
                        </button>

                        {(expandedThinking[message.id] || message.isThinking) && (
                          <div className="p-3 border-t border-[#E5E2DC] text-[#736E67] font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-[#FAF8F3]">
                            {message.thinkingContent || 'Synthesizing knowledge graph...'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Structured Autonomous Build & Verification Checklist (Part D) */}
                    {message.buildSteps && message.buildSteps.length > 0 && (
                      <div
                        id={`build-checklist-${message.id}`}
                        className="rounded-xl border border-[#E0DCD4] bg-[#FAF8F5] p-3.5 space-y-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
                          <div className="flex items-center gap-1.5 font-semibold text-[#1F1E1D]">
                            <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Autonomous Sandbox Build Pipeline</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECE8E1] text-[#736E67]">
                            {message.buildSteps.filter((s) => s.step === 'done' || s.message.startsWith('✓')).length}
                            /{message.buildSteps.length} items
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-0.5">
                          {message.buildSteps.map((step) => {
                            const isDone = step.step === 'done' || step.message.startsWith('✓');
                            const isRepair = step.step === 'repairing';
                            const isChecking = step.step === 'checking';
                            const isPlanned = step.step === 'planned';
                            return (
                              <div
                                key={step.id}
                                className="flex items-start gap-2 text-[11px] leading-tight"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : isRepair ? (
                                  <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                ) : isChecking ? (
                                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                                ) : isPlanned ? (
                                  <ClipboardList className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Loader2 className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5 animate-spin" />
                                )}
                                <span
                                  className={`font-mono ${
                                    isDone
                                      ? 'text-[#2D2A26] font-medium'
                                      : isRepair
                                      ? 'text-amber-800 font-medium'
                                      : isPlanned
                                      ? 'text-indigo-900 font-medium'
                                      : 'text-[#635E57]'
                                  }`}
                                >
                                  {step.message}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Researcher Mode Interactive Citation Chips */}
                    {message.citations && message.citations.length > 0 && (
                      <div
                        id={`citation-chips-${message.id}`}
                        className="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
                          <Globe className="w-3 h-3 text-emerald-700" />
                          <span>Live Verified Sources & Citations:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {message.citations.map((cite) => (
                            <button
                              key={cite.id}
                              id={`citation-chip-${cite.id}`}
                              type="button"
                              onClick={() => setActiveCitationModal(cite)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FBF9F5] border border-emerald-300 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-2xs group"
                              title={`Click to preview: ${cite.title}`}
                            >
                              <span>[{cite.sourceName}]</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main Markdown Content */}
                    <div className="text-sm text-[#1F1E1D] leading-relaxed space-y-3 prose prose-neutral max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');

                            if (match) {
                              const detected = detectFileType(match[1], codeString);
                              const lines = codeString.split('\n');

                              return (
                                <div className="my-3 rounded-xl border border-[#333333] overflow-hidden bg-[#1E1E1E] text-[#D4D4D4] shadow-sm">
                                  {/* Code Block Header with File Type Detection & Open in Canvas / View Diff */}
                                  <div className="px-3 py-1.5 bg-[#252526] border-b border-[#333333] flex items-center justify-between text-xs text-[#CCCCCC]">
                                    <div className="flex items-center gap-2">
                                      <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="font-mono text-[11px] font-semibold text-[#E0E0E0]">
                                        {detected.name}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#333333] text-[#A0A0A0] font-mono">
                                        {detected.extension || `.${match[1]}`}
                                      </span>
                                      <span className="text-[10px] text-[#888888] font-mono hidden sm:inline">
                                        {detected.indentation.indentGuide}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {/* Developer Mode: Open in Canvas / View Diff Button */}
                                      {currentMode === 'developer' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onOpenInCanvas(
                                              message.diffData || {
                                                filename: `snippet${detected.extension || '.py'}`,
                                                language: detected.id,
                                                explanation: `Code snippet (${detected.name}) opened in Diff Canvas.`,
                                                additions: lines.length,
                                                deletions: 0,
                                                originalCode: codeString,
                                                fixedCode: codeString,
                                              },
                                              codeString
                                            )
                                          }
                                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium flex items-center gap-1 transition-colors shadow-2xs"
                                          title="Inspect in Code Diff Canvas with syntax highlighting and indentation rules"
                                        >
                                          <Code2 className="w-3 h-3" />
                                          <span>Open in Canvas / Diff</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(codeString, `code-${message.id}`)}
                                        className="px-2 py-0.5 rounded hover:bg-[#3E3E42] text-[11px] text-[#AAAAAA] hover:text-white flex items-center gap-1"
                                      >
                                        {copiedId === `code-${message.id}` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  {/* Code Body with Syntax Highlighting and Indentation Rules */}
                                  <pre
                                    className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed bg-[#1E1E1E]"
                                    style={{
                                      tabSize: detected.indentation.tabSize,
                                      MozTabSize: detected.indentation.tabSize,
                                    }}
                                  >
                                    <code>
                                      {lines.map((line, lIdx) => {
                                        const tokens = tokenizeDiffLine(line, detected.prismLanguage);
                                        return (
                                          <div key={lIdx} className="leading-5">
                                            {tokens.length > 0 ? (
                                              tokens.map((tok, tIdx) => (
                                                <span key={tIdx} style={{ color: tok.colorHex || '#D4D4D4' }}>
                                                  {tok.content}
                                                </span>
                                              ))
                                            ) : (
                                              <span>&nbsp;</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }

                            return (
                              <code
                                className="px-1.5 py-0.5 rounded bg-[#ECE8E1] text-[#B45309] font-mono text-[12px]"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* Developer Mode Quick Diff Banner at bottom of message if present */}
                    {message.diffData && currentMode === 'developer' && (
                      <div
                        id={`diff-callout-${message.id}`}
                        className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-blue-700 shrink-0" />
                          <div>
                            <span className="font-semibold text-blue-950">
                              Side-by-side Diff Ready: {message.diffData.filename}
                            </span>
                            <span className="ml-2 text-[10px] text-emerald-700 font-medium">
                              +{message.diffData.additions || 12}
                            </span>
                            <span className="ml-1 text-[10px] text-red-700 font-medium">
                              -{message.diffData.deletions || 5}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenInCanvas(message.diffData)}
                          className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors shadow-2xs shrink-0"
                        >
                          View in Canvas &rarr;
                        </button>
                      </div>
                    )}

                    {/* Web App Build & Interactive Sandbox Banner */}
                    {message.webappBuild && (
                      <div
                        id={`webapp-build-card-${message.id}`}
                        className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                          message.webappBuild.buildStatus === 'failed'
                            ? 'border-red-300 bg-red-50/70 text-red-950'
                            : 'border-emerald-300 bg-emerald-50/70 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                message.webappBuild.buildStatus === 'failed'
                                  ? 'bg-red-500'
                                  : 'bg-emerald-500 animate-pulse'
                              }`}
                            />
                            <span className="font-bold">
                              {message.webappBuild.buildStatus === 'failed'
                                ? `Build Failed: ${message.webappBuild.appName}`
                                : `Compiled: ${message.webappBuild.appName}`}
                            </span>

                            {message.webappBuild.stack && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-semibold text-[10px] uppercase">
                                {message.webappBuild.stack}
                              </span>
                            )}

                            {typeof message.webappBuild.testsPassed === 'number' &&
                              typeof message.webappBuild.testsTotal === 'number' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-semibold text-[10px]">
                                  {message.webappBuild.testsPassed}/{message.webappBuild.testsTotal} Tests Passed
                                </span>
                              )}

                            {typeof message.webappBuild.bugsFound === 'number' && (
                              <span className="px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-800 font-semibold text-[10px]">
                                {message.webappBuild.bugsFound} Bugs Detected
                              </span>
                            )}
                          </div>

                          {onOpenWebPreview && message.webappBuild.buildStatus !== 'failed' && (
                            <button
                              type="button"
                              onClick={() => onOpenWebPreview(message.webappBuild?.appName)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
                            >
                              <span>Open Web Preview</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {message.webappBuild.verificationLog && message.webappBuild.verificationLog.length > 0 && (
                          <div className="bg-neutral-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded-lg space-y-1">
                            {message.webappBuild.verificationLog.map((log, idx) => (
                              <div
                                key={idx}
                                className={log.includes('FAIL') || log.includes('error') ? 'text-red-400' : ''}
                              >
                                {log}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live typing indicator while streaming */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-[#736E67] max-w-3xl mx-auto pl-1">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            <span className="italic">{selectedModel.name} is generating tokens...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Dock - Gemini Chatbot / SMS Pill */}
      <div
        id="chat-input-dock"
        className="px-3 sm:px-4 py-2 bg-[#FBF9F5] border-t border-[#E5E2DC]"
      >
        <div className="max-w-2xl mx-auto space-y-1.5">
          {/* Pending Attachments Bar */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#F0ECE4] border border-[#DDD7CD] text-xs">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#55504A] mr-1">
                <Paperclip className="w-3 h-3 text-blue-600" />
                <span>Attached Files ({pendingAttachments.length}):</span>
              </div>
              {pendingAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#DDD7CD] text-[11px] text-[#1F1E1D] shadow-2xs font-mono max-w-[200px]"
                >
                  <Github className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span className="truncate" title={att.path || att.name}>
                    {att.path?.split('/').pop() || att.name}
                  </span>
                  {att.size ? (
                    <span className="text-[9px] text-[#858079] shrink-0">
                      {(att.size / 1024).toFixed(1)}k
                    </span>
                  ) : null}
                  {onRemoveAttachment && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(idx)}
                      className="text-[#858079] hover:text-red-600 cursor-pointer ml-0.5"
                      title="Remove file"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-full border border-[#E5E2DC] bg-[#FDFBF7] shadow-xs focus-within:border-[#A8A298] focus-within:ring-2 focus-within:ring-[#B8B2A6]/20 transition-all"
          >
            {/* Left Mode / Sparkle Pill with On-The-Fly Mode Switcher */}
            {onChangeMode ? (
              <button
                type="button"
                id="chat-mode-quick-switch-btn"
                onClick={() => {
                  const nextMode: WorkMode =
                    currentMode === 'developer'
                      ? 'researcher'
                      : currentMode === 'researcher'
                      ? 'general'
                      : 'developer';
                  onChangeMode(nextMode);
                }}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#F0ECE4] hover:bg-[#E5E0D8] text-[#4D4943] transition-colors cursor-pointer select-none"
                title={`Active: ${currentMode.toUpperCase()} mode. Click to switch to ${
                  currentMode === 'developer'
                    ? 'RESEARCHER'
                    : currentMode === 'researcher'
                    ? 'GENERAL'
                    : 'DEVELOPER'
                } mode on the fly`}
              >
                {currentMode === 'developer' && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
                {currentMode === 'researcher' && <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                {currentMode === 'general' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            ) : (
              <div
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#F0ECE4] text-[#4D4943] select-none"
                title={`Mode: ${currentMode} · ${selectedModel.name}`}
              >
                {currentMode === 'developer' && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
                {currentMode === 'researcher' && <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                {currentMode === 'general' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
              </div>
            )}

            {/* GitHub Repo Context Attachment Button */}
            {onOpenRepoBrowser && (
              <button
                type="button"
                id="chat-attach-repo-btn"
                onClick={onOpenRepoBrowser}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[#66615B] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
                title="Connect repository and attach files into chat context"
                aria-label="Connect GitHub Repository"
              >
                <Github className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Inline Textarea */}
            <textarea
              ref={textareaRef}
              id="chat-prompt-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingAttachments.length > 0
                  ? `Ask Gemini about the ${pendingAttachments.length} attached files...`
                  : currentMode === 'developer'
                  ? 'Ask Gemini to write or debug code (or click GitHub to attach repo files)...'
                  : currentMode === 'researcher'
                  ? 'Ask Gemini to research or analyze data...'
                  : 'Ask Gemini anything...'
              }
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-sm text-[#1F1E1D] placeholder-[#9E9890] resize-none outline-hidden font-normal py-0.5 px-2 min-h-[24px] max-h-[110px] leading-relaxed block"
            />

            {/* Right Action Button (SMS Circle) */}
            <div className="shrink-0 flex items-center">
              {isStreaming ? (
                <button
                  id="stop-streaming-btn"
                  type="button"
                  onClick={onStopStreaming}
                  className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Stop generating"
                  aria-label="Stop generation"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  id="send-prompt-btn"
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-7 h-7 rounded-full bg-[#1F1E1D] hover:bg-[#3D3A37] disabled:opacity-25 disabled:hover:bg-[#1F1E1D] text-[#FBF9F5] flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <Send className="w-3 h-3 ml-0.5" />
                </button>
              )}
            </div>
          </form>

          {/* Minimal Status Caption */}
          <div className="flex items-center justify-between px-3 pt-1 text-[10px] text-[#A39E96]">
            <span className="truncate">
              {selectedModel.name}
              {selectedModel.costPerQueryCredits > 0 && ` · ${selectedModel.costPerQueryCredits} cr`}
              {pendingAttachments.length > 0 && ` · ${pendingAttachments.length} repo files attached`}
            </span>
            <div className="flex items-center gap-2">
              {onOpenRepoBrowser && (
                <button
                  type="button"
                  onClick={onOpenRepoBrowser}
                  className="hover:text-[#1F1E1D] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Github className="w-2.5 h-2.5" />
                  <span>Connect repo</span>
                </button>
              )}
              <span className="hidden sm:inline">Shift+Enter for newline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
