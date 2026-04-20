import * as vscode from "vscode";
import { ConfigService } from "./services/ConfigService";
import { OllamaAIService } from "./services/OllamaAIService";
import { SOLIDAnalyzerService } from "./services/SOLIDAnalyzerService";
import { HoverFormatter } from "./utils/HoverFormatter";
import { AIHoverProvider } from "./providers/AIHoverProvider";
import { FileSaveAnalysisProvider } from "./providers/FileSaveAnalysisProvider";
import { SOLIDCodeLensProvider } from "./providers/SOLIDCodeLensProvider";
import { SetApiKeyCommand } from "./commands/SetApiKeyCommand";

const SUPPORTED_LANGUAGES = [
  "typescript",
  "javascript",
  "typescriptreact",
  "javascriptreact",
  "python",
  "go",
  "java",
  "rust",
  "cpp",
  "c",
];

/**
 * Extension entry point — composition root only.
 * All dependency wiring happens here; no business logic.
 *
 * DIP in action: each service receives its dependency as an interface,
 * not a concrete import. Swapping Ollama for another provider means
 * changing only this file.
 */
export function activate(context: vscode.ExtensionContext): void {
  const configService = new ConfigService();

  // OllamaAIService receives IServerConfig — reads URL/model from user settings.
  const aiService = new OllamaAIService(configService);
  const formatter = new HoverFormatter();

  // SOLID analyzer — same server config, separate responsibility
  const solidAnalyzer = new SOLIDAnalyzerService(configService);
  const codeLensProvider = new SOLIDCodeLensProvider();
  const fileSaveProvider = new FileSaveAnalysisProvider(solidAnalyzer, codeLensProvider);
  fileSaveProvider.register(context);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: "typescript" },
        { language: "javascript" },
        { language: "typescriptreact" },
        { language: "javascriptreact" },
        { language: "python" },
      ],
      codeLensProvider
    )
  );

  // AIHoverProvider receives IEnabledConfig — only knows about on/off state.
  const hoverProvider = new AIHoverProvider(aiService, configService, formatter);

  for (const language of SUPPORTED_LANGUAGES) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider({ language, scheme: "file" }, hoverProvider)
    );
  }

  const setApiKeyCommand = new SetApiKeyCommand();
  context.subscriptions.push(
    vscode.commands.registerCommand(SetApiKeyCommand.COMMAND_ID, () =>
      setApiKeyCommand.execute()
    )
  );

  // ConfigService reads live on every call — no rebuild needed on config change.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {})
  );
}

export function deactivate(): void {
  // VS Code cleans up context.subscriptions automatically.
}
