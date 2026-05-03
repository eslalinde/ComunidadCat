export interface TestUser {
  email: string;
  password: string;
  role: string;
  label: string;
  expectRedirect?: boolean;
}

const PASSWORD = 'TestPass123!';

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'e2e-admin@test.local',
    password: PASSWORD,
    role: 'admin',
    label: 'Administrador',
  },
  contributor: {
    email: 'e2e-contributor@test.local',
    password: PASSWORD,
    role: 'contributor',
    label: 'Contribuidor',
  },
  zone_leader: {
    email: 'e2e-zoneleader@test.local',
    password: PASSWORD,
    role: 'zone_leader',
    label: 'Jefe de Zona',
  },
  zone_contributor: {
    email: 'e2e-zonecontributor@test.local',
    password: PASSWORD,
    role: 'zone_contributor',
    label: 'Contribuidor Zona',
  },
  community_responsible: {
    email: 'e2e-communityresp@test.local',
    password: PASSWORD,
    role: 'community_responsible',
    label: 'Responsable de Comunidad',
    expectRedirect: true,
  },
  viewer_zone: {
    email: 'e2e-viewer-zone@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (zona)',
  },
  viewer_community: {
    email: 'e2e-viewer-community@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (comunidad)',
    expectRedirect: true,
  },
  viewer_grants: {
    email: 'e2e-viewer-grants@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (con grants)',
  },
  viewer_noscope: {
    email: 'e2e-viewer-noscope@test.local',
    password: PASSWORD,
    role: 'viewer',
    label: 'Viewer (sin alcance)',
  },
};

export const ALL_ROLE_KEYS = Object.keys(TEST_USERS);
