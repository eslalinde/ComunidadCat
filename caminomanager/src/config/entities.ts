import React from 'react';
import { EntityConfig } from '@/types/database';
import { Country, State, City, CityZone, Diocese, Parish, StepWay, TeamType, Person, Community, CommunityStepLog, ParishCatechesis, InventoryItemType } from '@/types/database';
import { CARISMA_OPTIONS } from '@/config/carisma';
import { CarismaBadge } from '@/components/ui/carisma-badge';

// Configuración para Países
export const countryConfig: EntityConfig<Country> = {
  tableName: 'countries',
  displayName: 'País',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre del país'
    },
    {
      name: 'code',
      label: 'Código',
      type: 'text',
      required: true,
      maxLength: 2,
      minLength: 2,
      placeholder: 'CO',
      validation: (value) => {
        if (value && value.length !== 2) {
          return 'El código debe tener exactamente 2 caracteres';
        }
        return null;
      }
    }
  ],
  searchFields: ['name', 'code'],
  sortableFields: ['name', 'code'],
  defaultSort: { field: 'name', asc: true }
};

// Configuración para Departamentos/Provincias
export const stateConfig: EntityConfig<State> = {
  tableName: 'states',
  displayName: 'Departamento',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre del departamento'
    },
    {
      name: 'country_id',
      label: 'País',
      type: 'select',
      required: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione un país'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name'],
  defaultSort: { field: 'name', asc: true },
  foreignKeys: [
    {
      foreignKey: 'country_id',
      tableName: 'countries',
      displayField: 'name',
      alias: 'country'
    }
  ]
};

// Configuración para Ciudades
export const cityConfig: EntityConfig<City> = {
  tableName: 'cities',
  displayName: 'Ciudad',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre de la ciudad'
    },
    {
      name: 'country_id',
      label: 'País',
      type: 'select',
      required: true,
      searchable: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Busque un país',
      description: 'Escriba para filtrar la lista de países.'
    },
    {
      name: 'state_id',
      label: 'Departamento',
      type: 'select',
      required: false,
      searchable: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Busque un departamento (opcional)',
      description: 'Las opciones dependen del país seleccionado.'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name'],
  defaultSort: { field: 'name', asc: true },
  foreignKeys: [
    {
      foreignKey: 'country_id',
      tableName: 'countries',
      displayField: 'name',
      alias: 'country'
    },
    {
      foreignKey: 'state_id',
      tableName: 'states',
      displayField: 'name',
      alias: 'state'
    }
  ]
};

// Configuración para Zonas por Ciudad
export const cityZoneConfig: EntityConfig<CityZone> = {
  tableName: 'city_zones',
  displayName: 'Zona',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre de la zona'
    },
    {
      name: 'city_id',
      label: 'Ciudad',
      type: 'select',
      required: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una ciudad'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name'],
  defaultSort: { field: 'name', asc: true },
  foreignKeys: [
    {
      foreignKey: 'city_id',
      tableName: 'cities',
      displayField: 'name',
      alias: 'city'
    }
  ]
};

// Configuración para Diócesis
export const dioceseConfig: EntityConfig<Diocese> = {
  tableName: 'dioceses',
  displayName: 'Diócesis',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre de la diócesis'
    },
    {
      name: 'type',
      label: 'Tipo',
      type: 'select',
      required: true,
      options: [
        { value: 'arquidiocesis', label: 'Arquidiócesis' },
        { value: 'diocesis', label: 'Diócesis' },
        { value: 'vicariato_apostolico', label: 'Vicariato Apostólico' },
        { value: 'ordinariato_militar', label: 'Ordinariato Militar' },
        { value: 'exarcado_apostolico', label: 'Exarcado Apostólico' }
      ],
      placeholder: 'Seleccione el tipo'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name', 'type'],
  defaultSort: { field: 'name', asc: true },
  renderValue: (fieldName: string, value: any) => {
    if (fieldName === 'type') {
      const typeOptions: Record<string, string> = {
        'arquidiocesis': 'Arquidiócesis',
        'diocesis': 'Diócesis',
        'vicariato_apostolico': 'Vicariato Apostólico',
        'ordinariato_militar': 'Ordinariato Militar',
        'exarcado_apostolico': 'Exarcado Apostólico'
      };
      return typeOptions[value] || String(value || '');
    }
    return String(value || '');
  }
};

