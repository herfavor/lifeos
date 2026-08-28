/**
 * Terminal store API-key tests — the passwordless flow.
 *
 * Keys must be savable/readable/deletable with zero user passwords:
 * they are encrypted at rest with the device-managed local key and
 * persisted so they survive reloads.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTerminalStore } from '../useTerminalStore';
import { getDeviceKey } from '../../services/deviceKey';

describe('useTerminalStore API keys (no password)', () => {
  beforeEach(() => {
    localStorage.clear();
    useTerminalStore.setState({
      isOpen: false,
      hasOpenedTerminal: false,
      providers: {},
      messages: [],
    });
  });

  it('starts closed and never persists transient open state', () => {
    expect(useTerminalStore.getState().isOpen).toBe(false);

    useTerminalStore.getState().setOpen(true);
    const raw = localStorage.getItem('ai-terminal');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(parsed.state.isOpen).toBeUndefined();
  });

  it('saves a key without any password and marks provider configured', async () => {
    await useTerminalStore.getState().setProviderApiKey('openai', 'sk-test-123');
    const cfg = useTerminalStore.getState().providers['openai'];
    expect(cfg?.isConfigured).toBe(true);
    expect(cfg?.encryptedApiKey).toBeTruthy();
  });

  it('reads the key back with the same device key', async () => {
    await useTerminalStore.getState().setProviderApiKey('groq', 'gsk_abc');
    const key = await useTerminalStore.getState().getProviderApiKey('groq');
    expect(key).toBe('gsk_abc');
  });

  it('persists the encrypted key across reloads (localStorage)', async () => {
    useTerminalStore.setState({
      messages: [
        {
          id: 'history-1',
          role: 'user',
          content: '保留这条历史消息',
          timestamp: Date.now(),
        },
      ],
    });
    await useTerminalStore.getState().setProviderApiKey('openrouter', 'sk-or-v1-x');
    const raw = localStorage.getItem('ai-terminal');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as {
      state: { providers: Record<string, unknown>; messages: Array<{ id: string }> };
    };
    expect(parsed.state.providers['openrouter']).toBeDefined();
    expect(parsed.state.messages).toContainEqual(expect.objectContaining({ id: 'history-1' }));
  });

  it('deletes the configuration completely', async () => {
    await useTerminalStore.getState().setProviderApiKey('deepseek', 'sk-ds');
    useTerminalStore.getState().clearProviderApiKey('deepseek');
    expect(useTerminalStore.getState().providers['deepseek']).toBeUndefined();
    expect(await useTerminalStore.getState().getProviderApiKey('deepseek')).toBeNull();
  });

  it('self-heals when stored bytes cannot be decrypted (legacy/corrupt)', async () => {
    await useTerminalStore.getState().setProviderApiKey('mistral', 'sk-m');
    // Corrupt the ciphertext to simulate legacy data from the old
    // user-password scheme or tampered storage.
    useTerminalStore.setState((state) => ({
      providers: {
        ...state.providers,
        mistral: {
          ...(state.providers.mistral ?? { providerId: 'mistral' }),
          encryptedApiKey: { ciphertext: 'ffff', salt: 'ff', iv: 'ff' },
        },
      },
    }));

    const key = await useTerminalStore.getState().getProviderApiKey('mistral');
    expect(key).toBeNull();
    // The unreadable entry is cleared instead of lingering as a broken state
    expect(useTerminalStore.getState().providers['mistral']).toBeUndefined();
  }, 30_000);

  it('never treats unauthenticated legacy bytes as a device-managed key', async () => {
    useTerminalStore.setState({
      providers: {
        anthropic: {
          providerId: 'anthropic',
          encryptedApiKey: {
            ciphertext: 'ffff',
            salt: 'ff',
            iv: 'ff',
            version: 'crypto-js',
          },
          isConfigured: true,
          lastUsed: null,
        },
      },
    });

    await expect(useTerminalStore.getState().getProviderApiKey('anthropic')).resolves.toBeNull();
    expect(useTerminalStore.getState().providers['anthropic']).toBeUndefined();
  });
});

describe('device-managed local key', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is stable across calls and persisted', () => {
    const first = getDeviceKey();
    expect(getDeviceKey()).toBe(first);
    expect(localStorage.getItem('lifeos-device-crypto-key-v1')).toBe(first);
    expect(first.length).toBeGreaterThanOrEqual(16);
  });
});
