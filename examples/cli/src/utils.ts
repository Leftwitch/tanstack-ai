import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import type { AIAdapter } from "@tanstack/ai";

export const API_KEY_URLS = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/app/apikey",
  ollama: "https://ollama.ai/download",
};

export function getApiKeyUrl(provider: string): string {
  const key = provider.toLowerCase();
  return API_KEY_URLS[key as keyof typeof API_KEY_URLS] || "";
}

export async function saveApiKeyToEnv(
  envVarName: string,
  apiKey: string
): Promise<boolean> {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Check if the key already exists
    const regex = new RegExp(`^${envVarName}=.*$`, "m");
    if (regex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(regex, `${envVarName}=${apiKey}`);
    } else {
      // Add new key
      if (envContent && !envContent.endsWith("\n")) {
        envContent += "\n";
      }
      envContent += `${envVarName}=${apiKey}\n`;
    }

    // Write the updated content
    fs.writeFileSync(envPath, envContent);
    console.log(chalk.green(`✅ API key saved to .env file`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to save API key: ${error}`));
    return false;
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return "***";
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export async function validateApiKey(
  adapter: AIAdapter,
  provider: string
): Promise<boolean> {
  try {
    // Make a minimal test request to validate the key
    const testMessages = [{ role: "user" as const, content: "Hi" }];

    switch (provider.toLowerCase()) {
      case "openai":
      case "anthropic":
      case "gemini":
        await adapter.chatCompletion({
          model:
            provider === "gemini"
              ? "gemini-pro"
              : provider === "anthropic"
              ? "claude-3-haiku-20240307"
              : "gpt-3.5-turbo",
          messages: testMessages,
          maxTokens: 1,
        });
        return true;
      case "ollama":
        // For Ollama, just check if we can list models
        try {
          await adapter.chatCompletion({
            model: "llama2",
            messages: testMessages,
            maxTokens: 1,
          });
        } catch (error: any) {
          // If the error is about the model not being found, the connection is OK
          if (
            error.message?.includes("model") ||
            error.message?.includes("not found")
          ) {
            return true;
          }
          throw error;
        }
        return true;
      default:
        return false;
    }
  } catch (error: any) {
    // Check for specific authentication errors
    if (
      error.message?.includes("401") ||
      error.message?.includes("403") ||
      error.message?.includes("API key") ||
      error.message?.includes("authentication") ||
      error.message?.includes("Invalid") ||
      error.message?.includes("Incorrect")
    ) {
      return false;
    }
    // Other errors might be network issues, not auth issues
    throw error;
  }
}
