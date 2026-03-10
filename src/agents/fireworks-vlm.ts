import { isRecord } from "../utils.js";
import { normalizeSecretInput } from "../utils/normalize-secret-input.js";

/**
 * Fireworks VLM client for Kimi models.
 */
export async function fireworksUnderstandImage(params: {
  apiKey: string;
  prompt: string;
  imageDataUrl: string;
  modelId?: string;
  apiHost?: string;
}): Promise<string> {
  const apiKey = normalizeSecretInput(params.apiKey);
  if (!apiKey) {
    throw new Error("Fireworks VLM: apiKey required");
  }
  const prompt = params.prompt.trim();
  if (!prompt) {
    throw new Error("Fireworks VLM: prompt required");
  }
  const imageDataUrl = params.imageDataUrl.trim();
  if (!imageDataUrl) {
    throw new Error("Fireworks VLM: imageDataUrl required");
  }

  const modelId = params.modelId || "accounts/fireworks/models/kimi-v1.5-vision-instruct";
  const host = params.apiHost || "https://api.fireworks.ai/inference/v1";
  const url = `${host}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Fireworks VLM request failed (${res.status} ${res.statusText}). Body: ${body.slice(0, 400)}`,
    );
  }

  const json = await res.json().catch(() => null);
  if (!isRecord(json) || !Array.isArray(json.choices) || json.choices.length === 0) {
    throw new Error("Fireworks VLM response was not in expected OpenAI format.");
  }

  const content = json.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Fireworks VLM returned no text content.");
  }

  return content.trim();
}
