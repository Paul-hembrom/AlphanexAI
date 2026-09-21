import { ModelInfo, WorkMode, WorkspaceParams, DiffData } from './types';

export const AVAILABLE_MODELS: ModelInfo[] = [
  // ==========================================
  // TIER: FREE (3 Models)
  // ==========================================
  {
    id: 'qwen-3-8-flash',
    name: 'Qwen 3.8 Flash',
    tier: 'free',
    provider: 'Alibaba Cloud / Qwen',
    contextWindow: '262k tokens',
    supportsThinking: true,
    costPerQueryCredits: 0,
    badge: 'Hybrid Thinking',
    inputPrice: '$0.03',
    outputPrice: '$0.13',
    differentiators: 'Native hybrid thinking up to 262K tokens; built-in web search/code tools; extreme budget handling.',
    description: 'Native hybrid thinking up to 262K tokens; built-in web search/code tools; extreme budget handling.',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    tier: 'free',
    provider: 'DeepSeek',
    contextWindow: '128k tokens',
    supportsThinking: false,
    costPerQueryCredits: 0,
    badge: 'Low-Latency Asymmetric',
    inputPrice: '$0.05',
    outputPrice: '$0.14',
    differentiators: 'Low-latency asymmetric architecture; high-throughput pipelines; great for basic automation loops.',
    description: 'Low-latency asymmetric architecture; high-throughput pipelines; great for basic automation loops.',
  },
  {
    id: 'inclusionai/ling-3.0-flash-vl:free',
    name: 'InclusionAI Ling 3.0 Flash VL',
    tier: 'free',
    provider: 'Inclusion AI',
    contextWindow: '128k tokens',
    supportsThinking: false,
    costPerQueryCredits: 0,
    badge: 'Vision-Language Free',
    inputPrice: '$0.00',
    outputPrice: '$0.00',
    differentiators: 'Native multimodal vision-language (VL) model; fast visual document parsing, UI & chart recognition, and zero-cost reasoning.',
    description: 'Native multimodal vision-language (VL) model; fast visual document parsing, UI & chart recognition, and zero-cost reasoning.',
  },
  {
    id: 'poolside/laguna-s-2.1:free',
    name: 'Poolside Laguna S 2.1',
    tier: 'free',
    provider: 'Poolside AI',
    contextWindow: '128k tokens',
    supportsThinking: true,
    costPerQueryCredits: 0,
    badge: 'Agentic Studio Builder',
    inputPrice: '$0.00',
    outputPrice: '$0.00',
    differentiators: 'Autonomous agentic builder model; compiles, tests, verifies, and executes web sandboxes with zero-cost reasoning.',
    description: 'Autonomous agentic builder model; compiles, tests, verifies, and executes web sandboxes with zero-cost reasoning.',
  },

  // ==========================================
  // TIER: LITE (3 Models)
  // ==========================================
  {
    id: 'laguna-s-2-1',
    name: 'Laguna S 2.1',
    tier: 'lite',
    provider: 'Laguna AI',
    contextWindow: '128k tokens',
    supportsThinking: true,
    costPerQueryCredits: 1,
    badge: 'High Throughput',
    inputPrice: '$0.09',
    outputPrice: '$0.18',
    differentiators: 'Ultra-efficient architecture ($0.09 / $0.18 per 1M tokens); fast low-latency streaming and high-throughput agent workflows.',
    description: 'Ultra-efficient architecture ($0.09 / $0.18 per 1M tokens); fast low-latency streaming and high-throughput agent workflows.',
  },
  {
    id: 'glm-5-3-flash',
    name: 'GLM 5.3 Flash',
    tier: 'lite',
    provider: 'Zhipu AI / GLM',
    contextWindow: '128k tokens',
    supportsThinking: false,
    costPerQueryCredits: 1,
    badge: 'Multimodal Agent',
    inputPrice: '$0.15',
    outputPrice: '$0.50',
    differentiators: 'Natively multimodal (text/image); exceptional agentic scores; hybrid sparse/linear attention for massive document scaling.',
    description: 'Natively multimodal (text/image); exceptional agentic scores; hybrid sparse/linear attention for massive document scaling.',
  },
  {
    id: 'deepseek-v4-1-flash',
    name: 'DeepSeek V4.1 Flash',
    tier: 'lite',
    provider: 'DeepSeek',
    contextWindow: '128k tokens',
    supportsThinking: true,
    costPerQueryCredits: 1,
    badge: '552B MoE',
    inputPrice: '$0.30 (Peak) / $0.15 (Off-Peak)',
    outputPrice: '$1.20 (Peak) / $0.60 (Off-Peak)',
    differentiators: '552B Mixture-of-Experts (MoE); outscores larger flagships on dynamic coding benchmarks & tool-use loops.',
    description: '552B Mixture-of-Experts (MoE); outscores larger flagships on dynamic coding benchmarks & tool-use loops.',
  },

  // ==========================================
  // TIER: PLUS
  // ==========================================
  {
    id: 'gemini-3-8-flash',
    name: 'Gemini 3.8 Flash',
    tier: 'plus',
    provider: 'Google AI / DeepMind',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 2,
    badge: '290+ t/s (~1M Context)',
    inputPrice: '$0.75',
    outputPrice: '$3.75',
    differentiators: 'Blazing fast raw output speeds (~290+ t/s); massive ~1M context window; native multimodal audio/video processing.',
    description: 'Blazing fast raw output speeds (~290+ t/s); massive ~1M context window; native multimodal audio/video processing.',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    tier: 'plus',
    provider: 'DeepSeek',
    contextWindow: '256k tokens',
    supportsThinking: true,
    costPerQueryCredits: 3,
    badge: '1.6T MoE Behemoth',
    inputPrice: '$1.32 (Peak) / $0.66 (Off-Peak)',
    outputPrice: '$3.96 (Peak) / $1.98 (Off-Peak)',
    differentiators: '1.6 Trillion parameter behemoth; deep multi-step complex logic synthesis & full-codebase reasoning.',
    description: '1.6 Trillion parameter behemoth; deep multi-step complex logic synthesis & full-codebase reasoning.',
  },
  {
    id: 'gpt-5-6-sol',
    name: 'GPT-5.6 Sol',
    tier: 'plus',
    provider: 'OpenAI',
    contextWindow: '256k tokens',
    supportsThinking: true,
    costPerQueryCredits: 5,
    badge: 'High-Accuracy Reasoning',
    inputPrice: '$4.00',
    outputPrice: '$20.00',
    differentiators: 'High-accuracy reasoning model; native prompt caching discounts; tailored for complex multi-step tasks.',
    description: 'High-accuracy reasoning model; native prompt caching discounts; tailored for complex multi-step tasks.',
  },
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    tier: 'plus',
    provider: 'Moonshot AI',
    contextWindow: '2M tokens',
    supportsThinking: true,
    costPerQueryCredits: 4,
    badge: 'Long-Context Champion',
    inputPrice: '$3.00',
    outputPrice: '$15.00',
    differentiators: 'Long-context memory champion; superb at structural multi-file document extraction and needle-in-a-haystack tasks.',
    description: 'Long-context memory champion; superb at structural multi-file document extraction and needle-in-a-haystack tasks.',
  },

  // ==========================================
  // TIER: PRO (Elite Native Access - Heavy Workspace)
  // ==========================================
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    tier: 'pro',
    provider: 'Anthropic Frontier',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 12,
    badge: 'Intelligence Anchor',
    inputPrice: '$10.00',
    outputPrice: '$30.00',
    differentiators: 'Intelligence Anchor: Premier deep multi-turn conceptual intelligence, advanced mathematical reasoning, and complex enterprise systems architecture.',
    description: 'Intelligence Anchor: Premier deep multi-turn conceptual intelligence, advanced mathematical reasoning, and complex enterprise systems architecture.',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    tier: 'pro',
    provider: 'Anthropic',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 6,
    badge: 'Elite Coding & Agentic',
    inputPrice: '$3.00',
    outputPrice: '$15.00',
    differentiators: 'Precision software refactoring, rapid full-codebase reasoning, and autonomous tool invocation with high throughput.',
    description: 'Precision software refactoring, rapid full-codebase reasoning, and autonomous tool invocation with high throughput.',
  },
  {
    id: 'glm-5-2',
    name: 'GLM 5.2',
    tier: 'pro',
    provider: 'Zhipu AI / GLM',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 2,
    badge: '1M Context Anchor',
    inputPrice: '$0.30',
    outputPrice: '$1.20',
    differentiators: 'Workflow Anchor: Massive 1M context project execution at ultra-low background token cost ($0.30 / $1.20 per 1M). Exceptional agentic tool orchestration.',
    description: 'Workflow Anchor: Massive 1M context project execution at ultra-low background token cost ($0.30 / $1.20 per 1M). Exceptional agentic tool orchestration.',
  },
  {
    id: 'minimax-m3',
    name: 'MiniMax M3',
    tier: 'pro',
    provider: 'MiniMax AI',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 2,
    badge: 'Production Agent',
    inputPrice: '$0.30',
    outputPrice: '$1.20',
    differentiators: 'Workflow Anchor: Production agent powerhouse with 1M native context window; lightning-fast execution for large document syntheses and code repos.',
    description: 'Workflow Anchor: Production agent powerhouse with 1M native context window; lightning-fast execution for large document syntheses and code repos.',
  },

  // ==========================================
  // TIER: MAX (Gatekeeper Frontier - Requires Active Pro Sub)
  // Dual-Gate: Weekly Rolling Caps (Option A) or Pay-As-You-Go API Top-Up (Option B)
  // ==========================================
  {
    id: 'claude-fable-5-1',
    name: 'Claude Fable 5.1',
    tier: 'max',
    provider: 'Anthropic Frontier',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 25,
    badge: 'Gatekeeper Frontier',
    inputPrice: 'Premium Usage (Pay-As-You-Go)',
    outputPrice: 'Premium Usage (Pay-As-You-Go)',
    differentiators: 'Gatekeeper Tier (Requires Active Pro Sub): Anthropic flagship with structural prose perfection, deep reasoning verifiers, and extreme alignment.',
    description: 'Gatekeeper Tier (Requires Active Pro Sub): Anthropic flagship with structural prose perfection, deep reasoning verifiers, and extreme alignment.',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    tier: 'max',
    provider: 'OpenAI Frontier',
    contextWindow: '1M tokens',
    supportsThinking: true,
    costPerQueryCredits: 25,
    badge: 'Gatekeeper Frontier',
    inputPrice: 'Premium Usage (Pay-As-You-Go)',
    outputPrice: 'Premium Usage (Pay-As-You-Go)',
    differentiators: 'Gatekeeper Tier (Requires Active Pro Sub): Frontier model achieving tasks in fewest total tokens. 50 msgs/wk allowance or direct token wallet drawdown.',
    description: 'Gatekeeper Tier (Requires Active Pro Sub): Frontier model achieving tasks in fewest total tokens. 50 msgs/wk allowance or direct token wallet drawdown.',
  },
];

