# @tanstack/ai - Open Source AI SDK

A powerful, open-source alternative to Vercel's AI SDK that puts developers first. Built by the community, for the community.

## 🚀 Features

- **Multi-Provider Support**: Seamlessly switch between OpenAI, Anthropic, Ollama, and Google Gemini
- **Unified API**: One consistent interface across all AI providers
- **Streaming Support**: Real-time streaming for chat and text generation
- **TypeScript First**: Full type safety and excellent IDE support
- **Modular Architecture**: Use only what you need with separate adapter packages
- **No Vendor Lock-in**: Your code, your choice, your freedom

## 📦 Packages

- `@tanstack/ai` - Core library with base interfaces and utilities
- `@tanstack/ai-openai` - OpenAI adapter (GPT-3.5, GPT-4, etc.)
- `@tanstack/ai-anthropic` - Anthropic Claude adapter
- `@tanstack/ai-ollama` - Ollama adapter for local LLMs
- `@tanstack/ai-gemini` - Google Gemini adapter

## 🛠️ Installation

```bash
# Install core package
npm install @tanstack/ai

# Install adapter(s) you need
npm install @tanstack/ai-openai
npm install @tanstack/ai-anthropic
npm install @tanstack/ai-ollama
npm install @tanstack/ai-gemini
```

## 🎯 Quick Start

### Basic Chat Example

```typescript
import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";

// Initialize with your preferred adapter
const ai = new AI(
  new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Simple chat completion
const response = await ai.chat({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello! How are you?" },
  ],
});

console.log(response.content);
```

### Streaming Chat

```typescript
// Stream responses for real-time interaction
for await (const chunk of ai.chatStream({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Tell me a story" }],
})) {
  process.stdout.write(chunk.content);
}
```

### Text Generation

```typescript
const result = await ai.generateText({
  model: "gpt-3.5-turbo-instruct",
  prompt: "Once upon a time...",
  maxTokens: 100,
});

console.log(result.text);
```

### Summarization

```typescript
const summary = await ai.summarize({
  model: "gpt-3.5-turbo",
  text: "Your long text here...",
  style: "bullet-points",
  maxLength: 200,
});

console.log(summary.summary);
```

### Embeddings

```typescript
const embeddings = await ai.embed({
  model: "text-embedding-ada-002",
  input: "Text to embed",
});

console.log(embeddings.embeddings[0]);
```

## 🔄 Switching Providers

One of the key benefits is the ability to switch providers without changing your code:

```typescript
import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";
import { AnthropicAdapter } from "@tanstack/ai-anthropic";
import { OllamaAdapter } from "@tanstack/ai-ollama";
import { GeminiAdapter } from "@tanstack/ai-gemini";

// Start with OpenAI
let ai = new AI(new OpenAIAdapter({ apiKey: "key" }));

// Switch to Anthropic
ai.setAdapter(new AnthropicAdapter({ apiKey: "key" }));

// Use local Ollama
ai.setAdapter(new OllamaAdapter());

// Try Google Gemini
ai.setAdapter(new GeminiAdapter({ apiKey: "key" }));
```

## 🖥️ CLI Demo

Try out the library with our interactive CLI that features **automatic API key prompting** - no configuration needed!

### 🚀 Quick Start (No Setup Required!)

```bash
# Install and build
pnpm install
pnpm build

# Just run - it will prompt for API keys if needed!
pnpm cli chat --provider openai
```

The CLI will:

1. 🔍 Check for API keys in your environment
2. 📝 Prompt for keys if not found (with links to get them)
3. ✅ Validate the keys automatically
4. 💾 Offer to save them to `.env` for next time

### 🎯 All Commands

```bash
# From root directory
pnpm cli chat --provider openai
pnpm cli generate --provider anthropic
pnpm cli summarize --provider gemini
pnpm cli embed --provider ollama

# Or navigate to the CLI directory
cd examples/cli

# For development (no build needed)
pnpm dev chat --provider openai

# Use the built version
pnpm start chat --provider anthropic
```

## 📝 Environment Variables

Create a `.env` file in your project:

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
OLLAMA_HOST=http://localhost:11434
```

## 🏗️ Development

This is a monorepo managed with pnpm workspaces:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```

## 🤝 Contributing

We welcome contributions! This is a community-driven project that aims to provide a truly open alternative to proprietary AI SDKs.

## 📜 License

MIT - Use it freely, modify it, share it. No strings attached.

## 🎯 Mission

Unlike certain companies that use open source as a marketing tool only to lock you into their paid services later, @tanstack/ai is committed to remaining truly open source. No enshittification, no bait-and-switch, just honest open-source software that respects developers.

## 🚦 Status

This is a Proof of Concept (PoC) demonstrating how we can build a better, more open AI SDK. Join us in making AI tooling that serves developers, not shareholders.

---

Built with ❤️ by the open-source community, because developers deserve better than vendor lock-in disguised as open source.
