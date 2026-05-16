import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { buildBlogPrompt, buildMetaPrompt } from '../prompts.js';

export const generateRouter = Router();

// Generate blog post
generateRouter.post('/blog', async (req: Request, res: Response) => {
  try {
    const {
      mainKeyword,
      secondaryKeywords,
      tone = 'conversational',
      wordCount = 1500,
      provider = 'gemini',
      apiKey,
    } = req.body;

    if (!mainKeyword) {
      res.status(400).json({ error: 'Main keyword is required' });
      return;
    }

    const secondaryKws = Array.isArray(secondaryKeywords)
      ? secondaryKeywords
      : secondaryKeywords?.split(',').map((k: string) => k.trim()).filter(Boolean) || [];

    const blogPrompt = buildBlogPrompt(mainKeyword, secondaryKws, tone, wordCount);

    let blogContent: string;

    if (provider === 'gemini') {
      blogContent = await generateWithGemini(blogPrompt, apiKey || process.env.GEMINI_API_KEY || '');
    } else if (provider === 'claude') {
      blogContent = await generateWithClaude(blogPrompt, apiKey || process.env.ANTHROPIC_API_KEY || '');
    } else if (provider === 'groq') {
      blogContent = await generateWithGroq(blogPrompt, apiKey || process.env.GROQ_API_KEY || '');
    } else {
      res.status(400).json({ error: 'Invalid provider. Use "gemini", "claude", or "groq"' });
      return;
    }

    // Clean up any stray dashes
    blogContent = cleanContent(blogContent);

    // Enforce strict word count
    blogContent = enforceWordCount(blogContent, wordCount);

    // Extract title from content
    const titleMatch = blogContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1] : mainKeyword;

    // Get first paragraph as excerpt basis
    const firstP = blogContent.match(/<p[^>]*>(.*?)<\/p>/i);
    const excerptBasis = firstP ? firstP[1].replace(/<[^>]*>/g, '').substring(0, 200) : '';

    res.json({
      success: true,
      blog: {
        title,
        content: blogContent,
        mainKeyword,
        secondaryKeywords: secondaryKws,
        provider,
        generatedAt: new Date().toISOString(),
        excerptBasis,
      },
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message || 'Blog generation failed' });
  }
});

// Generate SEO metadata
generateRouter.post('/meta', async (req: Request, res: Response) => {
  try {
    const { mainKeyword, blogTitle, blogExcerpt, provider = 'gemini', apiKey } = req.body;

    const metaPrompt = buildMetaPrompt(mainKeyword, blogTitle, blogExcerpt);

    let metaRaw: string;

    if (provider === 'gemini') {
      metaRaw = await generateWithGemini(metaPrompt, apiKey || process.env.GEMINI_API_KEY || '');
    } else if (provider === 'claude') {
      metaRaw = await generateWithClaude(metaPrompt, apiKey || process.env.ANTHROPIC_API_KEY || '');
    } else {
      metaRaw = await generateWithGroq(metaPrompt, apiKey || process.env.GROQ_API_KEY || '');
    }

    // Parse JSON from response
    const jsonMatch = metaRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: 'Failed to parse metadata response' });
      return;
    }

    const meta = JSON.parse(jsonMatch[0]);

    // Enforce character limits
    if (meta.metaTitle && meta.metaTitle.length > 60) {
      meta.metaTitle = meta.metaTitle.substring(0, 57) + '...';
    }
    if (meta.metaDescription && meta.metaDescription.length > 160) {
      meta.metaDescription = meta.metaDescription.substring(0, 157) + '...';
    }

    res.json({ success: true, meta });
  } catch (error: any) {
    console.error('Meta generation error:', error);
    res.status(500).json({ error: error.message || 'Metadata generation failed' });
  }
});

// Test AI provider connection
generateRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('Say "connected" in one word.');
      res.json({ success: true, message: 'Gemini connected successfully' });
    } else if (provider === 'claude') {
      // Claude via AgentRouter — requires both API key and auth token
      const authToken = process.env.AGENTROUTER_AUTH_TOKEN || '';
      const response = await fetch('https://agentrouter.org/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${authToken}`,
          'anthropic-version': '2023-06-01',
          'Originator': 'codex_cli_rs',
          'User-Agent': 'codex_cli_rs/0.101.0 (Windows; x64)',
          'Version': '0.101.0',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        let errJson: any = {};
        try { errJson = JSON.parse(errBody); } catch {}
        const msg = errJson?.error?.message || errBody;

        if (response.status === 503) {
          throw new Error('AgentRouter has no available quota right now. Try again later or switch to Groq.');
        }
        if (response.status === 403) {
          throw new Error(`Model not allowed by your AgentRouter token: ${msg}`);
        }
        throw new Error(`AgentRouter returned ${response.status}: ${msg}`);
      }

      res.json({ success: true, message: 'Claude connected via AgentRouter' });
    } else if (provider === 'groq') {
      const groq = new Groq({ apiKey });
      await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
      });
      res.json({ success: true, message: 'Groq connected successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid provider' });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Provider implementations =====

async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

