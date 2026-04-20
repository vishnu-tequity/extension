/**
 * All shared interfaces for the AI Hover Explainer extension.
 * Kept small and focused per Interface Segregation Principle (ISP).
 * Each interface has exactly one reason to change.
 */

/** Contextual information about the symbol being hovered. */
export interface ISymbolContext {
  word: string;
  surroundingCode: string; // ±5 lines around hovered line
  language: string;
  lineNumber: number;
}

/** Structured explanation returned by an AI service. */
export interface IAIExplanation {
  summary: string;
  details?: string;
  type?: "function" | "class" | "variable" | "constant" | "interface" | "other";
}

/** Contract for any AI provider — swap Ollama for Groq/OpenRouter freely. */
export interface IAIService {
  explain(context: ISymbolContext): Promise<IAIExplanation>;
}

/**
 * ISP: Split into two focused interfaces so consumers only depend on what they need.
 *
 * AIHoverProvider needs: IEnabledConfig (is the feature on?)
 * OllamaAIService needs: IServerConfig (where is the server, which model?)
 * SetApiKeyCommand needs: IApiKeyConfig (read/write the API key)
 */

/** Whether the extension is enabled — used by AIHoverProvider. */
export interface IEnabledConfig {
  isEnabled(): boolean;
}

/** Ollama server connection settings — used by OllamaAIService. */
export interface IServerConfig {
  getServerUrl(): string;
  getModel(): string;
}

/** API key storage — used by SetApiKeyCommand. */
export interface IApiKeyConfig {
  getApiKey(): string;
}

/** Contract for converting an IAIExplanation into a formatted string. */
export interface IHoverFormatter {
  format(explanation: IAIExplanation): string;
}

/** A single SOLID or space complexity issue found in a file. */
export interface ICodeIssue {
  principle: "S" | "O" | "L" | "I" | "D" | "Space Complexity";
  line?: number;
  message: string;
}

/** Full analysis result for a file. */
export interface ISOLIDAnalysis {
  file: string;
  issues: ICodeIssue[];
  clean: boolean;
}