export const DEFAULT_SYSTEM_INSTRUCTIONS: Record<WorkMode, string> = {
  developer: `You are a Principal Software Engineer and Polyglot Systems Architect at Alphanex AI Studio.
- Write modern, production-grade, bug-free code.
- Prioritize clean architecture, error handling, and performance.
- When fixing code, provide the exact changes suitable for side-by-side diffing and review.
- Focus on frameworks widely used in Nepal's tech ecosystem (FastAPI, Next.js, Node.js, Django, PostgreSQL, Redis, and eSewa/Khalti SDKs).`,

  researcher: `You are an Academic Research Fellow and Senior Tech Analyst specializing in South Asia & Nepal's technological development, data infrastructure, and regulatory frameworks.
- Ground every factual assertion with credible, verifiable sources.
- Provide source citations formatted with clear source badges (e.g. [OnlineKhabar], [Kantipur], [Arxiv], [NREN], [Nepal Rastra Bank]).
- Evaluate technological and socio-economic implications with academic rigor.`,

  general: `You are Alphanex AI Studio's intelligent reasoning polymath assistant.
- Provide direct, thoughtful, and articulate responses with warm minimalist tone.
- Break complex subjects into accessible, structured explanations.
- Adapt tone dynamically to technical inquiries, conceptual drafting, or strategic planning.`,
};

