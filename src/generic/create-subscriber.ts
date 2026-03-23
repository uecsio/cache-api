import { Injectable, Inject, Type } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral } from 'typeorm';
import { BaseCacheSyncSubscriber } from '../base/base-cache-sync.subscriber';
import { BaseQueueService } from '../base/base-queue.service';

/**
 * Factory that creates a TypeORM subscriber class for a specific entity and queue.
 *
 * The returned class extends BaseCacheSyncSubscriber and self-registers with the
 * DataSource (no @EventSubscriber() needed — base class handles registration).
 *
 * isEntityEligible checks that the entity object contains the uniqueField property,
 * which is the same field used as the MongoDB upsert key.
 */
export function createCacheSubscriber(
  entityClass: Function,
  queueServiceToken: string,
  uniqueField: string,
): Type<BaseCacheSyncSubscriber<ObjectLiteral>> {
  @Injectable()
  class CacheSubscriber extends BaseCacheSyncSubscriber<ObjectLiteral> {
    constructor(
      @InjectDataSource() dataSource: DataSource,
      @Inject(queueServiceToken) queue: BaseQueueService<ObjectLiteral>,
    ) {
      super(dataSource, queue, () => entityClass);
    }

    protected isEntityEligible(entity: unknown): entity is ObjectLiteral {
      return !!entity && typeof entity === 'object' && uniqueField in (entity as object);
    }
  }

  Object.defineProperty(CacheSubscriber, 'name', {
    value: `CacheSubscriber_${entityClass.name}`,
    configurable: true,
  });

  return CacheSubscriber;
}
