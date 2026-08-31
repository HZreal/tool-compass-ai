type D1Statement = { bind: (...values: unknown[]) => D1Statement };
type D1Database = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<unknown>;
};

type SeedTool = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  category: string;
  scene: string;
  pricing: string;
  tags: string[];
  verifiedAt: string;
  editorialNote: string;
  platforms: string[];
  languages: string[];
};

type SeedDisplayMetadata = Omit<SeedTool, "slug" | "name" | "description" | "websiteUrl" | "category" | "scene">;

const categories = [
  ["ai-assistants", "AI assistants", "General-purpose AI assistants and language models."],
  ["code-development", "Code development", "Tools for writing, reviewing and shipping software."],
  ["image-generation", "Image generation", "Image creation, editing and visual generation."],
  ["video-audio", "Video and audio", "Video editing, synthesis and audio production."],
  ["productivity", "Productivity", "Writing, planning and personal productivity."],
  ["data-research", "Data and research", "Research, analysis and data exploration."],
  ["automation-agents", "Automation and agents", "Workflow automation and autonomous agents."],
  ["design-collaboration", "Design and collaboration", "Design systems and collaborative workspaces."],
] as const;

const scenes = [
  ["chat", "Chat and writing", "Draft, summarize and converse."],
  ["coding", "Software delivery", "Build, test and maintain applications."],
  ["visual", "Visual creation", "Create images, designs and presentations."],
  ["media", "Media production", "Produce video, audio and voice."],
  ["research", "Research and analysis", "Find evidence and analyze information."],
  ["workflow", "Workflow automation", "Connect tools and automate repeatable work."],
] as const;

