import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children, onClick, className, style }: any) => (
    <th onClick={onClick} className={className} style={style}>{children}</th>
  ),
  TableRow: ({ children, onClick, className }: any) => (
    <tr onClick={onClick} className={className}>{children}</tr>
  ),
  TableCell: ({ children, colSpan, className }: any) => (
    <td colSpan={colSpan} className={className}>{children}</td>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: React.forwardRef(({ children, asChild, ...props }: any, ref: any) =>
    asChild ? React.cloneElement(children, { ref, ...props }) : <span ref={ref} {...props}>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  Pencil: () => <span data-testid="pencil-icon">✏️</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  X: () => <span data-testid="x-icon">✕</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

import { EntityTable } from '@/components/crud/EntityTable';

type TestEntity = { id?: number; name: string; code: string };

const mockColumns = [
  { key: 'name' as keyof TestEntity, label: 'Nombre', sortable: true },
  { key: 'code' as keyof TestEntity, label: 'Código', sortable: true },
];

const mockData: TestEntity[] = [
  { id: 1, name: 'Colombia', code: 'CO' },
  { id: 2, name: 'México', code: 'MX' },
  { id: 3, name: 'Argentina', code: 'AR' },
];

const defaultProps = {
  data: mockData,
  columns: mockColumns,
  loading: false,
  sort: { field: 'name' as keyof TestEntity, asc: true },
  onSort: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('EntityTable', () => {
  it('should render column headers', () => {
    render(<EntityTable {...defaultProps} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('should render data rows', () => {
    render(<EntityTable {...defaultProps} />);
    expect(screen.getByText('Colombia')).toBeInTheDocument();
    expect(screen.getByText('CO')).toBeInTheDocument();
    expect(screen.getByText('México')).toBeInTheDocument();
    expect(screen.getByText('MX')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<EntityTable {...defaultProps} loading={true} data={[]} />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should show empty message when no data', () => {
    render(<EntityTable {...defaultProps} data={[]} emptyMessage="No hay países" />);
    expect(screen.getByText('No hay países')).toBeInTheDocument();
  });

  it('should show default empty message', () => {
    render(<EntityTable {...defaultProps} data={[]} />);
    expect(screen.getByText('No hay datos')).toBeInTheDocument();
  });

  it('should call onSort when sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<EntityTable {...defaultProps} onSort={onSort} />);

    const nameHeader = screen.getByText('Nombre').closest('th');
    await user.click(nameHeader!);
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('should show sort indicator on active sort field', () => {
    render(<EntityTable {...defaultProps} sort={{ field: 'name' as keyof TestEntity, asc: true }} />);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('should show descending sort indicator', () => {
    render(<EntityTable {...defaultProps} sort={{ field: 'name' as keyof TestEntity, asc: false }} />);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('should render foreign key values', () => {
    const columnsWithFK = [
      { key: 'name' as keyof TestEntity, label: 'Nombre', sortable: true },
      {
        key: 'code' as keyof TestEntity,
        label: 'País',
        foreignKey: {
          tableName: 'countries',
          displayField: 'name',
          alias: 'country',
        },
      },
    ];

    const dataWithFK = [
      { id: 1, name: 'Antioquia', code: '1', country: { name: 'Colombia' } },
    ];

    render(
      <EntityTable
        {...defaultProps}
        columns={columnsWithFK as any}
        data={dataWithFK as any}
      />
    );
    expect(screen.getByText('Colombia')).toBeInTheDocument();
  });

  it('should render custom render function', () => {
    const columnsWithRender = [
      {
        key: 'name' as keyof TestEntity,
        label: 'Nombre',
        render: (value: any) => <strong>{value}</strong>,
      },
    ];

    render(
      <EntityTable
        {...defaultProps}
        columns={columnsWithRender}
      />
    );
    const strongElements = screen.getAllByText('Colombia');
    expect(strongElements.length).toBeGreaterThan(0);
  });

  it('should hide delete button when hideDeleteInTable is true', () => {
    render(<EntityTable {...defaultProps} hideDeleteInTable={true} />);
    const trashIcons = screen.queryAllByTestId('trash-icon');
    expect(trashIcons.length).toBe(0);
  });

  it('should show delete buttons by default', () => {
    render(<EntityTable {...defaultProps} />);
    const trashIcons = screen.getAllByTestId('trash-icon');
    expect(trashIcons.length).toBe(mockData.length);
  });

  it('should call onRowClick when row is clicked and handler provided', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<EntityTable {...defaultProps} onRowClick={onRowClick} />);

    const rows = screen.getAllByText('Colombia');
    await user.click(rows[0].closest('tr')!);
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });
});
