export type EligibilityCheck = 'catechist_team_responsible';

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  /** If set, the flag is only shown to users passing this eligibility check */
  eligibility?: EligibilityCheck;
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'community_visits',
    label: 'Visitas a la Comunidad',
    description:
      'Permite registrar visitas a la comunidad con descripciones y temas tratados. Disponible para responsables de equipos de catequistas.',
    defaultEnabled: false,
    eligibility: 'catechist_team_responsible',
  },
];
