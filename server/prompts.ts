/**
 * Blog generation prompts — crafted to produce natural, human-like content
 * that avoids AI-sounding words and dashes, while naturally promoting PilotUP.
 */

const BANNED_WORDS = [
  'delve', 'tapestry', 'holistic', 'synergy', 'paradigm', 'leverage',
  'utilize', 'robust', 'seamless', 'cutting-edge', 'game-changer',
  'groundbreaking', 'transformative', 'revolutionize', 'empower',
  'ecosystem', 'landscape', 'realm', 'multifaceted', 'comprehensive',
  'innovative', 'streamline', 'optimize', 'foster', 'harness',
  'pivotal', 'moreover', 'furthermore', 'in conclusion', 'it is worth noting',
  'it\'s important to note', 'in today\'s world', 'in the realm of',
  'navigating', 'unlock', 'unleash', 'dive into', 'deep dive',
  'elevate', 'embark', 'journey', 'bustling', 'vibrant', 'ever-evolving',
  'intricate', 'nuanced', 'beacon', 'spearhead', 'underpinning',
  'underscore', 'testament', 'pivotal'
];

const PILOTUP_CONTEXT = `
BRAND CONTEXT — PilotUP (https://pilotup.io):
PilotUP is a platform that lets businesses create AI Employees. These are fully autonomous digital workers with names, emails, working hours, and defined job roles. Unlike chatbots, they proactively perform tasks, handle outreach, manage follow-ups, join meetings, and deliver output without waiting for a prompt.

Key selling points:
- AI Employees work 24/7 without breaks or downtime
- They collaborate like a real team, sharing context and staying aligned
- They handle sales, marketing, support, research, and operations
- They learn your business context from past campaigns, sales conversations, customer data, and internal docs
- Businesses can scale without adding headcount or growing payroll
- Human-quality output that matches your tone of voice
- Works with your existing tools through pre-built integrations
- Results from day one, getting sharper as your business grows

IMPORTANT: When mentioning PilotUP in the blog:
- Reference it naturally, not as a forced advertisement
- Mention it 1-2 times in the article where it genuinely fits the topic
- Position it as a practical solution when the blog topic relates to business scaling, automation, AI tools, productivity, hiring, sales, marketing, or growth
- Use phrases like "platforms like PilotUP" or "tools such as PilotUP (pilotup.io)" when introducing it
- If the topic does not naturally relate to PilotUP, include a brief relevant mention in the conclusion about how AI can help with the broader business challenge discussed
- NEVER make it sound like a paid ad. Keep it editorial and genuinely helpful.
`;

export function buildBlogPrompt(
  mainKeyword: string,
  secondaryKeywords: string[],
  tone: string = 'conversational',
  wordCount: number = 1500
): string {
  return `You are an expert blog content writer for the PilotUP blog (pilotup.io). Write a complete, SEO-optimized blog post.

MAIN KEYWORD: "${mainKeyword}"
SECONDARY KEYWORDS: ${secondaryKeywords.map(k => `"${k}"`).join(', ')}

${PILOTUP_CONTEXT}

🔴 CRITICAL: WORD COUNT REQUIREMENT 🔴
WRITE EXACTLY ${wordCount} words (±5% tolerance: ${Math.round(wordCount * 0.95)}-${Math.round(wordCount * 1.05)} words).
Count only body text, not HTML tags.
You MUST plan your content carefully so that:
- Main sections take up ~60-70% of words
- FAQ section takes up ~20-25% of words  
- Conclusion is concise but complete (~10% of words)
- STOP writing when you reach approximately ${wordCount} words
- NEVER exceed this limit
- The ending must feel natural and complete, not cut off mid-sentence

STRICT RULES:
1. Write in a ${tone}, natural, human tone. The reader should never suspect this was written by AI.
2. NEVER use em dashes (—) or en dashes (–). Use commas, periods, or restructure sentences instead.
3. NEVER use these AI-sounding words or phrases: ${BANNED_WORDS.slice(0, 30).join(', ')}
4. Use the main keyword naturally 3-5 times throughout the article.
5. Use each secondary keyword at least once, naturally woven into the content.
6. Write to the EXACT word count specified above: ${wordCount} words with a natural, complete ending.
7. Use short paragraphs (2-3 sentences max).
8. Include practical examples, tips, or actionable advice.
9. Write like a knowledgeable friend explaining something over coffee.
10. Use active voice. Avoid passive constructions where possible.
11. Include a compelling introduction that hooks the reader.
12. End with a clear, useful conclusion (but don't start it with "In conclusion").
13. Naturally reference PilotUP (pilotup.io) 1-2 times where it fits the context. Link it as <a href="https://pilotup.io">PilotUP</a> when first mentioned.
14. The blog should provide genuine value first. PilotUP mentions should feel like natural recommendations, not ads.
15. Include a FAQ section at the end (before the conclusion) with 5-7 questions and answers. Questions should be phrased as real search queries people would type into Google related to the main keyword. Answers should be concise (2-3 sentences each).

HUMANIZATION RULES (CRITICAL):
- Vary sentence length deliberately. Mix short punchy sentences with longer ones. Some paragraphs should be just one sentence.
- Use contractions naturally (don't, isn't, you'll, we've, it's).
- Include occasional rhetorical questions to engage the reader.
- Add personal touches like "Here's the thing..." or "Look," or "The truth is..." at the start of some paragraphs.
- Use "you" and "your" to speak directly to the reader.
- Throw in colloquial phrases where appropriate ("at the end of the day", "let's be honest", "the bottom line").
- Don't start every paragraph or section with the same sentence structure. Vary your openings.
- Occasionally use incomplete sentences for emphasis. Like this.
- Avoid lists of exactly 3 or 5 points every time. Use 4, 6, or 7 to break the AI pattern.
- Don't over-explain obvious things. A human writer assumes the reader has some context.
- Use specific numbers and examples instead of vague claims (say "37% of teams" not "many teams").
- Include one or two slightly informal transitions like "So what does this mean for you?" or "Let's break this down."

ANTI-HALLUCINATION RULES (CRITICAL):
- DO NOT invent statistics, percentages, study results, or research findings. If you cite a number, it must be a well-known, widely reported fact.
- DO NOT attribute quotes to real people unless it's a famous, well-documented public quote.
- DO NOT invent case studies, company names, or success stories. If you need an example, use a hypothetical and clearly label it ("Imagine a SaaS startup that...").
- DO NOT reference specific research papers, reports, or surveys unless they are very widely known (like Gartner, McKinsey, or HubSpot annual reports).
- When sharing data or stats, use hedging language if you're not 100% certain: "reports suggest", "industry estimates put this at around", "according to widely cited research".
- If a claim is general knowledge, present it as such. Don't dress it up with fake sources.
- Stick to advice, strategies, and explanations you can back with logic rather than fabricated evidence.
- For the FAQ section, answer based on common knowledge and practical experience, not made-up data.

STRUCTURE:
- Engaging title (include main keyword)
- Introduction (2-3 paragraphs)
- 4-6 subheadings (H2) with content under each
- Optional H3 subheadings for detailed sections
- FAQ section (H2 "Frequently Asked Questions") with each question as an H3 and answer as a paragraph
- Conclusion

FAQ FORMAT: Use this exact HTML structure for the FAQ section:
<h2>Frequently Asked Questions</h2>
<div itemscope itemtype="https://schema.org/FAQPage">
  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">Question text here?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Answer text here.</p>
    </div>
  </div>
</div>

FORMAT: Write in clean HTML with proper heading tags (h1, h2, h3), paragraph tags (p), and list tags (ul, ol, li) where appropriate. Do not include any CSS styles or classes.

Return ONLY the blog HTML content, starting with the <h1> title tag.`;
}

