export type WorkMode = 'developer' | 'researcher' | 'general';

export type ModelTier = 'free' | 'lite' | 'plus' | 'pro' | 'max' | 'pro_max' | 'vault';

export type ReasoningEffort = 'Low' | 'Medium' | 'High' | 'Extra' | 'Max';

export type ResearchTier = 'low' | 'medium' | 'high' | 'extra' | 'max';

export interface ResearchTierMeta {
  id: ResearchTier;
  label: string;
  name: string;
  multiplier: string;
  multiplierVal: number;
  tokens: number;
  warningText: string;
  credits: number;
  badge: string;
  color: string;
}

export const RESEARCH_TIERS_META: Record<ResearchTier, ResearchTierMeta> = {
  low: {
    id: 'low',
    label: 'Low',
    name: 'Fast Scan',
    multiplier: '1x tokens',
    multiplierVal: 1,
    tokens: 2048,
    warningText: 'Standard baseline token consumption (2,048 tokens)',
    credits: 1,
    badge: '1x Tokens',
    color: 'emerald',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    name: 'In-Depth Analysis',
    multiplier: '2x tokens',
    multiplierVal: 2,
    tokens: 8192,
    warningText: 'Uses 2x more tokens than Low tier (8,192 tokens)',
    credits: 3,
    badge: '⚠️ 2x Tokens',
    color: 'blue',
  },
  high: {
    id: 'high',
    label: 'High',
    name: 'Comprehensive Due Diligence',
    multiplier: '4x tokens',
    multiplierVal: 4,
    tokens: 8192,
    warningText: 'Uses 4x more tokens than Low tier with multi-pass search (8,192 tokens)',
    credits: 8,
    badge: '⚠️ 4x Tokens',
    color: 'amber',
  },
  extra: {
    id: 'extra',
    label: 'Extra',
    name: 'Intensive Deep Search',
    multiplier: '6x tokens',
    multiplierVal: 6,
    tokens: 10240,
    warningText: 'Uses 6x more tokens than Low tier with deep cross-verification (10,240 tokens)',
    credits: 14,
    badge: '⚠️ 6x Tokens',
    color: 'orange',
  },
  max: {
    id: 'max',
    label: 'Max',
    name: 'Exhaustive Audit Dossier',
    multiplier: '10x tokens',
    multiplierVal: 10,
    tokens: 12288,
    warningText: 'Uses 10x more tokens than Low tier with exhaustive sandbox audit (12,288 tokens)',
    credits: 20,
    badge: '🚨 10x Tokens',
    color: 'red',
  },
};

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
  inputPrice?: string;
  outputPrice?: string;
  differentiators?: string;
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

export type WebBuildStack = 'html-css-js' | 'react' | 'vue' | 'nextjs';
export type MobileBuildStack = 'react-native' | 'flutter';
export type BuildStack = WebBuildStack | MobileBuildStack;

export interface WebappBuildData {
  appName: string;
  html: string;
  buildStatus: 'success' | 'building' | 'failed';
  stack?: BuildStack;
  testsPassed?: number;
  testsTotal?: number;
  bugsFound?: number;
  features?: string[];
  rawCodeRequested?: boolean;
  verificationLog?: string[];
  attemptsMade?: number;
  repairIterations?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: WorkMode;
  modelId: string;
  routedModel?: string;
  providerName?: string;
  citations?: Citation[];
  diffData?: DiffData;
  webappBuild?: WebappBuildData;
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
