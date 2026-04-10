import { Document } from 'mongoose';

/**
 * Cache Mapper Interface
 * Defines contract for injectable mapper services that transform TypeORM entities to Mongoose schemas.
 * Implement this interface in an @Injectable() class to support dependency injection
 * (e.g. inject TypeORM repositories, other services, HTTP clients, etc.).
 *
 * @template TEntity - TypeORM Entity type
 * @template TCache  - Mongoose Document type
 */
export interface ICacheMapper<TEntity, TCache extends Document> {
  /**
   * Map a single entity to a cache document.
   * Implementations may return a Promise when mapping requires async work (e.g. loading relations).
   */
  map(
    entity: TEntity,
  ): Partial<TCache> | Promise<Partial<TCache>>;

  /**
   * Map multiple entities to cache documents.
   * Implementations may return a Promise when mapping requires async work.
   */
  mapMany(
    entities: TEntity[],
  ): Partial<TCache>[] | Promise<Partial<TCache>[]>;
}

/**
 * @deprecated Use ICacheMapper with an @Injectable() class instead.
 * Kept for backwards compatibility with static-method mapper classes.
 */
export type StaticCacheMapper<TEntity, TCache extends Document> = {
  map(entity: TEntity): Partial<TCache> | Promise<Partial<TCache>>;
  mapMany(
    entities: TEntity[],
  ): Partial<TCache>[] | Promise<Partial<TCache>[]>;
};

