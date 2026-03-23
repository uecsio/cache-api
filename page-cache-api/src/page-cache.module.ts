import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageCache, PageCacheSchema } from './schemas/page-cache.schema';
import { PageIndexTransformer } from './services/page-index.transformer';
import { IndexCrudService } from './services/index-crud.service';
import { PageCacheQueue } from './queues/page-cache-queue';
import { PAGE_CACHE_QUEUE_NAME } from './constants/page-cache.constants';
import { PageCacheConsumer } from './consumers/page-cache.consumer';
import { PageCacheSyncSubscriber } from './subscribers/page-cache-sync.subscriber';
import { Page } from '@uecsio/pages-api';

@Module({
  imports: [
    // Import Bull Queue
    BullModule.registerQueue({
      name: PAGE_CACHE_QUEUE_NAME,
    }),
    // Import MongoDB PageCache schema
    MongooseModule.forFeature([
      { name: PageCache.name, schema: PageCacheSchema },
    ]),
    // Import TypeORM Page entity
    TypeOrmModule.forFeature([Page]),
  ],
  controllers: [],
  providers: [
    PageIndexTransformer,
    IndexCrudService,
    PageCacheConsumer,
    PageCacheQueue,
    PageCacheSyncSubscriber,
  ],
  exports: [
    IndexCrudService,
    PageCacheQueue,
  ],
})
export class PageCacheModule {}
