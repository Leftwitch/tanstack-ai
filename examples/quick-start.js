#!/usr/bin/env node

// Quick Start Example for @tanstack/ai
// This demonstrates how to use the library with different providers

import { AI } from "../packages/ai/dist/index.js";
import { OpenAIAdapter } from "../packages/ai-openai/dist/index.js";
import { AnthropicAdapter } from "../packages/ai-anthropic/dist/index.js";
import { OllamaAdapter } from "../packages/ai-ollama/dist/index.js";
import { GeminiAdapter } from "../packages/ai-gemini/dist/index.js";

// Example 1: Using OpenAI
async function openAIExample() {
  console.log("🚀 OpenAI Example");
  console.log("-----------------");

  const ai = new AI(
    new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "your-api-key",
    })
  );

  try {
    // Simple chat
    const response = await ai.chat({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is the capital of France?" },
      ],
      maxTokens: 100,
    });

    console.log("Chat Response:", response.content);
    console.log("Tokens Used:", response.usage.totalTokens);
  } catch (error) {
    console.log("OpenAI not configured or available:", error.message);
  }
}

// Example 2: Using Anthropic Claude
async function anthropicExample() {
  console.log("\n🤖 Anthropic Claude Example");
  console.log("---------------------------");

  const ai = new AI(
    new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY || "your-api-key",
    })
  );

  try {
    // Text generation
    const result = await ai.generateText({
      model: "claude-3-sonnet-20240229",
      prompt: "Write a haiku about programming",
      maxTokens: 100,
    });

    console.log("Generated Haiku:", result.text);
  } catch (error) {
    console.log("Anthropic not configured or available:", error.message);
  }
}

// Example 3: Using Ollama (Local)
async function ollamaExample() {
  console.log("\n🦙 Ollama (Local) Example");
  console.log("-------------------------");

  const ai = new AI(
    new OllamaAdapter({
      host: "http://localhost:11434",
    })
  );

  try {
    // Chat with local model
    const response = await ai.chat({
      model: "llama2",
      messages: [
        { role: "user", content: "Explain quantum computing in one sentence." },
      ],
    });

    console.log("Ollama Response:", response.content);
  } catch (error) {
    console.log("Ollama not running or available:", error.message);
  }
}

// Example 4: Using Google Gemini
async function geminiExample() {
  console.log("\n💎 Google Gemini Example");
  console.log("------------------------");

  const ai = new AI(
    new GeminiAdapter({
      apiKey: process.env.GOOGLE_API_KEY || "your-api-key",
    })
  );

  try {
    // Summarization
    const summary = await ai.summarize({
      model: "gemini-pro",
      text: `The quick brown fox jumps over the lazy dog. This pangram sentence 
             contains every letter of the English alphabet at least once. It's commonly 
             used for testing typewriters, computer keyboards, and fonts.`,
      style: "concise",
    });

    console.log("Summary:", summary.summary);
  } catch (error) {
    console.log("Gemini not configured or available:", error.message);
  }
}

// Example 5: Switching Providers Dynamically
async function switchProvidersExample() {
  console.log("\n🔄 Dynamic Provider Switching");
  console.log("-----------------------------");

  // Start with one provider
  const ai = new AI(
    new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "demo",
    })
  );

  console.log("Current adapter:", ai.adapterName);

  // Switch to another provider
  ai.setAdapter(
    new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY || "demo",
    })
  );

  console.log("Switched to:", ai.adapterName);

  // Switch to local Ollama
  ai.setAdapter(new OllamaAdapter());
  console.log("Switched to:", ai.adapterName);
}

// Run all examples
async function main() {
  console.log("================================================");
  console.log("     @tanstack/ai - Quick Start Examples       ");
  console.log("================================================\n");

  console.log("Note: Set environment variables for API keys:");
  console.log("  - OPENAI_API_KEY");
  console.log("  - ANTHROPIC_API_KEY");
  console.log("  - GOOGLE_API_KEY");
  console.log("  - For Ollama, ensure it's running locally\n");

  await openAIExample();
  await anthropicExample();
  await ollamaExample();
  await geminiExample();
  await switchProvidersExample();

  console.log("\n================================================");
  console.log("       Examples Complete! Happy Coding! 🎉      ");
  console.log("================================================\n");

  console.log("Try the interactive CLI:");
  console.log("  cd examples/cli");
  console.log("  pnpm start chat --provider openai");
}

main().catch(console.error);
