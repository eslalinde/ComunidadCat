import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';

describe('queryKeys', () => {
  describe('crud', () => {
    it('should generate all key', () => {
      expect(queryKeys.crud.all).toEqual(['crud']);
    });

    it('should generate table key', () => {
      expect(queryKeys.crud.table('countries')).toEqual(['crud', 'countries']);
    });

    it('should generate list key with params', () => {
      const params = { search: 'test', sort: { field: 'name', asc: true }, page: 1, filters: {} };
      const key = queryKeys.crud.list('countries', 10, params);
      expect(key).toEqual(['crud', 'countries', 10, params]);
    });
  });

  describe('community', () => {
    it('should generate detail key', () => {
      expect(queryKeys.community.detail(1)).toEqual(['community', 'detail', 1]);
    });

    it('should generate brothers key', () => {
      expect(queryKeys.community.brothers(5)).toEqual(['community', 'brothers', 5]);
    });

    it('should generate teams key', () => {
      expect(queryKeys.community.teams(3)).toEqual(['community', 'teams', 3]);
    });

    it('should generate stepLogs key', () => {
      expect(queryKeys.community.stepLogs(2)).toEqual(['community', 'stepLogs', 2]);
    });
  });

  describe('options', () => {
    it('should generate table key', () => {
      expect(queryKeys.options.table('countries')).toEqual(['options', 'countries']);
    });

    it('should generate filtered key', () => {
      const filters = { country_id: 1 };
      expect(queryKeys.options.filtered('states', filters)).toEqual(['options', 'states', filters]);
    });

    it('should generate catechistTeams key', () => {
      expect(queryKeys.options.catechistTeams()).toEqual(['options', 'catechistTeams']);
    });
  });

  describe('parish', () => {
    it('should generate detail key', () => {
      expect(queryKeys.parish.detail(1)).toEqual(['parish', 'detail', 1]);
    });

    it('should generate priests key', () => {
      expect(queryKeys.parish.priests(2)).toEqual(['parish', 'priests', 2]);
    });

    it('should generate communities key', () => {
      expect(queryKeys.parish.communities(3)).toEqual(['parish', 'communities', 3]);
    });
  });

  describe('admin', () => {
    it('should generate users key', () => {
      expect(queryKeys.admin.users()).toEqual(['admin', 'users']);
    });
  });

  describe('communityAccess', () => {
    it('should generate community key', () => {
      expect(queryKeys.communityAccess.community(1)).toEqual(['communityAccess', 'community', 1]);
    });

    it('should generate mine key', () => {
      expect(queryKeys.communityAccess.mine()).toEqual(['communityAccess', 'mine']);
    });
  });
});
