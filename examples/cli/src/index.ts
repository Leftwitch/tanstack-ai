import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import * as dotenv from "dotenv";
import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";
import { AnthropicAdapter } from "@tanstack/ai-anthropic";
import { OllamaAdapter } from "@tanstack/ai-ollama";
import { GeminiAdapter } from "@tanstack/ai-gemini";
import type { AIAdapter, Message } from "@tanstack/ai";
import {
  getApiKeyUrl,
  saveApiKeyToEnv,
  maskApiKey,
  validateApiKey,
} from "./utils.js";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("tanstack-ai")
  .description("TanStack AI CLI - Open source AI SDK demo")
  .version("0.1.0");

program
  .command("chat")
  .description("Interactive chat with AI models")
  .option(
    "-p, --provider <provider>",
    "AI provider (openai, anthropic, ollama, gemini)",
    "openai"
  )
  .option("-m, --model <model>", "Model to use")
  .option(
    "-k, --api-key <key>",
    "API key (can also be set via environment variable)"
  )
  .action(async (options) => {
    await runChat(options);
  });

program
  .command("generate")
  .description("Generate text from a prompt")
  .option(
    "-p, --provider <provider>",
    "AI provider (openai, anthropic, ollama, gemini)",
    "openai"
  )
  .option("-m, --model <model>", "Model to use")
  .option(
    "-k, --api-key <key>",
    "API key (can also be set via environment variable)"
  )
  .option("--prompt <prompt>", "Text prompt")
  .action(async (options) => {
    await runGenerate(options);
  });

program
  .command("summarize")
  .description("Summarize text")
  .option(
    "-p, --provider <provider>",
    "AI provider (openai, anthropic, ollama, gemini)",
    "openai"
  )
  .option("-m, --model <model>", "Model to use")
  .option(
    "-k, --api-key <key>",
    "API key (can also be set via environment variable)"
  )
  .option("--text <text>", "Text to summarize")
  .option(
    "--style <style>",
    "Summary style (bullet-points, paragraph, concise)",
    "paragraph"
  )
  .action(async (options) => {
    await runSummarize(options);
  });

program
  .command("embed")
  .description("Generate embeddings for text")
  .option(
    "-p, --provider <provider>",
    "AI provider (openai, ollama, gemini)",
    "openai"
  )
  .option("-m, --model <model>", "Model to use")
  .option(
    "-k, --api-key <key>",
    "API key (can also be set via environment variable)"
  )
  .option("--text <text>", "Text to embed")
  .action(async (options) => {
    await runEmbed(options);
  });

async function promptForApiKey(
  provider: string,
  envVarName: string
): Promise<string> {
  console.log(chalk.yellow(`\n⚠️  No API key found for ${provider}.\n`));

  const apiUrl = getApiKeyUrl(provider.toLowerCase().replace(" ", ""));
  if (apiUrl) {
    console.log(chalk.cyan(`📝 Get your API key at: ${apiUrl}\n`));
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${provider} API key:`,
      mask: "*",
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return "API key is required";
        }
        return true;
      },
    },
  ]);

  // Ask if they want to save it
  const { saveKey } = await inquirer.prompt([
    {
      type: "confirm",
      name: "saveKey",
      message: "Would you like to save this API key to your .env file?",
      default: true,
    },
  ]);

  if (saveKey) {
    const saved = await saveApiKeyToEnv(envVarName, apiKey);
    if (saved) {
      console.log(
        chalk.gray(
          `\nNote: The .env file has been updated. Make sure it's in your .gitignore!\n`
        )
      );
    }
  } else {
    console.log(
      chalk.gray(
        `\nTo set it permanently, add ${envVarName}=${maskApiKey(
          apiKey
        )} to your .env file\n`
      )
    );
  }

  return apiKey;
}

