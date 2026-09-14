export type WorkMode = 'developer' | 'researcher' | 'general';

export type ModelTier = 'free' | 'pro' | 'vault';

export type ReasoningEffort = 'Low' | 'Medium' | 'Max';

export interface ModelInfo {
  id: string;
  name: string;
  tier: ModelTier;
  provider: string;
  contextWindow: string;
  supportsThinking: boolean;
  costPerQueryCredits: number;
  badge?: string;
  description: string;
}

export interface Citation {
  id: string;
  sourceName?: string;
  title: string;
  url: string;
  snippet: string;
  reliabilityScore?: number;
  source?: string;
  reliability?: string;
}

export interface DiffData {
  originalCode: string;
  fixedCode: string;
  filename: string;
  language: string;
  explanation?: string;
  additions?: number;
  deletions?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: WorkMode;
  modelId: string;
  citations?: Citation[];
  diffData?: DiffData;
  isThinking?: boolean;
  thinkingContent?: string;
  reasoningEffort?: ReasoningEffort;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostCredits: number;
  };
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: WorkMode;
  modelId: string;
  isPinned?: boolean;
  messages: ChatMessage[];
  snippet?: string;
}

export interface WorkspaceParams {
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  groundingEnabled: boolean;
}

export interface UserWallet {
  credits: number;
  plan: 'Starter' | 'Pro Builder' | 'Free Tier' | 'Credit Vault Only';
  activeUntil?: string;
  totalTokensUsed: number;
  planTokenLimit: number;
}

export type PaymentGateway = 'esewa' | 'khalti';

export type WorkContext =
  | 'student'
  | 'researcher'
  | 'dev'
  | 'entrepreneur'
  | 'custom'
  | 'Full-Stack Developer'
  | 'AI / ML Researcher'
  | 'University Student (TU / KU / IOE)'
  | 'Loksewa / Civil Prep'
  | 'Tech Freelancer / Agency Owner'
  | 'General Enthusiast';

export type NepaliTonePreference =
  | 'formal_english_nepali_nuance'
  | 'pure_nepali_devanagari'
  | 'academic_technical_english';

export type OutputLanguageTone =
  | 'Standard English'
  | 'Nepali (Devanagari)'
  | 'Romanized Nepali (Conversational)'
  | 'Bilingual (English with Nepali explanations)';

export type ExecutionEngine =
  | 'pyodide_wasm'
  | 'sandboxed_cloud'
  | 'wasm'
  | 'cloud_sandbox';

export type SearchProvider = 'tavily' | 'serper_searxng';

export type CitationDensity = 'inline_brackets' | 'footnote_bibliography';

export type WorkspaceTheme = 'warm_stone' | 'true_dark' | 'system';

export type ReadingTypography = 'inter' | 'jetbrains_mono' | 'opendyslexic';

export interface UserProfileSettings {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  workContext: WorkContext;
  customWorkContextTitle?: string;
  institutionOrCompany?: string;
  githubUsername?: string;
  globalSystemInstruction: string;
  nepaliTonePreference: NepaliTonePreference;
  outputLanguageTone: OutputLanguageTone;
  codeExecutionEngine: ExecutionEngine;
  executionEngine?: ExecutionEngine;
  sandboxNetworkAccess: boolean;
  allowSandboxPipInstall?: boolean;
  defaultPushBranch?: string;
  autoGeneratePrOnBugFix?: boolean;
  searchProvider: SearchProvider;
  nepaliGroundingBias: boolean;
  citationDensity: CitationDensity;
  theme: WorkspaceTheme;
  typography: ReadingTypography;
  autoOpenDiffOnLargeChanges: boolean;
  displayInlineRunCodeButton: boolean;
  excludeFromModelTraining: boolean;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  date: string;
  gateway: 'eSewa' | 'Khalti' | 'Fonepay';
  amountNpr: number;
  creditsAdded: number;
  status: 'Completed' | 'Pending' | 'Failed';
  tierPlan: 'Starter' | 'Pro Builder';
  invoiceRef: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ipCity: string;
  lastActive: string;
  isCurrent: boolean;
}
