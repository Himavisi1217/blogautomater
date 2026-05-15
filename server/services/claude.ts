/** Claude via AgentRouter (shared by generate + keyword research). */
export async function generateWithClaude(prompt: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
  if (!key) throw new Error('Claude/AgentRouter API key is not configured');

  const authToken = process.env.AGENTROUTER_AUTH_TOKEN || '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  const response = await fetch('https://agentrouter.org/v1/messages', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      Authorization: `Bearer ${authToken}`,
      'anthropic-version': '2023-06-01',
      Originator: 'codex_cli_rs',
      'User-Agent': 'codex_cli_rs/0.101.0 (Windows; x64)',
      Version: '0.101.0',
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
    let errJson: Record<string, unknown> = {};
    try {
      errJson = JSON.parse(errBody);
    } catch {
      /* ignore */
    }
    const msg = (errJson?.error as { message?: string })?.message || errBody;
    if (response.status === 503) {
      throw new Error('AgentRouter has no available quota right now. Try again later.');
    }
    if (response.status === 403) {
      throw new Error(`Model not allowed by your AgentRouter token: ${msg}`);
    }
    throw new Error(`AgentRouter error (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  return textBlock?.text || '';
}
