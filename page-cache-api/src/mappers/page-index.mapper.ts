import { Page } from '@uecsio/pages-api';
import { PageCache } from '../schemas/page-cache.schema';

/**
 * Page Index Mapper
 * Maps TypeORM Entity (Page) → Mongoose Schema (PageCache)
 * Follows StaticCacheMapper pattern from @uecsio/cache-api
 */
export class PageIndexMapper {
  /**
   * Map a single TypeORM Page entity to Mongoose PageCache schema
   * 
   * @param entity - TypeORM Page entity from PostgreSQL
   * @returns Partial PageCache object for MongoDB
   */
  static map(entity: Page): Partial<PageCache> {
    // Exclude TypeORM-specific fields (id, createdAt, updatedAt)
    // MongoDB will manage its own _id and timestamps
    const { id, createdAt, updatedAt, status, ...cacheData } = entity;
    return cacheData;
  }

  /**
   * Map multiple TypeORM Page entities to Mongoose PageCache schemas
   * 
   * @param entities - Array of TypeORM Page entities
   * @returns Array of Partial PageCache objects
   */
  static mapMany(entities: Page[]): Partial<PageCache>[] {
    return entities.map(entity => this.map(entity));
  }
}