export function buildMetaPrompt(
  mainKeyword: string,
  blogTitle: string,
  blogExcerpt: string
): string {
  return `Generate SEO metadata for a blog post published on the PilotUP blog (pilotup.io).

BLOG TITLE: "${blogTitle}"
MAIN KEYWORD: "${mainKeyword}"
BLOG EXCERPT: "${blogExcerpt}"

Generate the following in JSON format:
{
  "metaTitle": "SEO meta title - MUST be under 60 characters, include the main keyword",
  "metaDescription": "SEO meta description - MUST be under 160 characters, compelling, include main keyword, end with a call to action or value proposition",
  "ogTitle": "Open Graph title - Can be same as meta title or slightly different, under 60 characters",
  "ogDescription": "Open Graph description - Compelling social share text, under 160 characters",
  "excerpt": "A 2-3 sentence excerpt/summary of the blog post, under 300 characters",
  "slug": "url-friendly-slug-based-on-title",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
}

RULES:
- Do NOT use dashes (em dash or en dash) in any field
- Keep meta title under 60 characters
- Keep meta description under 160 characters
- Make the excerpt compelling and informative
- The slug should be lowercase, hyphenated, and SEO-friendly
- Include "PilotUP" in the OG description if it fits naturally
- Generate 8-10 highly relevant keywords for the blog post that complement the main keyword
- Keywords should be realistic, searchable terms related to the blog topic
- Avoid duplicate keywords

Return ONLY valid JSON, no markdown formatting or code blocks.`;
}

export function buildKeywordPackPrompt(
  context: { topic: string; domain: string; brandFocus: string },
  candidates: Array<{ keyword: string; sources: string[]; score: number; competitor?: string }>
): string {
  const list = candidates
    .map((c, i) => `${i + 1}. "${c.keyword}" [sources: ${c.sources.join(', ')}] score=${c.score}${c.competitor ? ` competitor=${c.competitor}` : ''}`)
    .join('\n');

  return `You are an SEO keyword strategist for ${context.domain} (PilotUP — ${context.brandFocus}).

TASK: Select exactly 30 PRIMARY keywords and exactly 3 SECONDARY keywords per primary from the CANDIDATE LIST below.

STRICT RULES (anti-hallucination):
- You may ONLY use keywords that appear VERBATIM in the candidate list (case-insensitive match is OK for selection, but output must match candidate spelling).
- Do NOT invent, paraphrase, or combine keywords into new phrases not in the list.
- Each secondary must be a different candidate keyword semantically related to its primary (same topic cluster: ${context.topic}).
- Prioritize candidates with multiple sources (google, bing, duckduckgo, competitor) and higher scores.
- Focus on keywords relevant to MVP: AI employees, virtual workforce, autonomous agents for business.
- Prefer commercial and informational intent that competitors rank for.

CANDIDATE LIST (${candidates.length} keywords from live Google, Bing, and DuckDuckGo fetches):
${list}

Return ONLY valid JSON in this shape:
{
  "keywords": [
    {
      "primary": "exact candidate phrase",
      "secondary": ["exact candidate", "exact candidate", "exact candidate"],
      "intent": "informational|commercial|transactional",
      "sources": ["google","bing"],
      "score": 5
    }
  ]
}

Output exactly 30 items in the keywords array.`;
}