// Configuración para Parroquias
export const parishConfig: EntityConfig<Parish> = {
  tableName: 'parishes',
  displayName: 'Parroquia',
  formSize: 'wide',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre de la parroquia',
      columnWidth: '220px',
      formSection: 'Información parroquial'
    },
    {
      name: 'diocese_id',
      label: 'Diócesis',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una diócesis (opcional)',
      columnWidth: '180px',
      searchable: true,
      description: 'Puede buscar por el nombre de la diócesis.'
    },
    {
      name: 'address',
      label: 'Dirección',
      type: 'text',
      required: false,
      maxLength: 256,
      placeholder: 'Ingrese la dirección',
      fullWidth: true
    },
    {
      name: 'phone',
      label: 'Teléfono',
      type: 'text',
      required: false,
      maxLength: 50,
      placeholder: 'Ingrese el número de teléfono',
      columnWidth: '120px'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      maxLength: 256,
      placeholder: 'Ingrese el email',
      columnWidth: '180px'
    },
    {
      name: 'city_id',
      label: 'Ciudad',
      type: 'select',
      required: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una ciudad',
      columnWidth: '100px',
      searchable: true,
      formSection: 'Ubicación',
      description: 'Escriba para buscar la ciudad de la parroquia.'
    },
    {
      name: 'zone_id',
      label: 'Zona',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una zona (opcional)',
      columnWidth: '80px',
      searchable: true,
      description: 'Las zonas disponibles dependen de la ciudad seleccionada.'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name'],
  defaultSort: { field: 'name', asc: true },
  foreignKeys: [
    {
      foreignKey: 'diocese_id',
      tableName: 'dioceses',
      displayField: 'name',
      alias: 'diocese'
    },
    {
      foreignKey: 'city_id',
      tableName: 'cities',
      displayField: 'name',
      alias: 'city'
    },
    {
      foreignKey: 'zone_id',
      tableName: 'city_zones',
      displayField: 'name',
      alias: 'zone'
    }
  ]
};

// Configuración para Etapas del Camino Neocatecumenal
export const stepWayConfig: EntityConfig<StepWay> = {
  tableName: 'step_ways',
  displayName: 'Etapa del Camino Neocatecumenal',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre de la etapa'
    },
    {
      name: 'order_num',
      label: 'Orden',
      type: 'number',
      required: false,
      placeholder: 'Ingrese el orden numérico'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name', 'order_num'],
  defaultSort: { field: 'order_num', asc: true }
};

// Configuración para Tipos de Equipo
export const teamTypeConfig: EntityConfig<TeamType> = {
  tableName: 'team_types',
  displayName: 'Tipo de Equipo',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre del tipo de equipo'
    },
    {
      name: 'order_num',
      label: 'Orden',
      type: 'number',
      required: false,
      placeholder: 'Ingrese el orden numérico'
    }
  ],
  searchFields: ['name'],
  sortableFields: ['name', 'order_num'],
  defaultSort: { field: 'order_num', asc: true }
};

