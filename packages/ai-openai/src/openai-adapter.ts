import OpenAI from "openai";
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
} from "@tanstack/ai";

export interface OpenAIAdapterConfig extends AIAdapterConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
}

export class OpenAIAdapter extends BaseAdapter {
  name = "openai";
  private client: OpenAI;

  constructor(config: OpenAIAdapterConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      defaultHeaders: config.headers,
    });
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model || "gpt-3.5-turbo",
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: false,
    });

    const choice = response.choices[0];

    return {
      id: response.id,
      model: response.model,
      content: choice.message.content || "",
      role: "assistant",
      finishReason: choice.finish_reason as any,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: options.model || "gpt-3.5-turbo",
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          id: chunk.id,
          model: chunk.model,
          content: delta.content,
          role: delta.role as "assistant" | undefined,
          finishReason: chunk.choices[0]?.finish_reason as any,
        };
      }
    }
  }

  async generateText(
    options: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const response = await this.client.completions.create({
      model: options.model || "gpt-3.5-turbo-instruct",
      prompt: options.prompt,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: false,
    });

    const choice = response.choices[0];

    return {
      id: response.id,
      model: response.model,
      text: choice.text,
      finishReason: choice.finish_reason as any,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *generateTextStream(
    options: TextGenerationOptions
  ): AsyncIterable<string> {
    const stream = await this.client.completions.create({
      model: options.model || "gpt-3.5-turbo-instruct",
      prompt: options.prompt,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.text) {
        yield chunk.choices[0].text;
      }
    }
  }

  async summarize(options: SummarizationOptions): Promise<SummarizationResult> {
    const systemPrompt = this.buildSummarizationPrompt(options);

    const response = await this.client.chat.completions.create({
      model: options.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.text },
      ],
      max_tokens: options.maxLength,
      temperature: 0.3,
      stream: false,
    });

    return {
      id: response.id,
      model: response.model,
      summary: response.choices[0].message.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async createEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: options.model || "text-embedding-ada-002",
      input: options.input,
      dimensions: options.dimensions,
    });

    return {
      id: this.generateId(),
      model: response.model,
      embeddings: response.data.map((d) => d.embedding),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
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