async function createAdapter(
  provider: string,
  apiKey?: string
): Promise<AIAdapter> {
  let adapter: AIAdapter;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      switch (provider.toLowerCase()) {
        case "openai":
          let openaiKey = apiKey || process.env.OPENAI_API_KEY;
          if (!openaiKey || attempts > 0) {
            openaiKey = await promptForApiKey("OpenAI", "OPENAI_API_KEY");
            apiKey = undefined; // Clear to force re-prompt if needed
          }
          adapter = new OpenAIAdapter({ apiKey: openaiKey });
          break;

        case "anthropic":
          let anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
          if (!anthropicKey || attempts > 0) {
            anthropicKey = await promptForApiKey(
              "Anthropic",
              "ANTHROPIC_API_KEY"
            );
            apiKey = undefined;
          }
          adapter = new AnthropicAdapter({ apiKey: anthropicKey });
          break;

        case "ollama":
          // Ollama doesn't require an API key, just the host
          const ollamaHost =
            process.env.OLLAMA_HOST || "http://localhost:11434";
          console.log(chalk.gray(`\nConnecting to Ollama at ${ollamaHost}\n`));
          adapter = new OllamaAdapter({ host: ollamaHost });
          break;

        case "gemini":
          let geminiKey = apiKey || process.env.GOOGLE_API_KEY;
          if (!geminiKey || attempts > 0) {
            geminiKey = await promptForApiKey(
              "Google Gemini",
              "GOOGLE_API_KEY"
            );
            apiKey = undefined;
          }
          adapter = new GeminiAdapter({ apiKey: geminiKey });
          break;

        default:
          console.error(chalk.red(`Unknown provider: ${provider}`));
          process.exit(1);
      }

      // Validate the adapter
      if (provider.toLowerCase() !== "ollama" || attempts === 0) {
        const spinner = ora("Validating API key...").start();
        try {
          const isValid = await validateApiKey(adapter, provider);
          if (!isValid) {
            spinner.fail(chalk.red("Invalid API key"));
            attempts++;
            if (attempts < maxAttempts) {
              console.log(
                chalk.yellow(
                  `\nPlease try again (${
                    maxAttempts - attempts
                  } attempts remaining)\n`
                )
              );
              continue;
            } else {
              console.error(
                chalk.red(
                  "\nMaximum attempts reached. Please check your API key."
                )
              );
              process.exit(1);
            }
          }
          spinner.succeed(chalk.green("API key validated"));
        } catch (error: any) {
          // Network or other errors
          spinner.warn(
            chalk.yellow("Could not validate API key (network issue?)")
          );
          console.log(chalk.gray("Proceeding anyway...\n"));
        }
      }

      return adapter;
    } catch (error) {
      console.error(chalk.red(`\nError creating adapter: ${error}\n`));
      attempts++;
      if (attempts >= maxAttempts) {
        process.exit(1);
      }
    }
  }

  process.exit(1);
}

async function runChat(options: any) {
  console.log(chalk.cyan("\n=== TanStack AI CLI ==="));
  console.log(chalk.gray(`Provider: ${options.provider}`));

  const adapter = await createAdapter(options.provider, options.apiKey);
  const ai = new AI(adapter);

  console.log(chalk.green(`\n✅ Connected to ${options.provider}\n`));
  console.log(chalk.cyan(`🤖 TanStack AI Chat`));
  console.log(chalk.gray('Type "exit" to quit\n'));

  const messages: Message[] = [];

  if (options.provider === "openai" || options.provider === "anthropic") {
    messages.push({
      role: "system",
      content:
        "You are a helpful AI assistant powered by TanStack AI, an open-source AI SDK.",
    });
  }

  while (true) {
    const { prompt } = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: chalk.green("You:"),
      },
    ]);

    if (prompt.toLowerCase() === "exit") {
      console.log(chalk.yellow("\nGoodbye! 👋"));
      break;
    }

    messages.push({ role: "user", content: prompt });

    const spinner = ora("Thinking...").start();

    try {
      const model = options.model || getDefaultModel(options.provider);

      if (options.provider === "ollama") {
        // For Ollama, we'll use streaming
        spinner.text = "Assistant:";
        spinner.stopAndPersist({ symbol: chalk.blue("🤖") });

        for await (const chunk of ai.chatStream({ model, messages })) {
          process.stdout.write(chunk.content);
        }
        console.log("\n");

        // Add a placeholder assistant message for context
        messages.push({
          role: "assistant",
          content: "Response provided above",
        });
      } else {
        const response = await ai.chat({
          model,
          messages,
          temperature: 0.7,
          maxTokens: 1000,
        });

        spinner.stop();
        console.log(chalk.blue("\n🤖 Assistant:"), response.content);
        console.log(chalk.gray(`\n[Tokens: ${response.usage.totalTokens}]\n`));

        messages.push({ role: "assistant", content: response.content });
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red("\nError:"), error);
    }
  }
}

