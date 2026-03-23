import { Type } from '@nestjs/common';
import { Schema, Document } from 'mongoose';
import type { ICacheMapper } from '../interfaces/cache-mapper.interface';

export interface CacheFeatureOptions<TEntity, TCache extends Document> {
  /** TypeORM entity class to listen for and cache. */
  entity: new (...args: any[]) => TEntity;

  /**
   * Mongoose schema descriptor.
   * - `class`   — the decorated schema class (used for its `.name` as the model token)
   * - `factory` — the compiled Schema from `SchemaFactory.createForClass()`
   */
  schema: { class: new (...args: any[]) => TCache; factory: Schema };

  /**
   * Injectable mapper class that transforms TEntity → TCache.
   * Must implement ICacheMapper<TEntity, TCache>.
   * Can inject any NestJS services declared in `imports`.
   */
  mapper: Type<ICacheMapper<TEntity, TCache>>;

  /**
   * Extra NestJS modules whose providers the mapper (or other providers) may depend on.
   * E.g. TypeOrmModule.forFeature([SomeEntity]) for repository injection.
   */
  imports?: any[];

  /** Bull queue name. Must be unique per feature. */
  queueName: string;

  /**
   * Field on the entity used as the MongoDB upsert key.
   * Must match a property on the Mongoose schema.
   * @default 'url'
   */
  uniqueField?: string;
}
