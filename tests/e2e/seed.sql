INSERT INTO categories (slug, name, description) VALUES
  ('ai-assistants', 'AI assistants', 'General-purpose AI assistants and language models.')
ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description;

INSERT INTO scenes (slug, name, description) VALUES
  ('chat', 'Chat and writing', 'Draft, summarize and converse.')
ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description;

INSERT INTO tools (
  slug, name, description, website_url, pricing, tags, verified_at,
  editorial_note, platforms, languages, status, featured
) VALUES (
  'chatgpt',
  'ChatGPT',
  'OpenAI''s general-purpose AI assistant.',
  'https://chatgpt.com',
  'Free tier; Plus, Pro, Business and Enterprise plans',
  '["assistant","writing","multimodal"]',
  '2026-08-31',
  'A versatile default for writing, analysis, coding, and multimodal tasks.',
  '["web","macOS","Windows","iOS","Android"]',
  '["English","Chinese","Japanese"]',
  'published',
  1
)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  website_url = excluded.website_url,
  pricing = excluded.pricing,
  tags = excluded.tags,
  verified_at = excluded.verified_at,
  editorial_note = excluded.editorial_note,
  platforms = excluded.platforms,
  languages = excluded.languages,
  status = excluded.status,
  featured = excluded.featured;

INSERT OR IGNORE INTO tool_categories (tool_id, category_id)
SELECT tools.id, categories.id FROM tools, categories
WHERE tools.slug = 'chatgpt' AND categories.slug = 'ai-assistants';

INSERT OR IGNORE INTO tool_scenes (tool_id, scene_id)
SELECT tools.id, scenes.id FROM tools, scenes
WHERE tools.slug = 'chatgpt' AND scenes.slug = 'chat';