export const INITIAL_WORKSPACE_PARAMS: WorkspaceParams = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS.developer,
  temperature: 0.7,
  maxOutputTokens: 8192,
  topP: 0.95,
  groundingEnabled: false,
};

export const SAMPLE_PROMPTS_BY_MODE: Record<WorkMode, { title: string; prompt: string; description: string }[]> = {
  developer: [
    {
      title: 'Build a Basic E-Commerce Webapp',
      prompt: 'Build a basic ecommerce webapp or website with an interactive product catalog, shopping bag drawer, search filter, and checkout modal.',
      description: 'Studio compiler, automated tests & live sandbox preview',
    },
    {
      title: 'Fix eSewa Payment Callback Signature Verification',
      prompt: 'Review and fix this FastAPI eSewa v2 signature verification code where HMAC-SHA256 hash mismatch is failing the payment callback verification.',
      description: 'HMAC-SHA256 signature debugging & diff view',
    },
    {
      title: 'Benchmark Nepali Unicode Normalizer in Python',
      prompt: 'Write an optimized Devanagari Unicode normalizer in Python that fixes zero-width joiners (ZWJ) and Chandrabindu glitches for Nepali NLP pipelines.',
      description: 'Devanagari text cleaning & Pyodide execution',
    },
    {
      title: 'Async Redis Connection Pool for Kathmandu Cloud',
      prompt: 'Design a resilient async Redis connection pool with exponential backoff and circuit breaker for a high-traffic e-commerce backend in Nepal.',
      description: 'Distributed cache architecture & retry logic',
    },
  ],
  researcher: [
    {
      title: 'Status of Nepal AI Policy & National Data Center 2026',
      prompt: 'Analyze Nepal’s current draft National AI Strategy, citing initiatives from the Ministry of Communication and Information Technology (MoCIT) and NREN.',
      description: 'Policy analysis with live web grounding',
    },
    {
      title: 'Digital Payments Growth: Fonepay, eSewa & Khalti Metrics',
      prompt: 'Synthesize the latest Nepal Rastra Bank (NRB) payment systems indicators for digital wallet transactions vs QR code adoption in FY 2025/2026.',
      description: 'Macro-economic & fintech transaction stats',
    },
    {
      title: 'Himalayan Climate Telemetry & Open Data Repositories',
      prompt: 'Survey peer-reviewed remote sensing studies on glacial lake outburst flood (GLOF) monitoring in the Koshi River Basin using satellite open data.',
      description: 'Academic synthesis with Arxiv & ICIMOD citations',
    },
  ],
  general: [
    {
      title: 'Draft a Tech Startup Pitch for Nepal Innovation Challenge',
      prompt: 'Help me draft an executive summary for a Kathmandu-based agri-tech startup connecting apple farmers in Mustang with high-yield wholesale markets.',
      description: 'Crisp venture drafting & market analysis',
    },
    {
      title: 'Compare Reasoning Models for Research Workflows',
      prompt: 'Explain the technical difference between standard autoregressive generation vs test-time compute scaling (thinking tokens) in modern frontier models.',
      description: 'Deep dive into test-time compute & chains-of-thought',
    },
    {
      title: 'Career Roadmap: Transitioning to ML Engineering in Nepal',
      prompt: 'Outline a realistic 6-month study roadmap for a mid-level web developer in Nepal aiming to transition into open-source AI and fine-tuning roles.',
      description: 'Structured milestones & recommended resources',
    },
  ],
};