// Configuración para Personas
export const personConfig: EntityConfig<Person> = {
  tableName: 'people',
  displayName: 'Persona',
  fields: [
    {
      name: 'person_name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre completo',
      formSection: 'Datos personales',
      fullWidth: true
    },
    {
      name: 'phone',
      label: 'Teléfono',
      type: 'text',
      required: false,
      maxLength: 50,
      placeholder: 'Ingrese el número de teléfono'
    },
    {
      name: 'mobile',
      label: 'Celular',
      type: 'text',
      required: false,
      maxLength: 50,
      placeholder: 'Ingrese el número de celular'
    },
    {
      name: 'email',
      label: 'Correo electrónico',
      type: 'email',
      required: false,
      maxLength: 256,
      placeholder: 'Ingrese el correo electrónico'
    },
    {
      name: 'person_type_id',
      label: 'Estado',
      type: 'select',
      required: false,
      options: CARISMA_OPTIONS,
      placeholder: 'Seleccione el estado',
      formSection: 'Vocación y vínculos'
    },
    {
      name: 'is_itinerante',
      label: 'Itinerante',
      tableLabel: 'Itin.',
      type: 'checkbox',
      required: false,
      columnWidth: '60px',
    },
    {
      name: 'gender_id',
      label: 'Género',
      type: 'select',
      required: false,
      options: [
        { value: 1, label: 'Masculino' },
        { value: 2, label: 'Femenino' }
      ],
      placeholder: 'Seleccione el género'
    },
    {
      name: 'location_country_id',
      label: 'País donde se encuentra',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione el país',
      hiddenInTable: true,
      searchable: true,
      formSection: 'Ubicación actual',
      description: 'Se muestra para itinerantes y vocaciones que requieren ubicación.'
    },
    {
      name: 'location_city_id',
      label: 'Ciudad donde se encuentra',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione la ciudad',
      hiddenInTable: true,
      searchable: true,
      description: 'Las ciudades dependen del país seleccionado.'
    },
    {
      name: 'spouse_id',
      label: 'Cónyuge',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione el cónyuge (opcional)',
      searchable: true,
      formSection: 'Matrimonio',
      description: 'Busque por nombre. La persona actual no aparece en la lista.'
    }
  ],
  searchFields: ['person_name', 'email'],
  sortableFields: ['person_name', 'email'],
  defaultSort: { field: 'person_name', asc: true },
  foreignKeys: [
    {
      foreignKey: 'spouse_id',
      tableName: 'people',
      displayField: 'person_name',
      alias: 'spouse'
    },
    {
      foreignKey: 'location_country_id',
      tableName: 'countries',
      displayField: 'name',
      alias: 'location_country'
    },
    {
      foreignKey: 'location_city_id',
      tableName: 'cities',
      displayField: 'name',
      alias: 'location_city'
    }
  ],
  // Función para renderizar valores personalizados en la tabla
  renderValue: (fieldName: string, value: any): React.ReactNode => {
    if (fieldName === 'is_itinerante') {
      if (value === true) {
        return React.createElement(CarismaBadge, { carisma: 'Itinerante', size: 'sm', showLabel: false });
      }
      return '';
    }

    if (fieldName === 'person_type_id') {
      const option = CARISMA_OPTIONS.find(opt => opt.value === value);
      if (option) {
        return React.createElement(CarismaBadge, { carisma: option.label });
      }
      return String(value || '');
    }

    if (fieldName === 'gender_id') {
      const genderOptions = [
        { value: 1, label: 'Masculino' },
        { value: 2, label: 'Femenino' }
      ];
      const option = genderOptions.find(opt => opt.value === value);
      return option ? option.label : String(value || '');
    }

    return String(value || '');
  }
};

// Configuración para Comunidades
export const communityConfig: EntityConfig<Community> = {
  tableName: 'communities',
  displayName: 'Comunidad',
  formSize: 'wide',
  fields: [
    {
      name: 'number',
      label: 'Número',
      tableLabel: 'No.',
      type: 'text',
      required: true,
      maxLength: 50,
      placeholder: 'Ingrese el número de la comunidad',
      columnWidth: '60px'
    },
    {
      name: 'born_date',
      label: 'Fecha de Nacimiento',
      tableLabel: 'F. Nacimiento',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha',
      columnWidth: '120px',
      hiddenInMobile: true
    },
    {
      name: 'parish_id',
      label: 'Parroquia',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una parroquia',
      searchable: true,
      fullWidth: true,
      description: 'Escriba para buscar la parroquia a la que pertenece.'
    },
    {
      name: 'born_brothers',
      label: 'Hermanos Iniciales',
      tableLabel: 'Hns. Inicio',
      type: 'number',
      required: false,
      placeholder: 'Ingrese el número de hermanos iniciales',
      columnWidth: '90px',
      hiddenInMobile: true
    },
    {
      name: 'actual_brothers',
      label: 'Hermanos Actuales',
      tableLabel: 'Hns. Actual',
      type: 'number',
      required: false,
      placeholder: 'Ingrese el número de hermanos actuales',
      columnWidth: '90px',
      hiddenInMobile: true
    },
    {
      name: 'step_way_id',
      label: 'Etapa Actual',
      tableLabel: 'Etapa',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione la etapa actual',
      columnWidth: '120px',
      hiddenInMobile: true,
      searchable: true
    },
    {
      name: 'last_step_way_date',
      label: 'Fecha Última Etapa',
      tableLabel: 'F. Últ. Etapa',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha',
      columnWidth: '120px',
      hiddenInMobile: true
    },
    {
      name: 'cathechist_team_id',
      label: 'Equipo de Catequistas',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione un equipo de catequistas',
      hiddenInTable: true,
      searchable: true,
      fullWidth: true,
      description: 'Busque el equipo de catequistas asignado a la comunidad.'
    }
  ],
  searchFields: ['number', 'parish'],
  sortableFields: ['number', 'born_date', 'actual_brothers'],
  defaultSort: { field: 'number', asc: true },
  foreignKeys: [
    {
      foreignKey: 'parish_id',
      tableName: 'parishes',
      displayField: 'name',
      alias: 'parish'
    },
    {
      foreignKey: 'step_way_id',
      tableName: 'step_ways',
      displayField: 'name',
      alias: 'step_way'
    },
    {
      foreignKey: 'cathechist_team_id',
      tableName: 'teams',
      displayField: 'name',
      alias: 'cathechist_team'
    }
  ]
};

