import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BulkUploadWizard } from '@/components/bulk-upload/BulkUploadWizard';
import { executeBulkUpload } from '@/lib/bulk-upload-service';
import { Stepper } from '@/components/ui/stepper';
import { parseCsvFile, type ParsedBrother } from '@/lib/csv-parser';

vi.mock('@/lib/csv-parser', async () => {
  const actual = await vi.importActual<typeof import('@/lib/csv-parser')>(
    '@/lib/csv-parser',
  );
  return {
    ...actual,
    parseCsvFile: vi.fn(),
    downloadCsvTemplate: vi.fn(),
  };
});

vi.mock('@/lib/bulk-upload-service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/bulk-upload-service')
  >('@/lib/bulk-upload-service');
  return {
    ...actual,
    executeBulkUpload: vi.fn(),
  };
});

const validBrother: ParsedBrother = {
  rowIndex: 0,
  nombre: 'Persona E2E',
  telefono: '',
  celular: '3001234567',
  email: 'persona@test.local',
  carisma: 'Soltero',
  personTypeId: 2,
  genero: 'Masculino',
  genderId: 1,
  esItinerante: false,
  nombreConyuge: '',
  status: 'valid',
  errors: [],
  warnings: [],
  isResponsable: false,
};

describe('Stepper', () => {
  it('expone el paso actual y los estados anterior y pendiente', () => {
    render(
      <Stepper
        ariaLabel="Progreso de prueba"
        currentStep={1}
        steps={[
          { id: 'one', label: 'Primero' },
          { id: 'two', label: 'Segundo' },
          { id: 'three', label: 'Tercero' },
        ]}
      />,
    );

    const progress = screen.getByRole('navigation', {
      name: 'Progreso de prueba',
    });
    const items = within(progress).getAllByRole('listitem');

    expect(items[0]).toHaveAttribute('data-state', 'complete');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).toHaveAttribute('data-state', 'upcoming');
  });
});

describe('BulkUploadWizard con Stepper', () => {
  beforeEach(() => {
    vi.mocked(parseCsvFile).mockResolvedValue({
      brothers: [validBrother],
      errors: [],
    });
  });

  it('permite reintentar la carga sin seleccionar responsables', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const upload = vi.mocked(executeBulkUpload);
    upload.mockRejectedValueOnce(new Error('Respuesta perdida')).mockResolvedValueOnce({
      success: true, peopleCreated: 1, brothersLinked: 1, marriagesLinked: 0,
      responsablesAssigned: 0, errors: [],
    });
    render(<BulkUploadWizard open canAssignTeam={false} onClose={vi.fn()}
      communityId={1} communityNumber="1" onComplete={onComplete} />);
    await user.upload(screen.getByLabelText('Archivo CSV de hermanos'),
      new File(['nombre'], 'hermanos.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar Carga' }));
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(upload.mock.calls[0][3]).toEqual(expect.any(String));
    expect(upload.mock.calls[1][3]).toBe(upload.mock.calls[0][3]);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('avanza por los cuatro pasos y permite regresar sin perder datos', async () => {
    const user = userEvent.setup();
    render(
      <BulkUploadWizard
        canAssignTeam
        open
        onClose={vi.fn()}
        communityId={1}
        communityNumber="1"
        onComplete={vi.fn()}
      />,
    );

    const progress = screen.getByRole('navigation', {
      name: 'Progreso de carga masiva',
    });
    expect(within(progress).getByText('Cargar Archivo').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await user.upload(
      screen.getByLabelText('Archivo CSV de hermanos'),
      new File(['nombre\nPersona E2E'], 'hermanos.csv', { type: 'text/csv' }),
    );

    await waitFor(() =>
      expect(within(progress).getByText('Revisar Datos').closest('li')).toHaveAttribute(
        'aria-current',
        'step',
      ),
    );
    expect(screen.getByText('Persona E2E')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(within(progress).getByText('Responsables').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(within(progress).getByText('Confirmar').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(within(progress).getByText('Responsables').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByText('Persona E2E')).toBeVisible();
  });
});
