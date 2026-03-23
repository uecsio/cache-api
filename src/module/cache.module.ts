import { DynamicModule, Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseCrudService } from '../base/base-crud.service';
import { BaseQueueService } from '../base/base-queue.service';
import { BaseIndexTransformer } from '../base/base-index.transformer';
import { createCacheConsumer } from '../generic/create-consumer';
import { createCacheSubscriber } from '../generic/create-subscriber';
import type { CacheFeatureOptions } from './cache-feature-options.interface';
import {
  getCacheCrudToken,
  getCacheQueueServiceToken,
  getCacheTransformerToken,
  getCacheMapperToken,
} from './cache-tokens';

@Module({})
export class CacheModule {
  /**
   * Register a cache feature for a specific TypeORM entity.
   *
   * Wires up:
   *  - A Bull queue consumer (@Processor) that processes index jobs
   *  - A TypeORM subscriber that enqueues jobs on insert/update/delete
   *  - A BaseCrudService for MongoDB upsert/delete via Mongoose
   *  - A BaseQueueService for enqueuing jobs
   *  - A BaseIndexTransformer that delegates to the injectable mapper
   *
   * Exported tokens (injectable via @Inject):
   *  - getCacheCrudToken(queueName)       → BaseCrudService
   *  - getCacheQueueServiceToken(queueName) → BaseQueueService
   */
  static forFeature<TEntity, TCache extends Document>(
    options: CacheFeatureOptions<TEntity, TCache>,
  ): DynamicModule {
    const {
      entity,
      schema,
      mapper,
      queueName,
      uniqueField = 'url',
      imports: extraImports = [],
    } = options;

    const schemaName = schema.class.name;

    const CRUD_TOKEN = getCacheCrudToken(queueName);
    const QUEUE_TOKEN = getCacheQueueServiceToken(queueName);
    const TRANSFORMER_TOKEN = getCacheTransformerToken(queueName);
    const MAPPER_TOKEN = getCacheMapperToken(queueName);

    const ConsumerClass = createCacheConsumer(queueName, TRANSFORMER_TOKEN);
    const SubscriberClass = createCacheSubscriber(entity, QUEUE_TOKEN, uniqueField);

    return {
      module: CacheModule,
      imports: [
        BullModule.registerQueue({ name: queueName }),
        MongooseModule.forFeature([{ name: schemaName, schema: schema.factory }]),
        ...extraImports,
      ],
      providers: [
        { provide: MAPPER_TOKEN, useClass: mapper },
        {
          provide: CRUD_TOKEN,
          useFactory: (model) => new BaseCrudService(model, uniqueField),
          inject: [getModelToken(schemaName)],
        },
        {
          provide: QUEUE_TOKEN,
          useFactory: (queue) => new BaseQueueService(queue, { model: schemaName, uniqueField }),
          inject: [getQueueToken(queueName)],
        },
        {
          provide: TRANSFORMER_TOKEN,
          useFactory: (crud, mapperInst) => new BaseIndexTransformer(crud, mapperInst),
          inject: [CRUD_TOKEN, MAPPER_TOKEN],
        },
        ConsumerClass,
        SubscriberClass,
      ],
      exports: [CRUD_TOKEN, QUEUE_TOKEN],
    };
  }
}
