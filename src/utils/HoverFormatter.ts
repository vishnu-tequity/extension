import { IHoverFormatter, IAIExplanation } from "../types/index";

/** Maps each symbol type to a display icon and label. */
const TYPE_META: Record<
  NonNullable<IAIExplanation["type"]>,
  { icon: string; label: string }
> = {
  function:  { icon: "⚡", label: "Function" },
  class:     { icon: "🏗", label: "Class" },
  variable:  { icon: "📦", label: "Variable" },
  constant:  { icon: "🔒", label: "Constant" },
  interface: { icon: "📐", label: "Interface" },
  other:     { icon: "🔍", label: "Symbol" },
};

const FALLBACK_META = { icon: "🔍", label: "Symbol" };

/**
 * Converts an IAIExplanation into a formatted Markdown string for VS Code hover popups.
 * Single responsibility: presentation/formatting only.
 *
 * Code quality fix: multi-line details are prefixed line-by-line so the
 * blockquote renders correctly in VS Code's Markdown renderer.
 */
export class HoverFormatter implements IHoverFormatter {
  format(explanation: IAIExplanation): string {
    const meta = explanation.type !== undefined
      ? (TYPE_META[explanation.type] ?? FALLBACK_META)
      : FALLBACK_META;

    const lines: string[] = [];

    lines.push(`### ${meta.icon} ${meta.label} — AI Explanation`);
    lines.push("");
    lines.push(explanation.summary);

    if (explanation.details) {
      lines.push("");
      // Prefix every line with "> " so multi-line details render as a proper blockquote.
      const blockquote = explanation.details
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      lines.push(blockquote);
    }

    lines.push("");
    lines.push("---");
    lines.push("*Powered by Ollama (no internet needed)*");

    return lines.join("\n");
  }
}
