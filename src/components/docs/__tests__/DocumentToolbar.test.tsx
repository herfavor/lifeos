import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentToolbar } from '../DocumentToolbar';
import { exportDocument } from '../documentExport';

vi.mock('../documentExport', () => ({
  EXPORT_FORMATS: [
    { id: 'html', label: 'HTML 文档', extension: '.html' },
  ],
  exportDocument: vi.fn(),
}));

function createEditor() {
  const chain = {
    focus: vi.fn(),
    setColor: vi.fn(),
    unsetColor: vi.fn(),
    toggleHighlight: vi.fn(),
    run: vi.fn(),
  };
  chain.focus.mockReturnValue(chain);
  chain.setColor.mockReturnValue(chain);
  chain.unsetColor.mockReturnValue(chain);
  chain.toggleHighlight.mockReturnValue(chain);

  return {
    editor: {
      chain: vi.fn(() => chain),
      can: vi.fn(() => ({ undo: () => true, redo: () => true })),
      isActive: vi.fn(() => false),
    } as unknown as Editor,
    chain,
  };
}

describe('DocumentToolbar menus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the text-color menu on click and applies the selected color', async () => {
    const user = userEvent.setup();
    const { editor, chain } = createEditor();
    render(<DocumentToolbar editor={editor} documentTitle="测试文档" onAddImage={vi.fn()} onSetLink={vi.fn()} onInsertTable={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.getByRole('menu', { name: '文字颜色' })).toBeInTheDocument();
    expect(screen.getByRole('menu', { name: '文字颜色' }).closest('.overflow-visible')).not.toBeNull();

    await user.click(screen.getByRole('menuitem', { name: '红色' }));
    expect(chain.setColor).toHaveBeenCalledWith('#EF4444');
    expect(chain.run).toHaveBeenCalled();
    expect(screen.queryByRole('menu', { name: '文字颜色' })).not.toBeInTheDocument();
  });

  it('opens the highlight menu on click and applies the selected highlight', async () => {
    const user = userEvent.setup();
    const { editor, chain } = createEditor();
    render(<DocumentToolbar editor={editor} documentTitle="测试文档" onAddImage={vi.fn()} onSetLink={vi.fn()} onInsertTable={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '高亮' }));
    expect(screen.getByRole('menu', { name: '高亮颜色' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '黄色' }));
    expect(chain.toggleHighlight).toHaveBeenCalledWith({ color: '#FEF08A' });
    expect(chain.run).toHaveBeenCalled();
  });

  it('opens the export menu on click and exports the selected format', async () => {
    const user = userEvent.setup();
    const { editor } = createEditor();
    render(<DocumentToolbar editor={editor} documentTitle="测试文档" onAddImage={vi.fn()} onSetLink={vi.fn()} onInsertTable={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '导出文档' }));
    await user.click(screen.getByRole('menuitem', { name: /HTML 文档/ }));

    expect(exportDocument).toHaveBeenCalledWith(editor, '测试文档', 'html');
    expect(screen.queryByRole('menu', { name: '导出文档' })).not.toBeInTheDocument();
  });
});
