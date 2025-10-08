export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  metadata?: Record<string, any>;
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  content: string;
  role?: "assistant";
  finishReason?: "stop" | "length" | "content_filter" | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatCompletionResult {
  id: string;
  model: string;
  content: string;
  role: "assistant";
  finishReason: "stop" | "length" | "content_filter" | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TextGenerationOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface TextGenerationResult {
  id: string;
  model: string;
  text: string;
  finishReason: "stop" | "length" | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface SummarizationOptions {
  model: string;
  text: string;
  maxLength?: number;
  style?: "bullet-points" | "paragraph" | "concise";
  focus?: string[];
}

export interface SummarizationResult {
  id: string;
  model: string;
  summary: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingOptions {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface EmbeddingResult {
  id: string;
  model: string;
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface AIAdapter {
  name: string;

  // Chat methods
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
  chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionChunk>;

  // Text generation methods
  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>;
  generateTextStream(options: TextGenerationOptions): AsyncIterable<string>;

  // Summarization
  summarize(options: SummarizationOptions): Promise<SummarizationResult>;

  // Embeddings
  createEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResult>;
}

export interface AIAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}
