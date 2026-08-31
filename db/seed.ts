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
};

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

const tools: SeedTool[] = toolRows.map(([slug, name, description, websiteUrl, category, scene]) => ({
  slug, name, description, websiteUrl, category, scene,
}));

export async function seedCatalog(db: D1Database): Promise<void> {
  const statements: D1Statement[] = [];
  for (const [slug, name, description] of categories) {
    statements.push(db.prepare("INSERT INTO categories (slug, name, description) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description").bind(slug, name, description));
  }
  for (const [slug, name, description] of scenes) {
    statements.push(db.prepare("INSERT INTO scenes (slug, name, description) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description").bind(slug, name, description));
  }
  for (const tool of tools) {
    statements.push(db.prepare("INSERT INTO tools (slug, name, description, website_url, status, featured) VALUES (?, ?, ?, ?, 'published', ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, website_url = excluded.website_url, status = excluded.status, featured = excluded.featured, updated_at = CURRENT_TIMESTAMP").bind(tool.slug, tool.name, tool.description, tool.websiteUrl, tool.slug === "chatgpt" ? 1 : 0));
    statements.push(db.prepare("INSERT OR IGNORE INTO tool_categories (tool_id, category_id) SELECT tools.id, categories.id FROM tools, categories WHERE tools.slug = ? AND categories.slug = ?").bind(tool.slug, tool.category));
    statements.push(db.prepare("INSERT OR IGNORE INTO tool_scenes (tool_id, scene_id) SELECT tools.id, scenes.id FROM tools, scenes WHERE tools.slug = ? AND scenes.slug = ?").bind(tool.slug, tool.scene));
  }
  await db.batch(statements);
}

export { categories, scenes, tools };
