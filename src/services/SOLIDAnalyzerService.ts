import { IServerConfig, ISOLIDAnalysis, ICodeIssue } from "../types/index";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from "../config/constants";


/**
 * Sends file content to Ollama and returns SOLID + space complexity issues.
 * Single responsibility: AI-based static analysis only.
 * DIP: depends on IServerConfig abstraction, not concrete ConfigService.
 */
export class SOLIDAnalyzerService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(serverConfig?: IServerConfig) {
    this.baseUrl = serverConfig?.getServerUrl() ?? DEFAULT_OLLAMA_URL;
    this.model   = serverConfig?.getModel()     ?? DEFAULT_MODEL;
  }

  async analyze(fileName: string, fileContent: string): Promise<ISOLIDAnalysis> {
    const provider = createOpenAI({ baseURL: this.baseUrl, apiKey: "ollama" });

    const prompt = this.buildPrompt(fileName, fileContent);

    try {
      const { text } = await generateText({
        model: provider(this.model),
        prompt,
        maxOutputTokens: 400,
        temperature: 0.1,
      });

      const result = this.parseResponse(fileName, text.trim());
      this.debugCallback?.(`Found ${result.issues.length} issues: ${result.issues.map(i => i.principle).join(", ") || "none"}`);
      return result;
    } catch (e) {
      this.debugCallback?.(`ERROR: ${String(e)}`);
      return { file: fileName, issues: [], clean: true };
    }
  }

  /** Set this to receive debug output in VS Code notifications. */
  debugCallback?: (msg: string) => void;

  private buildPrompt(fileName: string, code: string): string {
    return (
      `Analyze this code for SOLID violations and space complexity issues.\n` +
      `For each issue found, write one line in EXACTLY this format:\n` +
      `ISSUE|<principle>|<line>|<message>\n\n` +
      `Where <principle> is one of: S, O, L, I, D, Space Complexity\n` +
      `Where <line> is the line number (just a number)\n` +
      `Where <message> is a short description\n\n` +
      `Example output:\n` +
      `ISSUE|S|1|UserManager handles users, email, DB and logging — too many responsibilities\n` +
      `ISSUE|O|32|PaymentProcessor uses if/else for types instead of polymorphism\n` +
      `ISSUE|Space Complexity|47|allEvents array grows unbounded with no size limit\n\n` +
      `Code:\n${code}\n\n` +
      `List ALL issues found, one per line, starting with ISSUE|`
    );
  }

  private parseResponse(fileName: string, rawText: string): ISOLIDAnalysis {
    const issues: ICodeIssue[] = [];
    const seen = new Set<string>();

    const PATTERNS: Array<{ regex: RegExp; principle: ICodeIssue["principle"] }> = [
      { regex: /single\s*responsibility|multiple\s*responsibilit|too\s*many\s*responsibilit|does\s*too\s*many/i, principle: "S" },
      { regex: /open.closed|if.else\s*chain|modify\s*(the\s*)?class|adding\s*new\s*type/i,                     principle: "O" },
      { regex: /liskov|subclass|override|substitut/i,                                                           principle: "L" },
      { regex: /interface\s*segregat|unused\s*method|forced\s*to\s*implement/i,                                 principle: "I" },
      { regex: /dependency\s*invers|depend\s*on\s*concret|hardcoded\s*depend/i,                                 principle: "D" },
      { regex: /unbounded|grows\s*forever|no\s*(size\s*)?limit|memory\s*leak|infinite\s*grow/i,                 principle: "Space Complexity" },
    ];

    for (const line of rawText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) { continue; }

      // Extract line number if mentioned e.g. "line 47" or "Line 47:"
      const lineMatch = trimmed.match(/\bline\s+(\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

      for (const { regex, principle } of PATTERNS) {
        if (regex.test(trimmed)) {
          const key = `${principle}`;
          if (seen.has(key)) { continue; } // deduplicate same principle
          seen.add(key);

          // Clean up message — remove numbering, ISSUE| prefixes, trim to 100 chars
          const message = trimmed
            .replace(/^\d+\.\s*/, "")
            .replace(/^ISSUE\|[^|]+\|\d+\|/, "")
            .slice(0, 100);
          issues.push({ principle, line: lineNum, message });
          break;
        }
      }
    }

    return { file: fileName, issues, clean: issues.length === 0 };
  }
}
