import type {
  AIAdapter,
  AIAdapterConfig,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatCompletionChunk,
  TextGenerationOptions,
  TextGenerationResult,
  SummarizationOptions,
  SummarizationResult,
  EmbeddingOptions,
  EmbeddingResult,
} from "./types";

export abstract class BaseAdapter implements AIAdapter {
  abstract name: string;
  protected config: AIAdapterConfig;

  constructor(config: AIAdapterConfig = {}) {
    this.config = config;
  }

  abstract chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult>;
  abstract chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionChunk>;
  abstract generateText(
    options: TextGenerationOptions
  ): Promise<TextGenerationResult>;
  abstract generateTextStream(
    options: TextGenerationOptions
  ): AsyncIterable<string>;
  abstract summarize(
    options: SummarizationOptions
  ): Promise<SummarizationResult>;
  abstract createEmbeddings(
    options: EmbeddingOptions
  ): Promise<EmbeddingResult>;

  protected generateId(): string {
    return `${this.name}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }
}
