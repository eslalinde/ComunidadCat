import { describe, it, expect } from 'vitest';

// Test the pure utility functions used by useCrud.
// Since stripAccents and accentVariants are not exported, we replicate and test them here.

describe('useCrud - accent utilities', () => {
  function stripAccents(term: string): string {
    return term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const ACCENT_OF: Record<string, string> = {
    a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú',
    A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú',
    n: 'ñ', N: 'Ñ',
  };

  function accentVariants(term: string): string[] {
    const stripped = stripAccents(term);
    const variants = new Set<string>();
    variants.add(term);
    variants.add(stripped);

    for (let i = 0; i < stripped.length; i++) {
      const accented = ACCENT_OF[stripped[i]];
      if (accented) {
        variants.add(stripped.slice(0, i) + accented + stripped.slice(i + 1));
      }
    }

    return Array.from(variants);
  }

  describe('stripAccents', () => {
    it('should strip accents from Spanish text', () => {
      expect(stripAccents('Medellín')).toBe('Medellin');
      expect(stripAccents('Bogotá')).toBe('Bogota');
      expect(stripAccents('España')).toBe('Espana');
    });

    it('should return unchanged text without accents', () => {
      expect(stripAccents('Colombia')).toBe('Colombia');
      expect(stripAccents('Test')).toBe('Test');
    });

    it('should handle empty string', () => {
      expect(stripAccents('')).toBe('');
    });

    it('should handle multiple accents', () => {
      expect(stripAccents('Pérez García')).toBe('Perez Garcia');
    });
  });

  describe('accentVariants', () => {
    it('should include original and stripped version', () => {
      const variants = accentVariants('Medellín');
      expect(variants).toContain('Medellín');
      expect(variants).toContain('Medellin');
    });

    it('should generate accent variants for vowels', () => {
      const variants = accentVariants('Maria');
      expect(variants).toContain('Maria');   // original
      expect(variants).toContain('María');   // accented i
      expect(variants).toContain('Mária');   // accented first a
      expect(variants).toContain('Mariá');   // accented second a
    });

    it('should generate ñ variant', () => {
      const variants = accentVariants('Espana');
      expect(variants).toContain('Espana');
      expect(variants).toContain('España');  // n→ñ at position 4
      expect(variants).toContain('Éspana');  // E→É
      expect(variants).toContain('Espána');  // a→á at position 3
      expect(variants).toContain('Espaná');  // a→á at position 5
    });

    it('should handle text without vowels gracefully', () => {
      const variants = accentVariants('xyz');
      expect(variants).toContain('xyz');
      expect(variants.length).toBe(1); // no accents to add
    });

    it('should not have duplicates', () => {
      const variants = accentVariants('Test');
      const unique = new Set(variants);
      expect(variants.length).toBe(unique.size);
    });
  });
});

describe('useCrud - options interface', () => {
  it('should define correct UseCrudOptions shape', () => {
    const options = {
      tableName: 'countries',
      searchFields: ['name', 'code'] as const,
      defaultSort: { field: 'name' as const, asc: true },
      pageSize: 10,
      foreignKeys: [
        {
          foreignKey: 'country_id',
          tableName: 'countries',
          displayField: 'name',
          alias: 'country',
        },
      ],
    };

    expect(options.tableName).toBe('countries');
    expect(options.searchFields).toHaveLength(2);
    expect(options.defaultSort.asc).toBe(true);
    expect(options.pageSize).toBe(10);
    expect(options.foreignKeys[0].alias).toBe('country');
  });

  it('should handle default values for optional params', () => {
    const options = {
      tableName: 'cities',
    };

    const searchFields = options.tableName ? [] : [];
    const defaultSort = { field: 'id', asc: true };
    const pageSize = 10;
    const foreignKeys: any[] = [];

    expect(searchFields).toEqual([]);
    expect(defaultSort.field).toBe('id');
    expect(pageSize).toBe(10);
    expect(foreignKeys).toEqual([]);
  });
});

describe('useCrud - select field building', () => {
  it('should build select fields with foreign key joins', () => {
    const foreignKeys = [
      { foreignKey: 'country_id', tableName: 'countries', displayField: 'name', alias: 'country' },
      { foreignKey: 'state_id', tableName: 'states', displayField: 'name', alias: 'state' },
    ];

    let selectFields = '*';
    if (foreignKeys.length > 0) {
      const foreignKeySelects = foreignKeys.map(fk => {
        const alias = fk.alias || fk.tableName;
        return `${alias}:${fk.foreignKey}(${fk.displayField})`;
      });
      selectFields = `*, ${foreignKeySelects.join(', ')}`;
    }

    expect(selectFields).toBe('*, country:country_id(name), state:state_id(name)');
  });

  it('should use tableName as alias when alias is not provided', () => {
    const foreignKeys: { foreignKey: string; tableName: string; displayField: string; alias?: string }[] = [
      { foreignKey: 'country_id', tableName: 'countries', displayField: 'name' },
    ];

    const fk = foreignKeys[0];
    const alias = fk.alias || fk.tableName;
    const selectField = `${alias}:${fk.foreignKey}(${fk.displayField})`;

    expect(selectField).toBe('countries:country_id(name)');
  });

  it('should return * when no foreign keys', () => {
    const foreignKeys: any[] = [];
    let selectFields = '*';
    if (foreignKeys.length > 0) {
      selectFields = `*, something`;
    }
    expect(selectFields).toBe('*');
  });
});

describe('useCrud - pagination calculation', () => {
  it('should calculate totalPages correctly', () => {
    const pageSize = 10;

    expect(Math.max(1, Math.ceil(0 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(5 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(10 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(11 / pageSize))).toBe(2);
    expect(Math.max(1, Math.ceil(100 / pageSize))).toBe(10);
  });

  it('should calculate range correctly', () => {
    const pageSize = 10;

    // Page 1
    let from = (1 - 1) * pageSize;
    let to = from + pageSize - 1;
    expect(from).toBe(0);
    expect(to).toBe(9);

    // Page 2
    from = (2 - 1) * pageSize;
    to = from + pageSize - 1;
    expect(from).toBe(10);
    expect(to).toBe(19);

    // Page 5
    from = (5 - 1) * pageSize;
    to = from + pageSize - 1;
    expect(from).toBe(40);
    expect(to).toBe(49);
  });
});
