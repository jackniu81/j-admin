import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { DATA_STORE, DataStore } from './data-store.interface';
import { FileStore } from './file.store';
import { PostgresStore } from './postgres.store';

/**
 * 数据层模块：按 DB_DRIVER 注入 FileStore 或 PostgresStore 其一（spec §3.2）。
 * 工厂内即时 init()，保证注入进来的 store 已就绪（建表/读文件/首次 seed）。
 */
@Module({
  providers: [
    {
      provide: DATA_STORE,
      inject: [AppConfigService],
      useFactory: async (cfg: AppConfigService): Promise<DataStore> => {
        const store: DataStore =
          cfg.dbDriver === 'postgres'
            ? new PostgresStore({
                host: cfg.pgHost,
                port: cfg.pgPort,
                user: cfg.pgUser,
                password: cfg.pgPassword,
                database: cfg.pgDatabase,
              })
            : new FileStore({ filePath: cfg.dbFile });
        await store.init();
        return store;
      },
    },
  ],
  exports: [DATA_STORE],
})
export class DataModule {}