const toolRows: readonly [string, string, string, string, string, string][] = [
  ["chatgpt", "ChatGPT", "OpenAI's general-purpose AI assistant.", "https://chatgpt.com", "ai-assistants", "chat"],
  ["claude", "Claude", "Anthropic's AI assistant for analysis and writing.", "https://claude.ai", "ai-assistants", "chat"],
  ["gemini", "Gemini", "Google's multimodal AI assistant.", "https://gemini.google.com", "ai-assistants", "chat"],
  ["microsoft-copilot", "Microsoft Copilot", "AI assistant across Microsoft products.", "https://copilot.microsoft.com", "ai-assistants", "chat"],
  ["perplexity", "Perplexity", "Answer engine with cited web research.", "https://www.perplexity.ai", "ai-assistants", "research"],
  ["pika", "Pika", "AI video creation platform.", "https://pika.art", "video-audio", "media"],
  ["mistral-le-chat", "Le Chat", "Mistral's conversational AI assistant.", "https://chat.mistral.ai", "ai-assistants", "chat"],
  ["poe", "Poe", "A multi-model AI chat platform.", "https://poe.com", "ai-assistants", "chat"],
  ["github", "GitHub", "Developer platform for source control and collaboration.", "https://github.com", "code-development", "coding"],
  ["github-copilot", "GitHub Copilot", "AI coding assistant from GitHub.", "https://github.com/features/copilot", "code-development", "coding"],
  ["cursor", "Cursor", "AI-native code editor.", "https://cursor.com", "code-development", "coding"],
  ["windsurf", "Windsurf", "AI-powered IDE by Codeium.", "https://windsurf.com", "code-development", "coding"],
  ["replit", "Replit", "Cloud development environment with AI assistance.", "https://replit.com", "code-development", "coding"],
  ["vercel", "Vercel", "Frontend cloud and application platform.", "https://vercel.com", "code-development", "coding"],
  ["cloudflare", "Cloudflare", "Developer platform for applications and networks.", "https://www.cloudflare.com", "code-development", "coding"],
  ["sentry", "Sentry", "Application monitoring and error tracking.", "https://sentry.io", "code-development", "coding"],
  ["midjourney", "Midjourney", "AI image generation service.", "https://www.midjourney.com", "image-generation", "visual"],
  ["adobe-firefly", "Adobe Firefly", "Generative image tools from Adobe.", "https://firefly.adobe.com", "image-generation", "visual"],
  ["ideogram", "Ideogram", "AI image generation with strong typography.", "https://ideogram.ai", "image-generation", "visual"],
  ["leonardo-ai", "Leonardo AI", "Generative image creation platform.", "https://leonardo.ai", "image-generation", "visual"],
  ["stability-ai", "Stability AI", "Open image models and creative tools.", "https://stability.ai", "image-generation", "visual"],
  ["canva", "Canva", "Visual communication and design platform.", "https://www.canva.com", "image-generation", "visual"],
  ["remove-bg", "remove.bg", "Automatic image background removal.", "https://www.remove.bg", "image-generation", "visual"],
  ["photopea", "Photopea", "Browser-based image editor.", "https://www.photopea.com", "image-generation", "visual"],
  ["runway", "Runway", "AI video generation and editing tools.", "https://runwayml.com", "video-audio", "media"],
  ["descript", "Descript", "Text-based audio and video editor.", "https://www.descript.com", "video-audio", "media"],
  ["elevenlabs", "ElevenLabs", "AI voice generation platform.", "https://elevenlabs.io", "video-audio", "media"],
  ["suno", "Suno", "AI music creation platform.", "https://suno.com", "video-audio", "media"],
  ["heygen", "HeyGen", "AI avatar and video translation platform.", "https://www.heygen.com", "video-audio", "media"],
  ["kapwing", "Kapwing", "Online collaborative video editor.", "https://www.kapwing.com", "video-audio", "media"],
  ["veed", "VEED", "Online video editing platform.", "https://www.veed.io", "video-audio", "media"],
  ["otter", "Otter.ai", "Meeting transcription and notes.", "https://otter.ai", "video-audio", "media"],
  ["notion", "Notion", "Connected workspace for notes and projects.", "https://www.notion.so", "productivity", "chat"],
  ["grammarly", "Grammarly", "AI writing assistance and proofreading.", "https://www.grammarly.com", "productivity", "chat"],
  ["linear", "Linear", "Issue tracking for product teams.", "https://linear.app", "productivity", "workflow"],
  ["todoist", "Todoist", "Task manager for focused work.", "https://todoist.com", "productivity", "workflow"],
  ["asana", "Asana", "Work management platform for teams.", "https://asana.com", "productivity", "workflow"],
  ["slack", "Slack", "Team messaging and collaboration.", "https://slack.com", "productivity", "workflow"],
  ["loom", "Loom", "Asynchronous video messaging.", "https://www.loom.com", "productivity", "media"],
  ["deepgram", "Deepgram", "Speech recognition API platform.", "https://deepgram.com", "video-audio", "media"],
  ["notebooklm", "NotebookLM", "Source-grounded research assistant.", "https://notebooklm.google", "data-research", "research"],
  ["consensus", "Consensus", "Evidence search across scientific papers.", "https://consensus.app", "data-research", "research"],
  ["scispace", "SciSpace", "Research paper discovery and explanation.", "https://scispace.com", "data-research", "research"],
  ["wolfram-alpha", "Wolfram Alpha", "Computational knowledge engine.", "https://www.wolframalpha.com", "data-research", "research"],
  ["kaggle", "Kaggle", "Data science community and datasets.", "https://www.kaggle.com", "data-research", "research"],
  ["tableau", "Tableau", "Visual analytics and business intelligence.", "https://www.tableau.com", "data-research", "research"],
  ["observable", "Observable", "Collaborative data notebooks.", "https://observablehq.com", "data-research", "research"],
  ["hex", "Hex", "Collaborative analytics workspace.", "https://hex.tech", "data-research", "research"],
  ["zapier", "Zapier", "No-code workflow automation platform.", "https://zapier.com", "automation-agents", "workflow"],
  ["make", "Make", "Visual workflow automation platform.", "https://www.make.com", "automation-agents", "workflow"],
  ["n8n", "n8n", "Source-available workflow automation.", "https://n8n.io", "automation-agents", "workflow"],
  ["ifttt", "IFTTT", "Simple consumer automation service.", "https://ifttt.com", "automation-agents", "workflow"],
  ["langchain", "LangChain", "Framework for LLM applications and agents.", "https://www.langchain.com", "automation-agents", "coding"],
  ["llamaindex", "LlamaIndex", "Data framework for LLM applications.", "https://www.llamaindex.ai", "automation-agents", "coding"],
  ["crewai", "CrewAI", "Framework for multi-agent workflows.", "https://www.crewai.com", "automation-agents", "workflow"],
  ["hugging-face", "Hugging Face", "Open-source AI models and datasets hub.", "https://huggingface.co", "automation-agents", "coding"],
  ["figma", "Figma", "Collaborative interface design tool.", "https://www.figma.com", "design-collaboration", "visual"],
  ["miro", "Miro", "Online collaborative whiteboard.", "https://miro.com", "design-collaboration", "workflow"],
  ["framer", "Framer", "Design and publish websites visually.", "https://www.framer.com", "design-collaboration", "visual"],
  ["penpot", "Penpot", "Open-source design and prototyping platform.", "https://penpot.app", "design-collaboration", "visual"],
  ["maze", "Maze", "Continuous product discovery platform.", "https://maze.co", "design-collaboration", "research"],
  ["webflow", "Webflow", "Visual website experience platform.", "https://webflow.com", "design-collaboration", "visual"],
  ["mural", "Mural", "Visual collaboration workspace.", "https://www.mural.co", "design-collaboration", "workflow"],
  ["zeplin", "Zeplin", "Design handoff collaboration platform.", "https://zeplin.io", "design-collaboration", "coding"],
  ["openai-api", "OpenAI API", "Platform for building with OpenAI models.", "https://platform.openai.com", "ai-assistants", "coding"],
  ["anthropic-api", "Anthropic API", "Platform for building with Claude models.", "https://www.anthropic.com/api", "ai-assistants", "coding"],
  ["google-ai-studio", "Google AI Studio", "Build with Google's generative AI models.", "https://aistudio.google.com", "ai-assistants", "coding"],
  ["ollama", "Ollama", "Run language models locally.", "https://ollama.com", "ai-assistants", "coding"],
  ["lm-studio", "LM Studio", "Desktop app for local language models.", "https://lmstudio.ai", "ai-assistants", "coding"],
  ["replicate", "Replicate", "Run machine learning models through an API.", "https://replicate.com", "automation-agents", "coding"],
  ["modal", "Modal", "Serverless cloud platform for AI workloads.", "https://modal.com", "automation-agents", "coding"],
  ["railway", "Railway", "Deploy applications and databases.", "https://railway.com", "code-development", "coding"],
  ["supabase", "Supabase", "Open-source Firebase alternative.", "https://supabase.com", "code-development", "coding"],
  ["neon", "Neon", "Serverless Postgres platform.", "https://neon.tech", "code-development", "coding"],
  ["planetscale", "PlanetScale", "Serverless database platform.", "https://planetscale.com", "code-development", "coding"],
  ["airtable", "Airtable", "Connected apps platform for teams.", "https://www.airtable.com", "productivity", "workflow"],
  ["coda", "Coda", "Document platform that blends tables and apps.", "https://coda.io", "productivity", "workflow"],
  ["clickup", "ClickUp", "All-in-one productivity platform.", "https://clickup.com", "productivity", "workflow"],
  ["arc-search", "Arc Search", "AI-assisted mobile web browser.", "https://arc.net", "data-research", "research"],
  ["retool", "Retool", "Platform for building internal software.", "https://retool.com", "code-development", "coding"],
] as const;

