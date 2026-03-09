import { describe, it, expect } from 'vitest';
import {
  countryConfig,
  stateConfig,
  cityConfig,
  cityZoneConfig,
  dioceseConfig,
  parishConfig,
  stepWayConfig,
  teamTypeConfig,
  personConfig,
  communityConfig,
  communityStepLogConfig,
  parishCatechesisConfig,
  entityConfigs,
} from '@/config/entities';

describe('Entity Configurations', () => {
  const allConfigs = [
    { name: 'countryConfig', config: countryConfig, table: 'countries', display: 'País' },
    { name: 'stateConfig', config: stateConfig, table: 'states', display: 'Departamento' },
    { name: 'cityConfig', config: cityConfig, table: 'cities', display: 'Ciudad' },
    { name: 'cityZoneConfig', config: cityZoneConfig, table: 'city_zones', display: 'Zona' },
    { name: 'dioceseConfig', config: dioceseConfig, table: 'dioceses', display: 'Diócesis' },
    { name: 'parishConfig', config: parishConfig, table: 'parishes', display: 'Parroquia' },
    { name: 'stepWayConfig', config: stepWayConfig, table: 'step_ways', display: 'Etapa del Camino Neocatecumenal' },
    { name: 'teamTypeConfig', config: teamTypeConfig, table: 'team_types', display: 'Tipo de Equipo' },
    { name: 'personConfig', config: personConfig, table: 'people', display: 'Persona' },
    { name: 'communityConfig', config: communityConfig, table: 'communities', display: 'Comunidad' },
    { name: 'communityStepLogConfig', config: communityStepLogConfig, table: 'community_step_log', display: 'Log de Pasos de Comunidad' },
    { name: 'parishCatechesisConfig', config: parishCatechesisConfig, table: 'parish_catechesis', display: 'Catequesis de Parroquia' },
  ];

  describe.each(allConfigs)('$name', ({ config, table, display }) => {
    it('should have correct tableName', () => {
      expect(config.tableName).toBe(table);
    });

    it('should have correct displayName', () => {
      expect(config.displayName).toBe(display);
    });

    it('should have at least one field', () => {
      expect(config.fields.length).toBeGreaterThan(0);
    });

    it('should have searchFields defined', () => {
      expect(config.searchFields).toBeDefined();
      expect(config.searchFields.length).toBeGreaterThan(0);
    });

    it('should have sortableFields defined', () => {
      expect(config.sortableFields).toBeDefined();
      expect(config.sortableFields.length).toBeGreaterThan(0);
    });

    it('should have defaultSort with field and asc', () => {
      expect(config.defaultSort).toBeDefined();
      expect(config.defaultSort.field).toBeDefined();
      expect(typeof config.defaultSort.asc).toBe('boolean');
    });

    it('should have valid field types', () => {
      const validTypes = ['text', 'email', 'number', 'select', 'textarea', 'date', 'checkbox'];
      config.fields.forEach(field => {
        expect(validTypes).toContain(field.type);
      });
    });

    it('should have required fields with labels', () => {
      config.fields.forEach(field => {
        expect(field.name).toBeTruthy();
        expect(field.label).toBeTruthy();
      });
    });
  });

  describe('countryConfig - specific validations', () => {
    it('should have name and code fields', () => {
      const fieldNames = countryConfig.fields.map(f => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('code');
    });

    it('should require both name and code', () => {
      const nameField = countryConfig.fields.find(f => f.name === 'name');
      const codeField = countryConfig.fields.find(f => f.name === 'code');
      expect(nameField?.required).toBe(true);
      expect(codeField?.required).toBe(true);
    });

    it('should validate code length to exactly 2 characters', () => {
      const codeField = countryConfig.fields.find(f => f.name === 'code');
      expect(codeField?.minLength).toBe(2);
      expect(codeField?.maxLength).toBe(2);
    });

    it('should have custom validation for code field', () => {
      const codeField = countryConfig.fields.find(f => f.name === 'code');
      expect(codeField?.validation).toBeDefined();
      expect(codeField!.validation!('CO')).toBeNull();
      expect(codeField!.validation!('C')).toBe('El código debe tener exactamente 2 caracteres');
      expect(codeField!.validation!('COL')).toBe('El código debe tener exactamente 2 caracteres');
    });

    it('should not have foreign keys', () => {
      expect(countryConfig.foreignKeys).toBeUndefined();
    });
  });

  describe('stateConfig - foreign keys', () => {
    it('should have country_id foreign key', () => {
      expect(stateConfig.foreignKeys).toBeDefined();
      expect(stateConfig.foreignKeys!.length).toBe(1);
      expect(stateConfig.foreignKeys![0]).toEqual({
        foreignKey: 'country_id',
        tableName: 'countries',
        displayField: 'name',
        alias: 'country',
      });
    });

    it('should have country_id as a required select field', () => {
      const countryField = stateConfig.fields.find(f => f.name === 'country_id');
      expect(countryField).toBeDefined();
      expect(countryField?.type).toBe('select');
      expect(countryField?.required).toBe(true);
    });
  });

  describe('cityConfig - multiple foreign keys', () => {
    it('should have country_id and state_id foreign keys', () => {
      expect(cityConfig.foreignKeys).toBeDefined();
      expect(cityConfig.foreignKeys!.length).toBe(2);

      const countryFK = cityConfig.foreignKeys!.find(fk => fk.foreignKey === 'country_id');
      const stateFK = cityConfig.foreignKeys!.find(fk => fk.foreignKey === 'state_id');

      expect(countryFK).toBeDefined();
      expect(stateFK).toBeDefined();
      expect(countryFK!.alias).toBe('country');
      expect(stateFK!.alias).toBe('state');
    });

    it('state_id should be optional', () => {
      const stateField = cityConfig.fields.find(f => f.name === 'state_id');
      expect(stateField?.required).toBe(false);
    });
  });

  describe('dioceseConfig - static select options', () => {
    it('should have type field with predefined options', () => {
      const typeField = dioceseConfig.fields.find(f => f.name === 'type');
      expect(typeField).toBeDefined();
      expect(typeField?.type).toBe('select');
      expect(typeField?.options).toBeDefined();
      expect(typeField?.options!.length).toBe(5);
    });

    it('should have renderValue for type field', () => {
      expect(dioceseConfig.renderValue).toBeDefined();
      expect(dioceseConfig.renderValue!('type', 'arquidiocesis')).toBe('Arquidiócesis');
      expect(dioceseConfig.renderValue!('type', 'diocesis')).toBe('Diócesis');
      expect(dioceseConfig.renderValue!('type', 'unknown')).toBe('unknown');
    });
  });

  describe('personConfig - complex entity', () => {
    it('should have gender options', () => {
      const genderField = personConfig.fields.find(f => f.name === 'gender_id');
      expect(genderField).toBeDefined();
      expect(genderField?.options).toEqual([
        { value: 1, label: 'Masculino' },
        { value: 2, label: 'Femenino' },
      ]);
    });

    it('should have hidden table fields', () => {
      const hiddenFields = personConfig.fields.filter(f => f.hiddenInTable);
      expect(hiddenFields.length).toBeGreaterThan(0);
      const hiddenNames = hiddenFields.map(f => f.name);
      expect(hiddenNames).toContain('location_country_id');
      expect(hiddenNames).toContain('location_city_id');
    });

    it('should have checkbox type for is_itinerante', () => {
      const itineranteField = personConfig.fields.find(f => f.name === 'is_itinerante');
      expect(itineranteField).toBeDefined();
      expect(itineranteField?.type).toBe('checkbox');
    });

    it('should render gender labels', () => {
      expect(personConfig.renderValue!('gender_id', 1)).toBe('Masculino');
      expect(personConfig.renderValue!('gender_id', 2)).toBe('Femenino');
      expect(personConfig.renderValue!('gender_id', 99)).toBe('99');
    });

    it('should render empty string for is_itinerante false', () => {
      expect(personConfig.renderValue!('is_itinerante', false)).toBe('');
      expect(personConfig.renderValue!('is_itinerante', null)).toBe('');
    });
  });

  describe('parishConfig - multiple relationships', () => {
    it('should have 3 foreign keys', () => {
      expect(parishConfig.foreignKeys!.length).toBe(3);
      const fkNames = parishConfig.foreignKeys!.map(fk => fk.foreignKey);
      expect(fkNames).toContain('diocese_id');
      expect(fkNames).toContain('city_id');
      expect(fkNames).toContain('zone_id');
    });

    it('should have email field', () => {
      const emailField = parishConfig.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.type).toBe('email');
    });
  });

  describe('communityConfig - ordering', () => {
    it('should have step_way foreign key', () => {
      const stepFK = communityConfig.foreignKeys!.find(fk => fk.foreignKey === 'step_way_id');
      expect(stepFK).toBeDefined();
      expect(stepFK!.alias).toBe('step_way');
    });

    it('should have cathechist_team_id hidden in table', () => {
      const catField = communityConfig.fields.find(f => f.name === 'cathechist_team_id');
      expect(catField?.hiddenInTable).toBe(true);
    });
  });

  describe('entityConfigs export', () => {
    it('should export all 12 entity configs', () => {
      expect(Object.keys(entityConfigs).length).toBe(12);
    });

    it('should contain all expected keys', () => {
      const expectedKeys = [
        'countries', 'states', 'cities', 'cityZones', 'dioceses',
        'parishes', 'stepWays', 'teamTypes', 'people', 'communities',
        'communityStepLog', 'parishCatechesis',
      ];
      expectedKeys.forEach(key => {
        expect(entityConfigs).toHaveProperty(key);
      });
    });
  });
});
