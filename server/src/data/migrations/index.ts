import { Migration } from '../migration';
import { initSchema } from './0001-init-schema';
import { indexes } from './0002-indexes';

/** 新增表结构变更时在此追加，版本号只增不改（forward-only） */
export const MIGRATIONS: Migration[] = [initSchema, indexes];