const displayMetadata: Record<string, SeedDisplayMetadata> = {
  chatgpt: { pricing: "Free tier; Plus and Pro subscriptions", tags: ["chat", "writing", "multimodal"], verifiedAt: "2026-08-31", editorialNote: "A reliable general-purpose assistant for drafting, brainstorming, and everyday problem-solving.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  claude: { pricing: "Free tier; Pro and Max subscriptions", tags: ["analysis", "writing", "coding"], verifiedAt: "2026-08-31", editorialNote: "Well suited to careful long-form analysis, writing, and document work.", platforms: ["web", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  gemini: { pricing: "Free tier; Google AI Pro and Ultra plans", tags: ["chat", "multimodal", "google-workspace"], verifiedAt: "2026-08-31", editorialNote: "A practical choice for people already working across Google products.", platforms: ["web", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  "microsoft-copilot": { pricing: "Free tier; Microsoft 365 and Copilot Pro plans", tags: ["chat", "office", "web-search"], verifiedAt: "2026-08-30", editorialNote: "Best matched to Microsoft 365 users who want AI in their daily tools.", platforms: ["web", "Windows", "macOS", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  perplexity: { pricing: "Free tier; Pro subscription", tags: ["research", "citations", "web-search"], verifiedAt: "2026-08-31", editorialNote: "A concise research starting point when sources and quick follow-up questions matter.", platforms: ["web", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  pika: { pricing: "Free credits; paid subscription plans", tags: ["video-generation", "animation", "image-to-video"], verifiedAt: "2026-08-29", editorialNote: "Useful for fast social clips and playful generative-video experiments.", platforms: ["web"], languages: ["English"] },
  "mistral-le-chat": { pricing: "Free tier; Pro and Team plans", tags: ["chat", "reasoning", "document-analysis"], verifiedAt: "2026-08-30", editorialNote: "A capable European alternative for general chat and document-oriented tasks.", platforms: ["web", "iOS", "Android"], languages: ["English", "French", "Spanish"] },
  poe: { pricing: "Free tier; subscription plans", tags: ["multi-model", "chat", "bots"], verifiedAt: "2026-08-29", editorialNote: "Convenient for comparing several public models and community bots in one place.", platforms: ["web", "iOS", "Android"], languages: ["English", "Chinese"] },
  github: { pricing: "Free tier; Team and Enterprise plans", tags: ["source-control", "collaboration", "code-hosting"], verifiedAt: "2026-08-31", editorialNote: "The default collaboration hub for most software teams and open-source projects.", platforms: ["web", "macOS", "Windows", "Linux", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  "github-copilot": { pricing: "Free tier; Pro, Pro+ and Business plans", tags: ["coding", "autocomplete", "code-review"], verifiedAt: "2026-08-31", editorialNote: "A natural option for developers already using GitHub and mainstream IDEs.", platforms: ["macOS", "Windows", "Linux", "web"], languages: ["English", "Chinese", "Japanese"] },
  cursor: { pricing: "Free tier; Pro and Business plans", tags: ["ai-ide", "coding", "agents"], verifiedAt: "2026-08-31", editorialNote: "An AI-first editor for developers who want chat, edits, and codebase context together.", platforms: ["macOS", "Windows", "Linux"], languages: ["English"] },
  windsurf: { pricing: "Free tier; Pro and Teams plans", tags: ["ai-ide", "coding", "agents"], verifiedAt: "2026-08-30", editorialNote: "A coding environment focused on agent-assisted changes across a codebase.", platforms: ["macOS", "Windows", "Linux"], languages: ["English"] },
  replit: { pricing: "Free tier; Core, Teams and Enterprise plans", tags: ["cloud-ide", "prototyping", "deployment"], verifiedAt: "2026-08-30", editorialNote: "Helpful for getting a prototype from idea to hosted app without local setup.", platforms: ["web", "iOS", "Android"], languages: ["English"] },
  vercel: { pricing: "Free Hobby tier; Pro and Enterprise plans", tags: ["deployment", "frontend", "serverless"], verifiedAt: "2026-08-31", editorialNote: "A strong fit for teams shipping modern web apps with preview deployments.", platforms: ["web", "CLI"], languages: ["English"] },
  cloudflare: { pricing: "Free tier; paid usage-based plans", tags: ["edge", "security", "developer-platform"], verifiedAt: "2026-08-31", editorialNote: "A broad edge platform for performance, security, and Worker-based applications.", platforms: ["web", "CLI"], languages: ["English"] },
  sentry: { pricing: "Free Developer plan; Team and Business plans", tags: ["monitoring", "error-tracking", "performance"], verifiedAt: "2026-08-30", editorialNote: "A practical observability layer for finding and prioritizing production issues.", platforms: ["web", "SDK"], languages: ["English"] },
  midjourney: { pricing: "Subscription plans", tags: ["image-generation", "art", "style"], verifiedAt: "2026-08-31", editorialNote: "Often chosen for polished, expressive visual concepts and illustration styles.", platforms: ["web", "Discord"], languages: ["English", "Chinese", "Japanese"] },
  "adobe-firefly": { pricing: "Free credits; Creative Cloud plans", tags: ["image-generation", "design", "adobe"], verifiedAt: "2026-08-31", editorialNote: "A sensible option when generative assets must fit an Adobe creative workflow.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  ideogram: { pricing: "Free tier; paid plans", tags: ["image-generation", "typography", "design"], verifiedAt: "2026-08-30", editorialNote: "Particularly useful for image concepts that need readable embedded text.", platforms: ["web"], languages: ["English"] },
  "leonardo-ai": { pricing: "Free daily tokens; paid plans", tags: ["image-generation", "assets", "game-art"], verifiedAt: "2026-08-30", editorialNote: "A flexible image workspace for iterating on creative assets and styles.", platforms: ["web", "iOS", "Android"], languages: ["English"] },
  "stability-ai": { pricing: "Open models; paid API credits", tags: ["image-models", "api", "open-source"], verifiedAt: "2026-08-29", editorialNote: "Best for teams that need image-generation models through APIs or self-hosted workflows.", platforms: ["web", "API"], languages: ["English"] },
  canva: { pricing: "Free tier; Pro and Teams plans", tags: ["design", "presentations", "templates"], verifiedAt: "2026-08-31", editorialNote: "An accessible all-purpose design tool for fast marketing and presentation work.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["Chinese", "English", "Japanese"] },
  "remove-bg": { pricing: "Free previews; paid credits and subscriptions", tags: ["background-removal", "image-editing", "api"], verifiedAt: "2026-08-29", editorialNote: "A focused utility for quickly preparing product and portrait images.", platforms: ["web", "API", "macOS", "Windows"], languages: ["English", "German"] },
  photopea: { pricing: "Free tier; Premium subscription", tags: ["image-editing", "psd", "browser"], verifiedAt: "2026-08-30", editorialNote: "A surprisingly capable browser editor for PSD-compatible quick fixes.", platforms: ["web"], languages: ["English", "Chinese", "Japanese"] },
  runway: { pricing: "Free tier; Standard, Pro and Unlimited plans", tags: ["video-generation", "video-editing", "effects"], verifiedAt: "2026-08-31", editorialNote: "A leading creative workspace for generative video and AI-assisted post-production.", platforms: ["web", "iOS"], languages: ["English"] },
  descript: { pricing: "Free tier; Creator, Pro and Business plans", tags: ["video-editing", "podcasting", "transcription"], verifiedAt: "2026-08-30", editorialNote: "Especially effective for editing spoken video and podcasts through text.", platforms: ["macOS", "Windows", "web"], languages: ["English"] },
  elevenlabs: { pricing: "Free tier; paid subscription and API plans", tags: ["voice", "text-to-speech", "dubbing"], verifiedAt: "2026-08-31", editorialNote: "A high-quality choice for narration, voice design, and multilingual dubbing.", platforms: ["web", "API"], languages: ["English", "Chinese", "Japanese"] },
  suno: { pricing: "Free daily credits; Pro and Premier plans", tags: ["music-generation", "audio", "songs"], verifiedAt: "2026-08-30", editorialNote: "Useful for sketching original song ideas and short music beds.", platforms: ["web", "iOS", "Android"], languages: ["English", "Chinese"] },
  heygen: { pricing: "Free tier; Creator, Team and Enterprise plans", tags: ["avatars", "video-translation", "dubbing"], verifiedAt: "2026-08-31", editorialNote: "A practical service for presenter videos and translated talking-head content.", platforms: ["web", "API"], languages: ["English", "Chinese", "Japanese"] },
  kapwing: { pricing: "Free tier; Pro, Business and Enterprise plans", tags: ["video-editing", "captions", "social-video"], verifiedAt: "2026-08-29", editorialNote: "A collaborative browser editor for quick social edits, captions, and repurposing.", platforms: ["web"], languages: ["English"] },
  veed: { pricing: "Free tier; Lite, Pro and Enterprise plans", tags: ["video-editing", "captions", "screen-recording"], verifiedAt: "2026-08-30", editorialNote: "A straightforward browser option for captioned marketing and training videos.", platforms: ["web", "iOS"], languages: ["English"] },
  otter: { pricing: "Free Basic plan; Pro, Business and Enterprise plans", tags: ["transcription", "meetings", "notes"], verifiedAt: "2026-08-29", editorialNote: "Useful for turning meetings into searchable notes and follow-up material.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English"] },
  notion: { pricing: "Free tier; Plus, Business and Enterprise plans", tags: ["notes", "wiki", "projects"], verifiedAt: "2026-08-31", editorialNote: "A flexible workspace when notes, lightweight databases, and team planning need to connect.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  grammarly: { pricing: "Free tier; Pro and Business plans", tags: ["writing", "grammar", "rewriting"], verifiedAt: "2026-08-30", editorialNote: "A focused writing companion for polishing English across common work apps.", platforms: ["web", "macOS", "Windows", "iOS", "Android", "browser-extension"], languages: ["English"] },
  linear: { pricing: "Free tier; Basic and Business plans", tags: ["issue-tracking", "product", "planning"], verifiedAt: "2026-08-31", editorialNote: "A fast, opinionated tracker for product teams that value clear workflows.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English"] },
  todoist: { pricing: "Free tier; Pro and Business plans", tags: ["tasks", "productivity", "reminders"], verifiedAt: "2026-08-30", editorialNote: "A dependable personal and team task manager with broad device coverage.", platforms: ["web", "macOS", "Windows", "Linux", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  asana: { pricing: "Free Personal plan; Starter, Advanced and Enterprise plans", tags: ["project-management", "workflows", "teams"], verifiedAt: "2026-08-30", editorialNote: "A structured work-management option for cross-functional teams and projects.", platforms: ["web", "iOS", "Android"], languages: ["English", "Japanese"] },
  slack: { pricing: "Free tier; Pro, Business+ and Enterprise Grid plans", tags: ["messaging", "collaboration", "integrations"], verifiedAt: "2026-08-31", editorialNote: "A central conversation layer for teams that coordinate through channels and integrations.", platforms: ["web", "macOS", "Windows", "Linux", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  loom: { pricing: "Free Starter plan; Business and Business+ AI plans", tags: ["screen-recording", "async-video", "communication"], verifiedAt: "2026-08-29", editorialNote: "A fast way to explain work asynchronously with screen and camera recordings.", platforms: ["web", "macOS", "Windows", "iOS", "Android", "browser-extension"], languages: ["English"] },
  deepgram: { pricing: "Free credits; usage-based API pricing", tags: ["speech-to-text", "voice-ai", "api"], verifiedAt: "2026-08-30", editorialNote: "A developer-focused speech platform for building transcription and voice features.", platforms: ["API", "web"], languages: ["English", "Chinese", "Japanese"] },
  notebooklm: { pricing: "Free tier; Google AI subscription features", tags: ["research", "sources", "study"], verifiedAt: "2026-08-31", editorialNote: "Excellent for asking grounded questions over a curated set of source materials.", platforms: ["web", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  consensus: { pricing: "Free tier; Premium plans", tags: ["research", "science", "evidence"], verifiedAt: "2026-08-30", editorialNote: "A specialized research assistant for locating and summarizing scientific evidence.", platforms: ["web"], languages: ["English"] },
  scispace: { pricing: "Free tier; paid plans", tags: ["papers", "research", "literature-review"], verifiedAt: "2026-08-30", editorialNote: "Useful for reading, searching, and explaining academic papers more efficiently.", platforms: ["web", "browser-extension"], languages: ["English"] },
  "wolfram-alpha": { pricing: "Free tier; Pro plans", tags: ["calculation", "data", "knowledge"], verifiedAt: "2026-08-29", editorialNote: "A strong complement to chat tools when the task needs computation or curated data.", platforms: ["web", "iOS", "Android", "API"], languages: ["English"] },
  kaggle: { pricing: "Free tier; paid compute options", tags: ["datasets", "notebooks", "machine-learning"], verifiedAt: "2026-08-31", editorialNote: "A useful public hub for datasets, experiments, and data-science learning.", platforms: ["web", "API"], languages: ["English"] },
  tableau: { pricing: "Free Public tier; Creator, Explorer and Viewer plans", tags: ["analytics", "dashboards", "business-intelligence"], verifiedAt: "2026-08-30", editorialNote: "A mature visualization platform for teams sharing interactive data dashboards.", platforms: ["macOS", "Windows", "web", "iOS", "Android"], languages: ["English", "Japanese"] },
  observable: { pricing: "Free tier; Team and Enterprise plans", tags: ["data-notebooks", "visualization", "javascript"], verifiedAt: "2026-08-29", editorialNote: "A collaborative notebook environment for publishing interactive data work on the web.", platforms: ["web"], languages: ["English"] },
  hex: { pricing: "Free tier; Team and Enterprise plans", tags: ["analytics", "notebooks", "collaboration"], verifiedAt: "2026-08-30", editorialNote: "A team-oriented analytics workspace that connects notebooks, apps, and data.", platforms: ["web"], languages: ["English"] },
  zapier: { pricing: "Free tier; Professional, Team and Enterprise plans", tags: ["automation", "integrations", "no-code"], verifiedAt: "2026-08-31", editorialNote: "A broad automation choice when off-the-shelf app connectors are the priority.", platforms: ["web", "API"], languages: ["English"] },
  make: { pricing: "Free tier; Core, Pro, Teams and Enterprise plans", tags: ["automation", "visual-workflows", "integrations"], verifiedAt: "2026-08-30", editorialNote: "A visual automation builder for teams that want detailed control over data flows.", platforms: ["web"], languages: ["English"] },
  n8n: { pricing: "Open-source self-hosting; paid cloud plans", tags: ["automation", "workflows", "self-hosting"], verifiedAt: "2026-08-31", editorialNote: "A good fit for technical teams that want flexible, self-hostable automation.", platforms: ["web", "self-hosted", "cloud"], languages: ["English"] },
  ifttt: { pricing: "Free tier; Pro and Pro+ plans", tags: ["automation", "consumer-apps", "applets"], verifiedAt: "2026-08-29", editorialNote: "A simple way to connect consumer services and personal smart-device routines.", platforms: ["web", "iOS", "Android"], languages: ["English"] },
  langchain: { pricing: "Open-source; paid LangSmith plans", tags: ["llm-apps", "agents", "framework"], verifiedAt: "2026-08-31", editorialNote: "A widely used framework for assembling LLM applications, retrieval, and agent workflows.", platforms: ["Python", "JavaScript", "web"], languages: ["English"] },
  llamaindex: { pricing: "Open-source; paid cloud plans", tags: ["rag", "data", "agents"], verifiedAt: "2026-08-30", editorialNote: "A data-centric framework for grounding LLM applications in external knowledge.", platforms: ["Python", "TypeScript", "web"], languages: ["English"] },
  crewai: { pricing: "Open-source; paid enterprise offerings", tags: ["agents", "multi-agent", "python"], verifiedAt: "2026-08-29", editorialNote: "A developer framework for organizing role-based multi-agent workflows.", platforms: ["Python", "web"], languages: ["English"] },
  "hugging-face": { pricing: "Free tier; Pro, Team and Enterprise plans", tags: ["models", "datasets", "open-source"], verifiedAt: "2026-08-31", editorialNote: "The central public ecosystem for open models, datasets, demos, and ML collaboration.", platforms: ["web", "Python", "API"], languages: ["English", "Chinese", "Japanese"] },
  figma: { pricing: "Free Starter plan; Professional, Organization and Enterprise plans", tags: ["ui-design", "prototyping", "collaboration"], verifiedAt: "2026-08-31", editorialNote: "The standard collaborative workspace for modern interface design and prototyping.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  miro: { pricing: "Free tier; Starter, Business and Enterprise plans", tags: ["whiteboard", "workshops", "collaboration"], verifiedAt: "2026-08-30", editorialNote: "A flexible shared canvas for remote workshops, planning, and visual collaboration.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English", "Japanese"] },
  framer: { pricing: "Free tier; Basic, Pro and Scale plans", tags: ["web-design", "publishing", "prototyping"], verifiedAt: "2026-08-30", editorialNote: "A design-led web builder for publishing polished marketing sites quickly.", platforms: ["web"], languages: ["English"] },
  penpot: { pricing: "Open-source; paid hosted and enterprise plans", tags: ["ui-design", "prototyping", "open-source"], verifiedAt: "2026-08-29", editorialNote: "An open-source design and prototyping alternative for collaborative product teams.", platforms: ["web", "self-hosted"], languages: ["English"] },
  maze: { pricing: "Free tier; paid plans", tags: ["user-research", "testing", "product-discovery"], verifiedAt: "2026-08-29", editorialNote: "A product-research platform for testing designs and collecting user insight.", platforms: ["web"], languages: ["English"] },
  webflow: { pricing: "Free Starter tier; site, workspace and enterprise plans", tags: ["web-design", "cms", "publishing"], verifiedAt: "2026-08-31", editorialNote: "A visual web platform for teams that need design control and a managed CMS.", platforms: ["web"], languages: ["English"] },
  mural: { pricing: "Free tier; Team+, Business and Enterprise plans", tags: ["whiteboard", "facilitation", "workshops"], verifiedAt: "2026-08-29", editorialNote: "A digital whiteboard built around facilitation and structured team workshops.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English"] },
  zeplin: { pricing: "Free tier; Organization and Enterprise plans", tags: ["design-handoff", "specs", "collaboration"], verifiedAt: "2026-08-30", editorialNote: "A focused design-handoff tool for translating interface work into developer-ready specs.", platforms: ["web", "macOS", "Windows"], languages: ["English"] },
  "openai-api": { pricing: "Usage-based API pricing", tags: ["llm-api", "multimodal", "developers"], verifiedAt: "2026-08-31", editorialNote: "A production API platform for building assistants, multimodal apps, and agent workflows.", platforms: ["API", "web", "Python", "JavaScript"], languages: ["English"] },
  "anthropic-api": { pricing: "Usage-based API pricing", tags: ["llm-api", "reasoning", "developers"], verifiedAt: "2026-08-31", editorialNote: "An API option for developers building applications around Claude models and long-context tasks.", platforms: ["API", "web", "Python", "TypeScript"], languages: ["English"] },
  "google-ai-studio": { pricing: "Free tier; paid Gemini API usage", tags: ["gemini", "prototyping", "api"], verifiedAt: "2026-08-30", editorialNote: "A quick browser workspace for experimenting with Gemini models before integration.", platforms: ["web", "API"], languages: ["English"] },
  ollama: { pricing: "Free and open-source", tags: ["local-models", "llm", "developer-tools"], verifiedAt: "2026-08-31", editorialNote: "The simplest starting point for running and serving many open models locally.", platforms: ["macOS", "Windows", "Linux", "CLI", "API"], languages: ["English"] },
  "lm-studio": { pricing: "Free tier; paid enterprise offerings", tags: ["local-models", "desktop", "llm"], verifiedAt: "2026-08-30", editorialNote: "A desktop-friendly way to download, test, and serve local models with a graphical interface.", platforms: ["macOS", "Windows", "Linux"], languages: ["English"] },
  replicate: { pricing: "Usage-based API pricing", tags: ["models", "api", "inference"], verifiedAt: "2026-08-30", editorialNote: "A convenient API marketplace for integrating many hosted AI models without managing GPUs.", platforms: ["API", "web", "Python", "JavaScript"], languages: ["English"] },
  modal: { pricing: "Free credits; usage-based pricing", tags: ["serverless", "gpu", "python"], verifiedAt: "2026-08-29", editorialNote: "A developer platform for running Python workloads and GPU jobs without infrastructure setup.", platforms: ["Python", "web", "CLI"], languages: ["English"] },
  railway: { pricing: "Free trial credit; usage-based plans", tags: ["deployment", "databases", "developer-platform"], verifiedAt: "2026-08-30", editorialNote: "A straightforward deployment platform for shipping apps and backing services quickly.", platforms: ["web", "CLI"], languages: ["English"] },
  supabase: { pricing: "Free tier; Pro, Team and Enterprise plans", tags: ["database", "backend", "auth"], verifiedAt: "2026-08-31", editorialNote: "A full-featured backend platform for applications that need Postgres, auth, and storage.", platforms: ["web", "API", "CLI"], languages: ["English"] },
  neon: { pricing: "Free tier; Launch, Scale and Business plans", tags: ["postgres", "serverless", "database"], verifiedAt: "2026-08-30", editorialNote: "A serverless Postgres service built for elastic modern development workflows.", platforms: ["web", "API", "CLI"], languages: ["English"] },
  planetscale: { pricing: "Free developer plan; paid plans", tags: ["database", "mysql", "serverless"], verifiedAt: "2026-08-29", editorialNote: "A managed database platform for teams that need branching and operational simplicity.", platforms: ["web", "CLI"], languages: ["English"] },
  airtable: { pricing: "Free tier; Team, Business and Enterprise Scale plans", tags: ["database", "no-code", "workflows"], verifiedAt: "2026-08-31", editorialNote: "A flexible database-like workspace for organizing operational data and lightweight apps.", platforms: ["web", "macOS", "Windows", "iOS", "Android"], languages: ["English", "Japanese"] },
  coda: { pricing: "Free tier; Pro, Team and Enterprise plans", tags: ["docs", "tables", "automation"], verifiedAt: "2026-08-30", editorialNote: "A document platform for turning collaborative docs into lightweight working apps.", platforms: ["web", "iOS", "Android"], languages: ["English"] },
  clickup: { pricing: "Free Forever tier; Unlimited, Business and Enterprise plans", tags: ["project-management", "tasks", "docs"], verifiedAt: "2026-08-30", editorialNote: "An all-in-one work platform for teams that prefer broad configurability.", platforms: ["web", "macOS", "Windows", "Linux", "iOS", "Android"], languages: ["English", "Chinese", "Japanese"] },
  "arc-search": { pricing: "Free", tags: ["browser", "search", "mobile"], verifiedAt: "2026-08-29", editorialNote: "A mobile-first browser that emphasizes concise AI-assisted web answers.", platforms: ["iOS", "Android"], languages: ["English"] },
  retool: { pricing: "Free tier; Team, Business and Enterprise plans", tags: ["internal-tools", "low-code", "apps"], verifiedAt: "2026-08-30", editorialNote: "A fast way for technical teams to build internal tools on top of existing data sources.", platforms: ["web", "self-hosted"], languages: ["English"] },
};

const tools: SeedTool[] = toolRows.map(([slug, name, description, websiteUrl, category, scene]) => {
  const metadata = displayMetadata[slug];
  if (!metadata) throw new Error(`Missing display metadata for seeded tool: ${slug}`);
  return { slug, name, description, websiteUrl, category, scene, ...metadata };
});

export async function seedCatalog(db: D1Database): Promise<void> {
  const statements: D1Statement[] = [];
  for (const [slug, name, description] of categories) {
    statements.push(db.prepare("INSERT INTO categories (slug, name, description) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description").bind(slug, name, description));
  }
  for (const [slug, name, description] of scenes) {
    statements.push(db.prepare("INSERT INTO scenes (slug, name, description) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description").bind(slug, name, description));
  }
  for (const tool of tools) {
    statements.push(db.prepare("INSERT INTO tools (slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, website_url = excluded.website_url, pricing = excluded.pricing, tags = excluded.tags, verified_at = excluded.verified_at, editorial_note = excluded.editorial_note, platforms = excluded.platforms, languages = excluded.languages, status = excluded.status, featured = excluded.featured, updated_at = CURRENT_TIMESTAMP").bind(tool.slug, tool.name, tool.description, tool.websiteUrl, tool.pricing, JSON.stringify(tool.tags), tool.verifiedAt, tool.editorialNote, JSON.stringify(tool.platforms), JSON.stringify(tool.languages), tool.slug === "chatgpt" ? 1 : 0));
    statements.push(db.prepare("INSERT OR IGNORE INTO tool_categories (tool_id, category_id) SELECT tools.id, categories.id FROM tools, categories WHERE tools.slug = ? AND categories.slug = ?").bind(tool.slug, tool.category));
    statements.push(db.prepare("INSERT OR IGNORE INTO tool_scenes (tool_id, scene_id) SELECT tools.id, scenes.id FROM tools, scenes WHERE tools.slug = ? AND scenes.slug = ?").bind(tool.slug, tool.scene));
  }
  await db.batch(statements);
}

export { categories, scenes, tools };
