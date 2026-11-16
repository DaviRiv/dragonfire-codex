const DEFAULT_MODEL = "gpt-4o-mini";

export function openaiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  return key.length >= 20;
}

function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export async function openaiComplete(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
      temperature: 0.6,
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    const message = payload.error?.message ?? `OpenAI HTTP ${response.status}`;
    if (response.status === 429) throw new Error(`OPENAI_RATE_LIMIT:${message}`);
    if (response.status === 401) throw new Error("OPENAI_AUTH");
    throw new Error(message);
  }
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI returned an empty reply.");
  return text;
}