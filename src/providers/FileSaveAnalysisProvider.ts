import * as vscode from "vscode";
import { SOLIDAnalyzerService } from "../services/SOLIDAnalyzerService";
import { SOLIDCodeLensProvider } from "./SOLIDCodeLensProvider";
import { ICodeIssue } from "../types/index";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];

/**
 * Listens for file save events and triggers SOLID + space complexity analysis.
 * Single responsibility: VS Code event wiring and notification display only.
 * Does not know how analysis works — delegates entirely to SOLIDAnalyzerService.
 */
export class FileSaveAnalysisProvider {
  private readonly diagnostics: vscode.DiagnosticCollection;
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly analyzer: SOLIDAnalyzerService,
    private readonly codeLens: SOLIDCodeLensProvider
  ) {
    this.diagnostics = vscode.languages.createDiagnosticCollection("solid-analysis");
  }

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.diagnostics);
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => this.onSave(doc))
    );
  }

  private onSave(doc: vscode.TextDocument): void {
    const ext = this.getExtension(doc.fileName);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return;
    }

    // Cancel previous pending analysis for this file
    const existing = this.debounceTimers.get(doc.fileName);
    if (existing) {
      clearTimeout(existing);
    }

    // Wait 2s — if user saves again within 2s, restart the timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(doc.fileName);
      this.runAnalysis(doc);
    }, 2000);

    this.debounceTimers.set(doc.fileName, timer);
  }

  private async runAnalysis(doc: vscode.TextDocument): Promise<void> {

    const fileName = doc.fileName.split("/").pop() ?? doc.fileName;
    const statusMsg = vscode.window.setStatusBarMessage(`$(sync~spin) Analyzing ${fileName}...`);

    try {
      const result = await this.analyzer.analyze(fileName, doc.getText());

      // Clear previous diagnostics for this file
      this.diagnostics.delete(doc.uri);

      if (result.clean || result.issues.length === 0) {
        this.codeLens.clearAnalysis(doc.uri);
        vscode.window.setStatusBarMessage(`$(check) ${fileName}: No SOLID issues found`, 4000);
        return;
      }

      // Update CodeLens above class/function lines
      this.codeLens.updateAnalysis(doc.uri, result);

      // Show inline diagnostics (squiggly lines in editor)
      this.showDiagnostics(doc, result.issues);

      // Show notification with summary
      this.showNotification(fileName, result.issues);
    } finally {
      statusMsg.dispose();
    }
  }

  private showDiagnostics(doc: vscode.TextDocument, issues: ICodeIssue[]): void {
    const vsDiagnostics = issues.map((issue) => {
      const line = Math.max(0, (issue.line ?? 1) - 1);
      const range = doc.lineAt(Math.min(line, doc.lineCount - 1)).range;
      const diag = new vscode.Diagnostic(
        range,
        `[${issue.principle}] ${issue.message}`,
        vscode.DiagnosticSeverity.Error
      );
      diag.source = "SOLID Analyzer";
      return diag;
    });

    this.diagnostics.set(doc.uri, vsDiagnostics);
  }

  private showNotification(fileName: string, issues: ICodeIssue[]): void {
    const lines = issues.map((i) => {
      const loc = i.line ? ` (line ${i.line})` : "";
      return `• [${i.principle}]${loc}: ${i.message}`;
    });

    const message = `⚠️ ${fileName} — ${issues.length} issue${issues.length > 1 ? "s" : ""} found:\n${lines.join("\n")}`;

    vscode.window.showWarningMessage(message, "Show in Editor").then((action) => {
      if (action === "Show in Editor") {
        vscode.commands.executeCommand("workbench.action.problems.focus");
      }
    });
  }

  private getExtension(filePath: string): string {
    const parts = filePath.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : "";
  }
}
