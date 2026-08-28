/**
 * Provider Settings (simplified) tests:
 * blank fields + save-and-activate, custom model ids, and deletion —
 * all without any password interaction.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { AIProviderRouter } from '../../services/ai/providerRouter';

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

import { ProviderSettings } from '../ProviderSettings';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { PROVIDER_METADATA } from '../../services/ai/providerRouter';

function makeRouterStub(overrides: Partial<AIProviderRouter> = {}): AIProviderRouter {
  return {
    setProviderApiKey: vi.fn(),
    clearProviderApiKey: vi.fn(),
    getProvider: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as AIProviderRouter;
}

function getRowInputs(row: Element): { keyInput: HTMLInputElement; modelInput: HTMLInputElement } {
  const keyInput = row.querySelector('input[type="password"]') as HTMLInputElement;
  const modelInput = row.querySelector('input[list]') as HTMLInputElement;
  return { keyInput, modelInput };
}

function findRowButton(row: Element, label: string): HTMLButtonElement {
  const btn = Array.from(row.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label)
  );
  if (!btn) throw new Error(`Button "${label}" not found in row`);
  return btn;
}

describe('ProviderSettings (passwordless)', () => {
  beforeEach(() => {
    localStorage.clear();
    useTerminalStore.setState({
      providers: {},
      activeProvider: 'gemini',
      activeModel: 'gemini-1.5-flash',
    });
  });

  it('saves a pasted key with a typed model id and activates the provider', async () => {
    const router = makeRouterStub();
    render(<ProviderSettings isOpen onClose={vi.fn()} router={router} />);

    const openaiRow = await waitFor(() => {
      const row = document.querySelector('div[data-testid="provider-row-openai"]');
      expect(row).toBeTruthy();
      return row!;
    });
    const { keyInput, modelInput } = getRowInputs(openaiRow);

    fireEvent.change(keyInput, { target: { value: 'sk-my-own-key' } });
    fireEvent.change(modelInput, { target: { value: 'gpt-4o-mini-custom' } });
    fireEvent.click(findRowButton(openaiRow, '保存并启用'));

    await waitFor(() => {
      expect(useTerminalStore.getState().providers['openai']?.isConfigured).toBe(true);
    }, { timeout: 20_000 });
    expect(useTerminalStore.getState().activeProvider).toBe('openai');
    expect(useTerminalStore.getState().activeModel).toBe('gpt-4o-mini-custom');
    expect(router.setProviderApiKey).toHaveBeenCalledWith('openai', 'sk-my-own-key');
  }, 25_000);

  it('renders inline without a full-screen dialog or remote favicon requests', async () => {
    const router = makeRouterStub();
    const { container } = render(<ProviderSettings inline router={router} />);

    expect(screen.getByRole('region', { name: 'AI 提供商设置' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelectorAll('[data-testid^="provider-row-"]')).toHaveLength(
        Object.keys(PROVIDER_METADATA).length
      );
    });
    expect(container.querySelector('img[src*="google.com/s2/favicons"]')).toBeNull();
  });

  it('falls back to a default model when the model field is left empty', async () => {
    const router = makeRouterStub({
      getProvider: vi.fn().mockResolvedValue({
        getDefaultModel: () => ({ id: 'gpt-default' }),
      }),
    });
    render(<ProviderSettings isOpen onClose={vi.fn()} router={router} />);

    const openaiRow = await waitFor(() => {
      const row = document.querySelector('div[data-testid="provider-row-openai"]');
      expect(row).toBeTruthy();
      return row!;
    });
    const { keyInput } = getRowInputs(openaiRow);
    fireEvent.change(keyInput, { target: { value: 'sk-x' } });
    fireEvent.click(findRowButton(openaiRow, '保存并启用'));

    await waitFor(() => {
      expect(useTerminalStore.getState().providers['openai']?.isConfigured).toBe(true);
    }, { timeout: 20_000 });
    expect(useTerminalStore.getState().activeModel).toBe('gpt-default');
  }, 25_000);

  it('deletes an existing configuration after confirmation', async () => {
    await useTerminalStore.getState().setProviderApiKey('groq', 'gsk-old');
    const router = makeRouterStub();
    render(<ProviderSettings isOpen onClose={vi.fn()} router={router} />);

    // Wait for rows to settle, then delete the configured Groq entry
    const groqRow = await waitFor(() => {
      const row = document.querySelector('div[data-testid="provider-row-groq"]');
      expect(row).toBeTruthy();
      return row!;
    });
    const deleteBtn = Array.from(groqRow.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('删除配置')
    );
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);

    // Confirm dialog appears; its confirm button carries the "(D)" hotkey hint
    const confirmBtn = await waitFor(() => {
      const btn = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.trim().startsWith('删除') && b.textContent.includes('(D)'));
      expect(btn).toBeTruthy();
      return btn!;
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useTerminalStore.getState().providers['groq']).toBeUndefined();
    });
    expect(router.clearProviderApiKey).toHaveBeenCalledWith('groq');
  }, 25_000);
});