// Configuración para CommunityStepLog
export const communityStepLogConfig: EntityConfig<CommunityStepLog> = {
  tableName: 'community_step_log',
  displayName: 'Log de Pasos de Comunidad',
  fields: [
    {
      name: 'community_id',
      label: 'Comunidad',
      type: 'select',
      required: true,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione una comunidad'
    },
    {
      name: 'step_way_id',
      label: 'Paso/Etapa',
      type: 'select',
      required: false,
      options: [], // Se llenará dinámicamente
      placeholder: 'Seleccione el paso realizado'
    },
    {
      name: 'date_of_step',
      label: 'Fecha del evento',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha'
    },
    {
      name: 'principal_catechist_name',
      label: 'Catequista Principal',
      type: 'text',
      required: false,
      maxLength: 256,
      placeholder: 'Ingrese el nombre del catequista'
    },
    {
      name: 'outcome',
      label: 'Estado',
      type: 'select',
      required: false,
      options: [
        { value: 'true', label: 'Cerrada' },
        { value: 'false', label: 'Abierta' }
      ],
      placeholder: 'Seleccione el estado del paso'
    },
    {
      name: 'notes',
      label: 'Notas',
      type: 'textarea',
      required: false,
      placeholder: 'Ingrese las notas del paso realizado'
    }
  ],
  searchFields: ['principal_catechist_name', 'notes'],
  sortableFields: ['date_of_step', 'principal_catechist_name'],
  defaultSort: { field: 'id', asc: false },
  foreignKeys: [
    {
      foreignKey: 'community_id',
      tableName: 'communities',
      displayField: 'number',
      alias: 'community'
    },
    {
      foreignKey: 'step_way_id',
      tableName: 'step_ways',
      displayField: 'name',
      alias: 'step_way'
    }
  ],
  renderValue: (fieldName: string, value: any) => {
    return String(value || '');
  }
};

// Configuración para Histórico de Catequesis por Parroquia
export const parishCatechesisConfig: EntityConfig<ParishCatechesis> = {
  tableName: 'parish_catechesis',
  displayName: 'Catequesis de Parroquia',
  fields: [
    {
      name: 'parish_id',
      label: 'Parroquia',
      type: 'select',
      required: true,
      options: [],
      placeholder: 'Seleccione una parroquia'
    },
    {
      name: 'planned_start_date',
      label: 'Fecha Tentativa de Inicio',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha tentativa'
    },
    {
      name: 'actual_start_date',
      label: 'Fecha de Inicio Real',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha de inicio real'
    },
    {
      name: 'birth_retreat_date',
      label: 'Fecha Convivencia de Nacimiento',
      type: 'date',
      required: false,
      placeholder: 'Seleccione la fecha de convivencia'
    },
    {
      name: 'attendance_count',
      label: 'Censo de Asistencia',
      type: 'number',
      required: false,
      placeholder: 'Número de asistentes'
    },
    {
      name: 'catechist_team',
      label: 'Equipo de Catequistas',
      type: 'textarea',
      required: false,
      placeholder: 'Ingrese el equipo de catequistas'
    }
  ],
  searchFields: ['catechist_team'],
  sortableFields: ['actual_start_date', 'planned_start_date', 'attendance_count'],
  defaultSort: { field: 'id', asc: false }
};

// Configuración para Tipos de Inventario
export const inventoryItemTypeConfig: EntityConfig<InventoryItemType> = {
  tableName: 'inventory_item_types',
  displayName: 'Tipo de Elemento de Inventario',
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      maxLength: 256,
      placeholder: 'Ingrese el nombre del elemento (ej: Cáliz, Patena, Biblia)',
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea',
      required: false,
      placeholder: 'Descripción opcional del elemento',
    },
  ],
  searchFields: ['name'],
  sortableFields: ['name'],
  defaultSort: { field: 'name', asc: true },
};

// Exportar todas las configuraciones
export const entityConfigs = {
  countries: countryConfig,
  states: stateConfig,
  cities: cityConfig,
  cityZones: cityZoneConfig,
  dioceses: dioceseConfig,
  parishes: parishConfig,
  stepWays: stepWayConfig,
  teamTypes: teamTypeConfig,
  people: personConfig,
  communities: communityConfig,
  communityStepLog: communityStepLogConfig,
  parishCatechesis: parishCatechesisConfig,
  inventoryItemTypes: inventoryItemTypeConfig
};
