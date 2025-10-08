import Anthropic from "@anthropic-ai/sdk";
import {
  BaseAdapter,
  type AIAdapterConfig,
  type ChatCompletionOptions,
  type ChatCompletionResult,
  type ChatCompletionChunk,
  type TextGenerationOptions,
  type TextGenerationResult,
  type SummarizationOptions,
  type SummarizationResult,
  type EmbeddingOptions,
  type EmbeddingResult,
  type Message,
} from "@tanstack/ai";

export interface AnthropicAdapterConfig extends AIAdapterConfig {
  apiKey: string;
}

export class AnthropicAdapter extends BaseAdapter {
  name = "anthropic";
  private client: Anthropic;

  constructor(config: AnthropicAdapterConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      defaultHeaders: config.headers,
    });
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const { systemMessage, messages } = this.formatMessages(options.messages);

    const response = await this.client.messages.create({
      model: options.model || "claude-3-sonnet-20240229",
      messages: messages as any,
      system: systemMessage,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stopSequences,
      stream: false,
    });

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("");

    return {
      id: response.id,
      model: response.model,
      content,
      role: "assistant",
      finishReason: response.stop_reason as any,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionChunk> {
    const { systemMessage, messages } = this.formatMessages(options.messages);

    const stream = await this.client.messages.create({
      model: options.model || "claude-3-sonnet-20240229",
      messages: messages as any,
      system: systemMessage,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield {
          id: this.generateId(),
          model: options.model || "claude-3-sonnet-20240229",
          content: chunk.delta.text,
          finishReason: null,
        };
      } else if (chunk.type === "message_stop") {
        yield {
          id: this.generateId(),
          model: options.model || "claude-3-sonnet-20240229",
          content: "",
          finishReason: "stop",
        };
      }
    }
  }

  async generateText(
    options: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const response = await this.client.messages.create({
      model: options.model || "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: options.prompt }],
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stopSequences,
      stream: false,
    });

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("");

    return {
      id: response.id,
      model: response.model,
      text: content,
      finishReason: response.stop_reason as any,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *generateTextStream(
    options: TextGenerationOptions
  ): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: options.model || "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: options.prompt }],
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
  }

  async summarize(options: SummarizationOptions): Promise<SummarizationResult> {
    const systemPrompt = this.buildSummarizationPrompt(options);

    const response = await this.client.messages.create({
      model: options.model || "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: options.text }],
      system: systemPrompt,
      max_tokens: options.maxLength || 500,
      temperature: 0.3,
      stream: false,
    });

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("");

    return {
      id: response.id,
      model: response.model,
      summary: content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async createEmbeddings(_options: EmbeddingOptions): Promise<EmbeddingResult> {
    // Note: Anthropic doesn't have a native embeddings API
    // You would need to use a different service or implement a workaround
    throw new Error(
      "Embeddings are not natively supported by Anthropic. Consider using OpenAI or another provider for embeddings."
    );
  }

  private formatMessages(messages: Message[]): {
    systemMessage?: string;
    messages: Array<{ role: string; content: string }>;
  } {
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    return {
      systemMessage: systemMessages.map((m) => m.content).join("\n"),
      messages: nonSystemMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    };
  }

  private buildSummarizationPrompt(options: SummarizationOptions): string {
    let prompt = "You are a professional summarizer. ";

    switch (options.style) {
      case "bullet-points":
        prompt += "Provide a summary in bullet point format. ";
        break;
      case "paragraph":
        prompt += "Provide a summary in paragraph format. ";
        break;
      case "concise":
        prompt += "Provide a very concise summary in 1-2 sentences. ";
        break;
      default:
        prompt += "Provide a clear and concise summary. ";
    }

    if (options.focus && options.focus.length > 0) {
      prompt += `Focus on the following aspects: ${options.focus.join(", ")}. `;
    }

    if (options.maxLength) {
      prompt += `Keep the summary under ${options.maxLength} tokens. `;
    }

    return prompt;
  }
}