async function generateWithClaude(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Claude/AgentRouter API key is not configured');

  // Use direct fetch to AgentRouter with both API key and auth token
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
  const authToken = process.env.AGENTROUTER_AUTH_TOKEN || '';

  const response = await fetch('https://agentrouter.org/v1/messages', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Authorization': `Bearer ${authToken}`,
      'anthropic-version': '2023-06-01',
      'Originator': 'codex_cli_rs',
      'User-Agent': 'codex_cli_rs/0.101.0 (Windows; x64)',
      'Version': '0.101.0',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errBody = await response.text();
    let errJson: any = {};
    try { errJson = JSON.parse(errBody); } catch {}
    const msg = errJson?.error?.message || errBody;

    if (response.status === 503) {
      throw new Error('AgentRouter has no available quota right now. Try again later or switch to Groq.');
    }
    if (response.status === 403) {
      throw new Error(`Model not allowed by your AgentRouter token: ${msg}`);
    }
    throw new Error(`AgentRouter error (${response.status}): ${msg}`);
  }

  const data = await response.json();

  // Anthropic response format: { content: [{ type: "text", text: "..." }] }
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || '';
}

async function generateWithGroq(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured');

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 16384,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.choices[0]?.message?.content || '';
}

function cleanContent(content: string): string {
  // Remove em dashes and en dashes
  content = content.replace(/—/g, ', ');
  content = content.replace(/–/g, ', ');
  content = content.replace(/ - /g, ', ');

  // Remove markdown code block wrappers if present
  content = content.replace(/^```html\s*/i, '');
  content = content.replace(/\s*```$/i, '');

  return content.trim();
}

function countWords(html: string): number {
  // Strip HTML tags and count words
  const text = html
    .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  return text.split(' ').filter(word => word.length > 0).length;
}

function enforceWordCount(html: string, targetWordCount: number): string {
  const tolerance = Math.round(targetWordCount * 0.05); // 5% tolerance
  const minWords = targetWordCount - tolerance;
  const maxWords = targetWordCount + tolerance;
  
  const currentWords = countWords(html);
  
  // If within tolerance, return as-is
  if (currentWords >= minWords && currentWords <= maxWords) {
    return html;
  }
  
  // If way over (more than 10% over max), truncate smartly
  if (currentWords > targetWordCount + Math.round(targetWordCount * 0.1)) {
    // Try to truncate FAQ first (less critical than main content + conclusion)
    let truncated = truncateFAQIfNeeded(html, maxWords);
    let wordCount = countWords(truncated);
    
    // If still over, remove from end while preserving conclusion structure
    if (wordCount > maxWords) {
      truncated = truncateFromEndGracefully(truncated, maxWords);
    }
    
    return truncated.trim();
  }
  
  // If slightly over tolerance, just return (close enough)
  return html;
}

function truncateFAQIfNeeded(html: string, maxWords: number): string {
  const faqMatch = html.match(/<h2>Frequently Asked Questions<\/h2>([\s\S]*?)(?=<h2>|<\/h2>|$)/i);
  if (!faqMatch) return html;
  
  const beforeFAQ = html.substring(0, faqMatch.index || 0);
  const wordsBefore = countWords(beforeFAQ);
  
  // If main content alone is already near target, remove FAQ entirely
  if (wordsBefore > maxWords * 0.85) {
    return beforeFAQ + '<h2>Key Takeaways</h2><p>The information above should give you a solid foundation on this topic.</p>';
  }
  
  // Otherwise, truncate FAQ to fit
  const faqContent = faqMatch[1];
  const faqWords = maxWords - wordsBefore;
  let truncatedFAQ = faqContent;
  
  // Remove FAQ items from the end until we fit
  while (countWords(beforeFAQ + truncatedFAQ) > maxWords && truncatedFAQ.length > 100) {
    const lastDivIdx = truncatedFAQ.lastIndexOf('</div>');
    if (lastDivIdx <= 0) break;
    truncatedFAQ = truncatedFAQ.substring(0, lastDivIdx);
  }
  
  return beforeFAQ + '<h2>Frequently Asked Questions</h2>' + truncatedFAQ + '</div></div>';
}

function truncateFromEndGracefully(html: string, maxWords: number): string {
  let truncated = html;
  let wordCount = countWords(truncated);
  
  // Identify sections: main content, conclusion, etc.
  const sections: Array<{ tag: string; start: number; end: number }> = [];
  
  // Find all h2 sections
  const h2Regex = /<h2[^>]*>([^<]+)<\/h2>/gi;
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    const nextH2 = html.indexOf('<h2', match.index + 1);
    const sectionEnd = nextH2 > 0 ? nextH2 : html.length;
    sections.push({
      tag: match[1],
      start: match.index,
      end: sectionEnd,
    });
  }
  
  // Remove sections from the end, preferring to keep main content and conclusion
  for (let i = sections.length - 1; i >= 0 && wordCount > maxWords; i--) {
    const section = sections[i];
    // Keep conclusion and main keyword sections, remove others
    if (section.tag.toLowerCase().includes('conclusion') || 
        section.tag.toLowerCase().includes('key takeaway')) {
      break; // Stop, preserve conclusion
    }
    
    // Remove this section
    truncated = truncated.substring(0, section.start) + truncated.substring(section.end);
    wordCount = countWords(truncated);
  }
  
  // Ensure we end with a proper conclusion
  if (!truncated.includes('Conclusion') && !truncated.includes('conclusion')) {
    truncated = truncated + '<h2>Conclusion</h2><p>The key takeaway is clear: understanding and implementing these strategies will set you up for success.</p>';
  }
  
  // Close any unclosed divs
  const openDivs = (truncated.match(/<div[^>]*>/g) || []).length;
  const closeDivs = (truncated.match(/<\/div>/g) || []).length;
  for (let i = closeDivs; i < openDivs; i++) {
    truncated += '</div>';
  }
  
  return truncated.trim();
}
