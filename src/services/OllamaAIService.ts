import { IAIService, IAIExplanation, ISymbolContext, IServerConfig } from "../types/index";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from "../config/constants";

/** Shape of a valid JSON response we expect from the model. */
interface AIJsonResponse {
  type?: "function" | "class" | "variable" | "constant" | "interface" | "other";
  summary: string;
  details?: string;
}

/**
 * Uses Vercel AI SDK to call an Ollama instance (local or remote).
 * Ollama exposes an OpenAI-compatible REST API.
 *
 * OCP: closed for modification — behaviour changes via IServerConfig injection,
 *      not by editing this class.
 * DIP: depends on IServerConfig abstraction, not a concrete ConfigService.
 */
export class OllamaAIService implements IAIService {
  private readonly baseUrl: string;
  private readonly model: string;

  /**
   * @param serverConfig  Supplies server URL and model name at runtime.
   *                      Defaults keep the class usable without any config wiring.
   */
  constructor(serverConfig?: IServerConfig) {
    this.baseUrl = serverConfig?.getServerUrl() ?? DEFAULT_OLLAMA_URL;
    this.model   = serverConfig?.getModel()     ?? DEFAULT_MODEL;
  }

  protected buildPrompt(context: ISymbolContext): string {
    return (
      `You are a code documentation assistant. Analyze the symbol "${context.word}" ` +
      `in the following ${context.language} code snippet (line ${context.lineNumber + 1} is the focus):\n\n` +
      `\`\`\`${context.language}\n${context.surroundingCode}\n\`\`\`\n\n` +
      `Reply with ONLY valid JSON in this exact format (no markdown, no extra text):\n` +
      `{"type":"function|class|variable|constant|interface|other","summary":"one sentence explaining what ${context.word} is","details":"1-2 sentences with additional context (optional)"}`
    );
  }

  async explain(context: ISymbolContext): Promise<IAIExplanation> {
    const provider = createOpenAI({
      baseURL: this.baseUrl,
      apiKey: "ollama",
    });

    const { text } = await generateText({
      model: provider(this.model),
      prompt: this.buildPrompt(context),
      maxOutputTokens: 200,
      temperature: 0.2,
    });

    return this.parseResponse(text.trim());
  }

  private parseResponse(rawText: string): IAIExplanation {
    try {
      const parsed = JSON.parse(rawText) as AIJsonResponse;
      return {
        summary: parsed.summary ?? rawText,
        details: parsed.details,
        type: parsed.type,
      };
    } catch {
      const firstLine =
        rawText.split("\n").find((line) => line.trim() !== "") ?? rawText;
      return { summary: firstLine };
    }
  }
}
