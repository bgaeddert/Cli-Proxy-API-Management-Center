import { afterEach, describe, expect, test } from 'bun:test';
import { apiClient } from '../src/services/api/client';
import { providersApi } from '../src/services/api/providers';
import { normalizeProviderGroups } from '../src/services/api/transformers';
import type { OpenAIProviderConfig } from '../src/types';

const originalGet = apiClient.get;
const originalPut = apiClient.put;

afterEach(() => {
  apiClient.get = originalGet;
  apiClient.put = originalPut;
});

describe('OpenAI-compatible model transcription capability', () => {
  test('serializes transcription capability when creating a provider', async () => {
    let putData: unknown;
    apiClient.get = (async () => ({ 'openai-compatibility': [] })) as typeof apiClient.get;
    apiClient.put = (async (_url: string, data?: unknown) => {
      putData = data;
      return undefined;
    }) as typeof apiClient.put;

    await providersApi.createOpenAIProvider({
      name: 'example',
      baseUrl: 'https://example.com/v1',
      apiKeyEntries: [{ apiKey: 'key' }],
      models: [{ name: 'asr-model', transcription: true }],
    });

    expect(putData).toEqual([
      {
        name: 'example',
        'base-url': 'https://example.com/v1',
        keys: [{ 'api-key': 'key' }],
        models: [{ name: 'asr-model', transcription: true }],
      },
    ]);
  });

  test('removes a previously saved transcription capability when cleared', async () => {
    let putData: unknown;
    apiClient.get = (async () => ({
      'api-keys': { 'openai-compatibility': [
        {
          name: 'example',
          'base-url': 'https://example.com/v1',
          keys: [{ 'api-key': 'key' }],
          models: [{ name: 'asr-model', transcription: true }],
        },
      ] },
    })) as typeof apiClient.get;
    apiClient.put = (async (_url: string, data?: unknown) => {
      putData = data;
      return undefined;
    }) as typeof apiClient.put;

    const raw = { name: 'example', 'base-url': 'https://example.com/v1', keys: [{ 'api-key': 'key' }], models: [{ name: 'asr-model', transcription: true }] };
    const config = normalizeProviderGroups([raw], true)[0] as OpenAIProviderConfig;
    await providersApi.updateOpenAIProvider('example', 0, {
      ...config, models: [{ ...config.models![0], transcription: false }],
    });

    expect(putData).toEqual([
      {
        name: 'example',
        'base-url': 'https://example.com/v1',
        keys: [{ 'api-key': 'key' }],
        models: [{ name: 'asr-model' }],
      },
    ]);
  });
});
