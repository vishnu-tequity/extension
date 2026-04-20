import * as vscode from "vscode";
import { IEnabledConfig, IServerConfig, IApiKeyConfig } from "../types/index";
import {
  CONFIG_SECTION,
  CONFIG_KEY_ENABLED,
  CONFIG_KEY_API_KEY,
  CONFIG_KEY_SERVER_URL,
  CONFIG_KEY_MODEL,
  DEFAULT_OLLAMA_URL,
  DEFAULT_MODEL,
} from "../config/constants";

/**
 * Reads extension configuration from the "aiHover" VS Code workspace settings.
 *
 * Implements all three narrow config interfaces (ISP) so extension.ts can
 * pass the same instance to whichever consumer needs it, typed correctly.
 */
export class ConfigService implements IEnabledConfig, IServerConfig, IApiKeyConfig {
  private get config() {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  isEnabled(): boolean {
    return this.config.get<boolean>(CONFIG_KEY_ENABLED, true);
  }

  getServerUrl(): string {
    return this.config.get<string>(CONFIG_KEY_SERVER_URL, DEFAULT_OLLAMA_URL);
  }

  getModel(): string {
    return this.config.get<string>(CONFIG_KEY_MODEL, DEFAULT_MODEL);
  }

  getApiKey(): string {
    return this.config.get<string>(CONFIG_KEY_API_KEY, "");
  }
}
