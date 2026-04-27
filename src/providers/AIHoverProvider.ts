import * as vscode from "vscode";
import { IAIService, IEnabledConfig, IHoverFormatter, ISymbolContext, IAIExplanation } from "../types/index";
import { CacheService } from "../services/CacheService";
import {
  HOVER_DEBOUNCE_MS,
  MIN_CALL_GAP_MS,
  RATE_LIMIT_COOLDOWN_MS,
  CACHE_TTL_SECONDS,
  MIN_WORD_LENGTH,
  SURROUNDING_LINES,
} from "../config/constants";

/**
 * VS Code HoverProvider that shows AI-generated symbol explanations on hover.
 * Single responsibility: orchestrating hover interactions.
 * Never imports concrete AI/config implementations — only interfaces.
 */
export class AIHoverProvider implements vscode.HoverProvider {
  private readonly cache: CacheService<IAIExplanation>;
  /** Tracks in-flight API requests to avoid duplicate calls for the same symbol. */
  private readonly inFlight = new Set<string>();
  /** Timestamp of last successful API call — enforces minimum gap between calls. */
  private lastCallAt = 0;
  /** Timestamp until which all calls are blocked (rate limit cooldown). */
  private cooldownUntil = 0;

  constructor(
    private readonly aiService: IAIService,
    private readonly configService: IEnabledConfig,
    private readonly formatter: IHoverFormatter
  ) {
    this.cache = new CacheService<IAIExplanation>(CACHE_TTL_SECONDS);
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    if (!this.configService.isEnabled()) {
      return null;
    }

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);
    if (!word || word.length < MIN_WORD_LENGTH) {
      return null;
    }

    const languageId = document.languageId;
    const cacheKey = `${languageId}:${word}:${position.line}`;

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return this.buildHover(cached, wordRange);
    }

    if (this.inFlight.has(cacheKey)) {
      return null;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, HOVER_DEBOUNCE_MS));

    if (token.isCancellationRequested) {
      return null;
    }

    const cachedAfterDelay = this.cache.get(cacheKey);
    if (cachedAfterDelay !== undefined) {
      return this.buildHover(cachedAfterDelay, wordRange);
    }

    const now = Date.now();
    if (now < this.cooldownUntil || now - this.lastCallAt < MIN_CALL_GAP_MS) {
      return null;
    }

    const surroundingCode = this.getSurroundingCode(document, position.line);
    const context: ISymbolContext = {
      word,
      surroundingCode,
      language: languageId,
      lineNumber: position.line,
    };

    this.inFlight.add(cacheKey);
    this.lastCallAt = Date.now();

    const statusBar = vscode.window.setStatusBarMessage("$(sync~spin) AI: analyzing...");

    try {
      const explanation = await this.aiService.explain(context);
      this.cache.set(cacheKey, explanation);
      return this.buildHover(explanation, wordRange);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
        this.cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        return this.buildErrorHover(
          "Rate limit reached. AI Hover will resume in ~1 minute.",
          wordRange
        );
      }

      if (message.toLowerCase().includes("econnrefused") || message.toLowerCase().includes("fetch failed")) {
        return this.buildErrorHover(
          "Ollama is not running. Start it with `ollama serve` in your terminal.",
          wordRange
        );
      }

      console.error("[AI Hover Explainer] Failed to get explanation:", err);
      return null;
    } finally {
      this.inFlight.delete(cacheKey);
      statusBar.dispose();
    }
  }

  private buildHover(
    explanation: IAIExplanation,
    wordRange: vscode.Range
  ): vscode.Hover {
    const md = new vscode.MarkdownString(this.formatter.format(explanation));
    md.isTrusted = true;
    return new vscode.Hover(md, wordRange);
  }

  private buildErrorHover(message: string, wordRange: vscode.Range): vscode.Hover {
    const md = new vscode.MarkdownString(`**AI Hover:** ${message}`);
    md.isTrusted = true;
    return new vscode.Hover(md, wordRange);
  }

  private getSurroundingCode(document: vscode.TextDocument, line: number): string {
    const start = Math.max(0, line - SURROUNDING_LINES);
    const end = Math.min(document.lineCount - 1, line + SURROUNDING_LINES);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) {
      lines.push(document.lineAt(i).text);
    }
    return lines.join("\n");
  }
}
