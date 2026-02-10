import { describe, it, expect, beforeEach, vi } from 'vitest'
import { chat, type Tool, type StreamChunk } from '@tanstack/ai'
import { AnthropicTextAdapter } from '../src/adapters/text'
import type { AnthropicTextProviderOptions } from '../src/adapters/text'
import { z } from 'zod'

const mocks = vi.hoisted(() => {
  const messagesCreate = vi.fn()

  const client = {
    messages: {
      create: messagesCreate,
    },
  }

  return { messagesCreate, client }
})

vi.mock('@anthropic-ai/sdk', () => {
  const { client } = mocks

  class MockAnthropic {
    messages = client.messages

    constructor(_: { apiKey: string }) {}
  }

  return { default: MockAnthropic }
})

const createAdapter = <TModel extends string>(model: TModel) =>
  new AnthropicTextAdapter({ apiKey: 'test-key' }, model as any)

const toolArguments = JSON.stringify({ location: 'Berlin' })

const weatherTool: Tool = {
  name: 'lookup_weather',
  description: 'Return the weather for a city',
  inputSchema: z.object({
    location: z.string(),
  }),
}

describe('Anthropic adapter option mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps normalized options and Anthropic provider settings', async () => {
    // Mock the streaming response
    const mockStream = (async function* () {
      yield {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      }
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'It will be sunny' },
      }
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 5 },
      }
      yield {
        type: 'message_stop',
      }
    })()

    mocks.messagesCreate.mockResolvedValueOnce(mockStream)

    const providerOptions = {
      container: {
        id: 'container-weather',
        skills: [{ skill_id: 'forecast', type: 'custom', version: '1' }],
      },
      mcp_servers: [
        {
          name: 'world-weather',
          url: 'https://mcp.example.com',
          type: 'url',
          authorization_token: 'secret',
          tool_configuration: {
            allowed_tools: ['lookup_weather'],
            enabled: true,
          },
        },
      ],
      service_tier: 'standard_only',
      stop_sequences: ['</done>'],
      thinking: { type: 'enabled', budget_tokens: 1500 },
      top_k: 5,
      system: 'Respond with JSON',
    } satisfies AnthropicTextProviderOptions & { system: string }

    const adapter = createAdapter('claude-3-7-sonnet-20250219')

    // Consume the stream to trigger the API call
    const chunks: StreamChunk[] = []
    for await (const chunk of chat({
      adapter,
      messages: [
        { role: 'user', content: 'What is the forecast?' },
        {
          role: 'assistant',
          content: 'Checking',
          toolCalls: [
            {
              id: 'call_weather',
              type: 'function',
              function: { name: 'lookup_weather', arguments: toolArguments },
            },
          ],
        },
        { role: 'tool', toolCallId: 'call_weather', content: '{"temp":72}' },
      ],
      tools: [weatherTool],
      maxTokens: 3000,
      temperature: 0.4,
      modelOptions: providerOptions,
    })) {
      chunks.push(chunk)
    }

    expect(mocks.messagesCreate).toHaveBeenCalledTimes(1)
    const [payload] = mocks.messagesCreate.mock.calls[0]

    expect(payload).toMatchObject({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 3000,
      temperature: 0.4,
      container: providerOptions.container,
      mcp_servers: providerOptions.mcp_servers,
      service_tier: providerOptions.service_tier,
      stop_sequences: providerOptions.stop_sequences,
      thinking: providerOptions.thinking,
      top_k: providerOptions.top_k,
      system: providerOptions.system,
    })
    expect(payload.stream).toBe(true)

    expect(payload.messages).toEqual([
      {
        role: 'user',
        content: 'What is the forecast?',
      },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Checking' },
          {
            type: 'tool_use',
            id: 'call_weather',
            name: 'lookup_weather',
            input: { location: 'Berlin' },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_weather',
            content: '{"temp":72}',
          },
        ],
      },
    ])

    expect(payload.tools?.[0]).toMatchObject({
      name: 'lookup_weather',
      type: 'custom',
    })
  })
})

describe('Anthropic structured output', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends output_config with json_schema and parses JSON response', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: '{"name":"Alice","age":30}' }],
    }
    mocks.messagesCreate.mockResolvedValueOnce(mockResponse)

    const adapter = createAdapter('claude-sonnet-4')

    const result = await adapter.structuredOutput({
      chatOptions: {
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Return a person object' }],
        maxTokens: 1024,
      },
      outputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      },
    })

    expect(result).toEqual({
      data: { name: 'Alice', age: 30 },
      rawText: '{"name":"Alice","age":30}',
    })

    expect(mocks.messagesCreate).toHaveBeenCalledTimes(1)
    const [payload] = mocks.messagesCreate.mock.calls[0]
    expect(payload.stream).toBe(false)
    expect(payload.output_config).toEqual({
      format: {
        type: 'json_schema',
        name: 'structured_output',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
        },
      },
    })
  })

  it('throws when response is not valid JSON', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'not valid json' }],
    }
    mocks.messagesCreate.mockResolvedValueOnce(mockResponse)

    const adapter = createAdapter('claude-sonnet-4')

    await expect(
      adapter.structuredOutput({
        chatOptions: {
          model: 'claude-sonnet-4',
          messages: [{ role: 'user', content: 'Return a person object' }],
          maxTokens: 1024,
        },
        outputSchema: { type: 'object' },
      }),
    ).rejects.toThrow('Failed to parse structured output JSON')
  })

  it('falls back to tool-use for older models', async () => {
    const mockResponse = {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'structured_output',
          input: { name: 'Bob', age: 25 },
        },
      ],
    }
    mocks.messagesCreate.mockResolvedValueOnce(mockResponse)

    const adapter = createAdapter('claude-3-7-sonnet')

    const result = await adapter.structuredOutput({
      chatOptions: {
        model: 'claude-3-7-sonnet',
        messages: [{ role: 'user', content: 'Return a person object' }],
        maxTokens: 1024,
      },
      outputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      },
    })

    expect(result).toEqual({
      data: { name: 'Bob', age: 25 },
      rawText: '{"name":"Bob","age":25}',
    })

    expect(mocks.messagesCreate).toHaveBeenCalledTimes(1)
    const [payload] = mocks.messagesCreate.mock.calls[0]
    expect(payload.stream).toBe(false)
    expect(payload.output_config).toBeUndefined()
    expect(payload.tool_choice).toEqual({
      type: 'tool',
      name: 'structured_output',
    })
    expect(payload.tools).toEqual([
      {
        name: 'structured_output',
        description:
          'Use this tool to provide your response in the required structured format.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
        },
      },
    ])
  })
})
