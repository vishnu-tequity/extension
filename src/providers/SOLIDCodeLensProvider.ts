import * as vscode from "vscode";
import { ICodeIssue, ISOLIDAnalysis } from "../types/index";

/**
 * Provides CodeLens annotations above class/function definitions.
 * Single responsibility: display only — no analysis logic here.
 */
export class SOLIDCodeLensProvider implements vscode.CodeLensProvider {
  private readonly analyses = new Map<string, ISOLIDAnalysis>();
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.emitter.event;

  /** Called by FileSaveAnalysisProvider after each analysis completes. */
  updateAnalysis(uri: vscode.Uri, analysis: ISOLIDAnalysis): void {
    this.analyses.set(uri.toString(), analysis);
    this.emitter.fire();
  }

  clearAnalysis(uri: vscode.Uri): void {
    this.analyses.delete(uri.toString());
    this.emitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const analysis = this.analyses.get(document.uri.toString());
    if (!analysis || analysis.clean || analysis.issues.length === 0) {
      return [];
    }

    // Group issues by line number
    const byLine = new Map<number, ICodeIssue[]>();
    for (const issue of analysis.issues) {
      const line = Math.max(0, (issue.line ?? 1) - 1);
      const existing = byLine.get(line) ?? [];
      existing.push(issue);
      byLine.set(line, existing);
    }

    // Also add a summary lens at line 0
    const lenses: vscode.CodeLens[] = [];
    const summaryRange = new vscode.Range(0, 0, 0, 0);
    const total = analysis.issues.length;
    lenses.push(
      new vscode.CodeLens(summaryRange, {
        title: `⚠️ ${total} SOLID issue${total > 1 ? "s" : ""} found — hover lines for details`,
        command: "workbench.action.problems.focus",
      })
    );

    // Per-line lenses
    for (const [lineNum, issues] of byLine) {
      const safeLineNum = Math.min(lineNum, document.lineCount - 1);
      const range = new vscode.Range(safeLineNum, 0, safeLineNum, 0);
      const label = issues
        .map((i) => `⚠️ [${i.principle}]: ${i.message}`)
        .join("   ");

      lenses.push(new vscode.CodeLens(range, { title: label, command: "" }));
    }

    return lenses;
  }
}