export const INITIAL_DIFF_SAMPLE: DiffData = {
  filename: 'payment_gateway/esewa_v2.py',
  language: 'python',
  explanation: 'Fixed HMAC-SHA256 signature generation: replaced plaintext key encoding with base64 secret decoding, and corrected message string parameter ordering according to eSewa EPAY v2.0 specification.',
  additions: 12,
  deletions: 5,
  originalCode: `import hmac
import hashlib

def verify_esewa_signature(total_amount: str, transaction_uuid: str, product_code: str, secret_key: str, received_signature: str) -> bool:
    # BUG: eSewa v2 requires format "total_amount=...,transaction_uuid=...,product_code=..."
    # The current message concatenates without delimiters
    message = f"{total_amount}{transaction_uuid}{product_code}"
    
    # BUG: secret_key was encoded directly instead of signing raw bytes
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature == received_signature`,
  fixedCode: `import hmac
import hashlib
import base64

def verify_esewa_signature(total_amount: str, transaction_uuid: str, product_code: str, secret_key: str, received_signature: str) -> bool:
    """
    Verify eSewa EPAY v2.0 callback signature using HMAC-SHA256 and Base64 digest.
    Standard message pattern: total_amount={amount},transaction_uuid={uuid},product_code={code}
    """
    # Fix 1: Properly delimit key-value pairs as required by eSewa EPAY v2
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    
    # Fix 2: Calculate HMAC-SHA256 and base64-encode the raw binary digest
    signature_bytes = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    computed_signature = base64.b64encode(signature_bytes).decode('utf-8')
    
    # Fix 3: Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(computed_signature, received_signature)`,
};

export const SAMPLE_PYTHON_SCRIPT = `# Alphanex AI Studio — In-Browser Python Terminal (Pyodide WASM)
# Example: Nepali Currency Formatter & Fintech Tax Computation

def format_nepali_currency(amount: float) -> str:
    """Format numbers into South Asian / Nepali numbering system (lakhs & crores)"""
    s = f"{int(amount)}"
    if len(s) <= 3:
        formatted = s
    else:
        last_three = s[-3:]
        remaining = s[:-3]
        groups = []
        while remaining:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        formatted = ",".join(groups) + "," + last_three
    
    cents = f"{amount:.2f}".split(".")[1]
    return f"NPR {formatted}.{cents}"

# Simulation data for developer SaaS in Nepal
monthly_revenue = 1458920.50
corporate_tax_rate = 0.20 # 20% standard IT export incentive
net_retained = monthly_revenue * (1 - corporate_tax_rate)

print("--- NEPAL FINTECH METRICS ---")
print(f"Gross Revenue: {format_nepali_currency(monthly_revenue)}")
print(f"Tax Provision: {format_nepali_currency(monthly_revenue * corporate_tax_rate)}")
print(f"Net Retained:  {format_nepali_currency(net_retained)}")
print("Status: All checks passed. Ready for eSewa / Khalti settlement batch.")
`;
