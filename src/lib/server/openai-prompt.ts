/** Coach / suggest export prompts only — not a general ChatGPT proxy. */
const MAX_OPENAI_PROMPT = 16_000;

export function openAiPromptError(prompt: string): string | null {
  const text = prompt.trim();
  if (!text) return "Prompt is empty.";
  if (text.length > MAX_OPENAI_PROMPT) {
    return "Prompt is too long for one request.";
  }
  if (!text.includes("Game of Thrones: Dragonfire")) {
    return "Only Dragonfire Copilot export prompts are supported.";
  }
  if (
    !/You are (coaching|building three-dragon) a Game of Thrones: Dragonfire player/i.test(
      text,
    )
  ) {
    return "Only Dragonfire Copilot export prompts are supported.";
  }
  if (!text.includes("Game facts:") && !text.includes("--- Roster ---")) {
    return "Only Dragonfire Copilot export prompts are supported.";
  }
  return null;
}

export { MAX_OPENAI_PROMPT };