async function runGenerate(options: any) {
  const adapter = await createAdapter(options.provider, options.apiKey);
  const ai = new AI(adapter);

  let prompt = options.prompt;
  if (!prompt) {
    const result = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: "Enter your prompt:",
      },
    ]);
    prompt = result.prompt;
  }

  const spinner = ora("Generating...").start();

  try {
    const model = options.model || getDefaultModel(options.provider, "text");
    const response = await ai.generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    spinner.stop();
    console.log(chalk.cyan("\n📝 Generated Text:\n"));
    console.log(response.text);
    console.log(chalk.gray(`\n[Tokens: ${response.usage.totalTokens}]`));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\nError:"), error);
  }
}

async function runSummarize(options: any) {
  const adapter = await createAdapter(options.provider, options.apiKey);
  const ai = new AI(adapter);

  let text = options.text;
  if (!text) {
    const result = await inquirer.prompt([
      {
        type: "editor",
        name: "text",
        message: "Enter the text to summarize:",
      },
    ]);
    text = result.text;
  }

  const spinner = ora("Summarizing...").start();

  try {
    const model = options.model || getDefaultModel(options.provider);
    const response = await ai.summarize({
      model,
      text,
      style: options.style,
      maxLength: 300,
    });

    spinner.stop();
    console.log(chalk.cyan(`\n📄 Summary (${options.style}):\n`));
    console.log(response.summary);
    console.log(chalk.gray(`\n[Tokens: ${response.usage.totalTokens}]`));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\nError:"), error);
  }
}

async function runEmbed(options: any) {
  const adapter = await createAdapter(options.provider, options.apiKey);
  const ai = new AI(adapter);

  let text = options.text;
  if (!text) {
    const result = await inquirer.prompt([
      {
        type: "input",
        name: "text",
        message: "Enter the text to embed:",
      },
    ]);
    text = result.text;
  }

  const spinner = ora("Generating embeddings...").start();

  try {
    const model = options.model || getDefaultEmbeddingModel(options.provider);
    const response = await ai.embed({
      model,
      input: text,
    });

    spinner.stop();
    console.log(chalk.cyan("\n🔢 Embeddings:\n"));
    console.log(chalk.gray(`Dimensions: ${response.embeddings[0].length}`));
    console.log(
      chalk.gray(
        `First 10 values: [${response.embeddings[0]
          .slice(0, 10)
          .map((v) => v.toFixed(4))
          .join(", ")}...]`
      )
    );
    console.log(chalk.gray(`\n[Tokens: ${response.usage.totalTokens}]`));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\nError:"), error);
  }
}

function getDefaultModel(provider: string, type: string = "chat"): string {
  switch (provider.toLowerCase()) {
    case "openai":
      return type === "text" ? "gpt-3.5-turbo-instruct" : "gpt-3.5-turbo";
    case "anthropic":
      return "claude-3-sonnet-20240229";
    case "ollama":
      return "llama2";
    case "gemini":
      return "gemini-pro";
    default:
      return "";
  }
}

function getDefaultEmbeddingModel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "openai":
      return "text-embedding-ada-002";
    case "ollama":
      return "nomic-embed-text";
    case "gemini":
      return "embedding-001";
    default:
      return "";
  }
}

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
