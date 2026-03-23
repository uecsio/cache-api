import { DataSource, EventSubscriber } from 'typeorm';
import { Page } from '@uecsio/pages-api';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseCacheSyncSubscriber } from '@uecsio/cache-api';
import { PageCacheQueue } from '../queues/page-cache-queue';

const hasUrl = (entity: unknown): entity is Page =>
  !!entity && typeof entity === 'object' && 'url' in entity && typeof (entity as Page).url === 'string';

@Injectable()
@EventSubscriber()
export class PageCacheSyncSubscriber extends BaseCacheSyncSubscriber<Page> {
  constructor(
    @InjectDataSource() readonly dataSource: DataSource,
    public readonly pageQueue: PageCacheQueue,
  ) {
    super(dataSource, pageQueue, () => Page);
  }

  protected isEntityEligible(entity: unknown): entity is Page {
    return hasUrl(entity);
  }
}
