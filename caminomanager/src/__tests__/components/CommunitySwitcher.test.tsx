import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunitySwitcher } from '@/components/crud/CommunitySwitcher';
import { createQueryHarness } from '@/__tests__/helpers/queryHarness';
import type { Community } from '@/types/database';

const toastInfo = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { info: (...a: unknown[]) => toastInfo(...a), error: (...a: unknown[]) => toastError(...a) },
}));

// Only the Supabase transport is simulated; the hook, grouping and QueryClient are real.
const rows = [
  { id: 1, number: '1', parish_id: 10, parish: { id: 10, name: 'Santa María de los Ángeles' } },
  { id: 2, number: '2', parish_id: 10, parish: { id: 10, name: 'Santa María de los Ángeles' } },
  { id: 3, number: '3', parish_id: 10, parish: { id: 10, name: 'Santa María de los Ángeles' } },
  { id: 4, number: '1', parish_id: 20, parish: { id: 20, name: 'San José' } },
  { id: 5, number: '4', parish_id: 30, parish: { id: 30, name: 'Cristo Rey' } },
  { id: 6, number: '5', parish_id: 30, parish: { id: 30, name: 'Cristo Rey' } },
];

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => {
      const chain = {
        select: () => chain,
        order: () => chain,
        range: () => Promise.resolve({ data: rows, error: null }),
      };
      return chain;
    },
  }),
}));

const community = { id: 2, number: '2', parish_id: 10 } as Community;

function renderSwitcher(communityId = 2) {
  const onNavigate = vi.fn();
  const { wrapper } = createQueryHarness();
  render(
    <CommunitySwitcher communityId={communityId} community={{ ...community, id: communityId }} onNavigate={onNavigate} />,
    { wrapper }
  );
  return { onNavigate, user: userEvent.setup() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommunitySwitcher', () => {
  it('shows the current community and parish as switch triggers', async () => {
    renderSwitcher();
    expect(
      await screen.findByRole('button', { name: /Cambiar de comunidad \(actual: Comunidad 2\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cambiar de parroquia \(actual: Santa María de los Ángeles\)/ })
    ).toBeInTheDocument();
  });

  it('switches to another community of the same parish', async () => {
    const { onNavigate, user } = renderSwitcher();
    await user.click(await screen.findByRole('button', { name: /Cambiar de comunidad/ }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Comunidad 1', 'Comunidad 2', 'Comunidad 3']);
    expect(screen.getByRole('option', { name: 'Comunidad 2' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('option', { name: 'Comunidad 3' }));
    expect(onNavigate).toHaveBeenCalledWith(3, 'forward');
  });

  it('steps to the previous and next community', async () => {
    const { onNavigate, user } = renderSwitcher();
    await user.click(await screen.findByRole('button', { name: 'Comunidad anterior: 1' }));
    expect(onNavigate).toHaveBeenLastCalledWith(1, 'backward');
    await user.click(screen.getByRole('button', { name: 'Comunidad siguiente: 3' }));
    expect(onNavigate).toHaveBeenLastCalledWith(3, 'forward');
  });

  it('keeps the same community number when switching parish', async () => {
    const { onNavigate, user } = renderSwitcher(1);
    await user.click(await screen.findByRole('button', { name: /Cambiar de parroquia/ }));
    await user.click(await screen.findByRole('option', { name: /San José/ }));
    expect(onNavigate).toHaveBeenCalledWith(4, 'parish');
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('opens the first community when the new parish lacks the current number', async () => {
    const { onNavigate, user } = renderSwitcher(2);
    await user.click(await screen.findByRole('button', { name: /Cambiar de parroquia/ }));
    await user.click(await screen.findByRole('option', { name: /Cristo Rey/ }));
    expect(onNavigate).toHaveBeenCalledWith(5, 'parish');
    expect(toastInfo).toHaveBeenCalledWith(
      'Cristo Rey no tiene Comunidad 2',
      expect.objectContaining({ description: expect.stringContaining('Comunidad 4') })
    );
  });

  it('selects the highlighted option with the keyboard', async () => {
    const { onNavigate, user } = renderSwitcher();
    await user.click(await screen.findByRole('button', { name: /Cambiar de comunidad/ }));
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(3, 'forward'));
  });
});
