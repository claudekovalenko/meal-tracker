import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MealEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      portion: z.string(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  notes: z.string(),
});

export type MealEstimate = z.infer<typeof MealEstimateSchema>;

const SYSTEM_PROMPT = `You are a nutrition estimator for a calorie and macro tracking app. The user describes what they ate in everyday language. Break the description into individual food items and estimate calories, protein, carbohydrates, and fat for each, using standard references such as USDA FoodData Central and typical restaurant or package nutrition labels for named brands and chains.

- When a quantity is missing, assume a typical single serving and state it in \`portion\`.
- Include cooking oils, butter, dressings, and sauces that are implied by the description (e.g. "fried", "sauteed", "with ranch").
- Calories should be consistent with the macros (about 4 kcal/g protein and carbs, 9 kcal/g fat).
- Use \`notes\` for a short, plain-language list of the main assumptions you made, or an empty string if none.`;

/** Turns a free-text meal description into per-item calories and macros. */
export async function estimateMeal(description: string, apiKey: string): Promise<MealEstimate> {
  if (!apiKey) throw new Error("Add your Anthropic API key in Settings to calculate macros.");

  // The key belongs to the person using the app and is only stored on their device.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
      output_config: { effort: "medium", format: zodOutputFormat(MealEstimateSchema) },
      // If a request is declined, the API retries it on a recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error("Your Anthropic API key was rejected. Check it in Settings.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("Rate limited by the API. Wait a moment and try again.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error("Couldn't reach the Claude API. Check your connection.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(error.message);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new Error("Claude couldn't estimate this meal. Try rewording it.");
  }
  if (!response.parsed_output) {
    throw new Error("Got an unexpected response. Please try again.");
  }
  return response.parsed_output;
}
