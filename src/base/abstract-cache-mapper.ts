import type { Document } from 'mongoose';
import type { ObjectLiteral } from 'typeorm';
import type { ICacheMapper } from '../interfaces/cache-mapper.interface';

/**
 * Default {@link ICacheMapper#mapMany} via {@link Promise.all} over {@link map}.
 * Override {@link mapMany} when batching is required (e.g. one DB round-trip for many entities).
 */
export abstract class AbstractCacheMapper<
  TEntity extends ObjectLiteral,
  TCache extends Document,
> implements ICacheMapper<TEntity, TCache> {
  abstract map(
    entity: TEntity,
  ): Partial<TCache> | Promise<Partial<TCache>>;

  mapMany(
    entities: TEntity[],
  ): Partial<TCache>[] | Promise<Partial<TCache>[]> {
    return Promise.all(
      entities.map((entity) => Promise.resolve(this.map(entity))),
    );
  }
}
