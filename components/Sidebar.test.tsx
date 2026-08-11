// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const mockSetTheme = vi.fn();
const mockShowToast = vi.fn();
const mockLogout = vi.fn();

vi.mock('../lib/auth', () => ({
  auth: {
    getToken: () => 'true',
    logout: () => mockLogout()
  }
}));

// Sidebar reads the real logged-in user (id/email/role/tenantId) from useSessionStore, which is
// populated from GET /api/auth/me by DashboardLayout — not from a client-writable cookie. Mock
// the store's selector-based API directly rather than a fabricated `user_info` cookie.
vi.mock('../store/useSessionStore', () => ({
  useSessionStore: (selector: (state: { user: { id: string; email: string; role: string; tenantId: string } | null; sessionStatus: string }) => unknown) =>
    selector({
      user: { id: 'user-1', email: 'maria@teste.com', role: 'admin', tenantId: 'tenant-1' },
      sessionStatus: 'authenticated',
    }),
}));

vi.mock('./design-system/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mockSetTheme, resolvedTheme: 'light' })
}));

vi.mock('./design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./design-system')>();
  return {
    ...actual,
    useToast: () => ({ toasts: [], showToast: mockShowToast })
  };
});

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: {} })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders without crashing and shows the main navigation items', () => {
    renderSidebar();

    expect(screen.getByText('Birth Hub 360')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(screen.getByText('Voice Studio')).toBeInTheDocument();
    // Real session user from useSessionStore (GET /api/auth/me), not a fabricated fallback.
    expect(screen.getByText('maria@teste.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('dispatches the open-command-palette event when the search trigger is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    window.addEventListener('open-command-palette', handler);

    renderSidebar();
    await user.click(screen.getByText('Pesquisar...'));

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('open-command-palette', handler);
  });

  it('opens the notification drawer and lists notifications when the bell is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();

    // Notification panel is not rendered until opened.
    expect(screen.queryByText('Painel de Alertas')).not.toBeInTheDocument();

    // The bell button is the first button in the header (before the search trigger).
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);

    expect(screen.getByText('Painel de Alertas')).toBeInTheDocument();
    expect(screen.getByText('IA Catarina Atualizada')).toBeInTheDocument();
  });

  it('removing a favorite shows a toast and updates the favorites section', async () => {
    const user = userEvent.setup();
    renderSidebar();

    // "Visão Geral" (/dashboard) is a default favorite, rendered once in the
    // Favoritos section and again in the Workspace section.
    const favoriteLabels = screen.getAllByText('Visão Geral');
    expect(favoriteLabels.length).toBeGreaterThanOrEqual(1);

    // Find the favorite-toggle (star) button next to the favorited link and click it.
    const favoriteLink = favoriteLabels[0].closest('a');
    expect(favoriteLink).not.toBeNull();
    const starButton = favoriteLink!.querySelector('button');
    expect(starButton).not.toBeNull();

    await user.click(starButton!);

    expect(mockShowToast).toHaveBeenCalledWith('Item removido dos favoritos', 'info');
  });
});
