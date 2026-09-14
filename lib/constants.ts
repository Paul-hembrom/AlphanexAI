import { ModelInfo, WorkMode, WorkspaceParams, DiffData } from './types';

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Free Models
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    tier: 'free',
    provider: 'DeepSeek',
    contextWindow: '64k tokens',
    supportsThinking: false,
    costPerQueryCredits: 0,
    badge: 'Popular Free',
    description: 'High throughput MoE architecture ideal for rapid iteration & general coding tasks.',
  },
  {
    id: 'qwen-2.5-coder',
    name: 'Qwen 2.5 Coder 32B',
    tier: 'free',
    provider: 'Alibaba Cloud',
    contextWindow: '32k tokens',
    supportsThinking: false,
    costPerQueryCredits: 0,
    badge: 'Code Focused',
    description: 'Specialized coding model with benchmark-topping syntax and algorithmic problem-solving.',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    tier: 'free',
    provider: 'Meta',
    contextWindow: '128k tokens',
    supportsThinking: false,
    costPerQueryCredits: 0,
    badge: 'High Context',
    description: 'General intelligence workhorse with strong analytical understanding and multilingual breadth.',
  },

  // Pro Subscription Models
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    tier: 'pro',
    provider: 'Anthropic',
    contextWindow: '200k tokens',
    supportsThinking: true,
    costPerQueryCredits: 5,
    badge: 'Hybrid Reasoning',
    description: 'Next-generation reasoning powerhouse with adjustable thinking tokens and nuanced code crafting.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    tier: 'pro',
    provider: 'OpenAI',
    contextWindow: '128k tokens',
    supportsThinking: false,
    costPerQueryCredits: 4,
    badge: 'Omni Versatile',
    description: 'Blazing-fast multimodal intelligence with top-tier synthesis and system architecture generation.',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1',
    tier: 'pro',
    provider: 'DeepSeek',
    contextWindow: '64k tokens',
    supportsThinking: true,
    costPerQueryCredits: 3,
    badge: 'Deep Reasoning',
    description: 'State-of-the-art open reasoning model utilizing step-by-step chain-of-thought verification.',
  },

  // Credit Vault (Ultra Frontier)
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    tier: 'vault',
    provider: 'Anthropic Frontier',
    contextWindow: '200k tokens',
    supportsThinking: true,
    costPerQueryCredits: 45,
    badge: 'Ultra Frontier',
    description: 'Supreme intelligence tier for complex multi-agent simulations and formal research proofs.',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    tier: 'vault',
    provider: 'OpenAI Frontier',
    contextWindow: '256k tokens',
    supportsThinking: true,
    costPerQueryCredits: 50,
    badge: 'Autonomous',
    description: 'Self-correcting frontier model with autonomous tool orchestration and recursive self-audit.',
  },
  {
    id: 'fable-5-1',
    name: 'Fable 5.1',
    tier: 'vault',
    provider: 'Fable AI Labs',
    contextWindow: '1M tokens',
    supportsThinking: false,
    costPerQueryCredits: 40,
    badge: '1M Context',
    description: 'Ultra-long context model capable of ingesting entire codebases and national legal corpuses.',
  },
  {
    id: 'gpt-5-6-sol',
    name: 'GPT-5.6 Sol',
    tier: 'vault',
    provider: 'OpenAI Labs',
    contextWindow: '512k tokens',
    supportsThinking: true,
    costPerQueryCredits: 60,
    badge: 'Maximum Compute',
    description: 'Uncapped compute frontier model for deep mathematical proofs and zero-shot compiler synthesis.',
  },
];

export const DEFAULT_SYSTEM_INSTRUCTIONS: Record<WorkMode, string> = {
  developer: `You are a Principal Software Engineer and Polyglot Systems Architect at AI Festa Studio Nepal.
- Write modern, production-grade, bug-free code.
- Prioritize clean architecture, error handling, and performance.
- When fixing code, provide the exact changes suitable for side-by-side diffing and review.
- Focus on frameworks widely used in Nepal's tech ecosystem (FastAPI, Next.js, Node.js, Django, PostgreSQL, Redis, and eSewa/Khalti SDKs).`,

  researcher: `You are an Academic Research Fellow and Senior Tech Analyst specializing in South Asia & Nepal's technological development, data infrastructure, and regulatory frameworks.
- Ground every factual assertion with credible, verifiable sources.
- Provide source citations formatted with clear source badges (e.g. [OnlineKhabar], [Kantipur], [Arxiv], [NREN], [Nepal Rastra Bank]).
- Evaluate technological and socio-economic implications with academic rigor.`,

  general: `You are AI Festa Studio's intelligent reasoning polymath assistant.
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

export const SAMPLE_PYTHON_SCRIPT = `# AI Festa Studio — In-Browser Python Terminal (Pyodide WASM)
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
