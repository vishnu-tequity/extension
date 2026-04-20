import * as vscode from "vscode";
import { COMMAND_SET_API_KEY, CONFIG_SECTION, CONFIG_KEY_API_KEY } from "../config/constants";

/**
 * Command that prompts the user to enter an optional API key and saves it globally.
 * For Ollama (local), this field is not required.
 * Single responsibility: API key capture and persistence.
 */
export class SetApiKeyCommand {
  static readonly COMMAND_ID = COMMAND_SET_API_KEY;

  async execute(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your API key (not required for local Ollama)",
      placeHolder: "Leave empty for Ollama (local model)",
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey === undefined) {
      return;
    }

    await vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .update(CONFIG_KEY_API_KEY, apiKey.trim(), vscode.ConfigurationTarget.Global);

    await vscode.window.showInformationMessage("✅ AI Hover: Settings saved!");
  }
}
