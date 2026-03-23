import { Injectable, Logger } from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import { Document } from 'mongoose';
import type { ICacheMapper } from '../interfaces/cache-mapper.interface';
import { BaseCrudService } from './base-crud.service';

/**
 * Base Index Transformer
 * Generic transformer for syncing TypeORM entities to MongoDB cache
 * 
 * @template TEntity - TypeORM Entity type
 * @template TCache - Mongoose Document type
 */
@Injectable()
export class BaseIndexTransformer<
  TEntity extends ObjectLiteral,
  TCache extends Document,
> {
  protected readonly MONGODB_BATCH_SIZE = 100;
  protected readonly logger: Logger;

  constructor(
    protected readonly crudService: BaseCrudService<TCache>,
    protected readonly mapper: ICacheMapper<TEntity, TCache>,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get unique identifier from entity - must be implemented by child class
   * Returns the value to use as unique identifier (e.g., URL string or numeric ID)
   */
  protected getUniqueIdentifier(entity: TEntity): string | number {
    const identifierField = this.crudService.getUniqueField();
    return entity[identifierField];
  }

  /**
   * Map Entity To Index
   */
  async mapEntityToIndex(entity: TEntity): Promise<TCache> {
    const mappedData = this.mapper.map(entity);
    const identifier = this.getUniqueIdentifier(entity);
    return this.crudService.upsert(identifier, mappedData);
  }

  /**
   * Save - Transform and cache entity
   */
  async save(entity: TEntity): Promise<TCache> {
    return this.mapEntityToIndex(entity);
  }

  /**
   * Insert - Create new cache entry
   */
  async insert(entity: TEntity): Promise<TCache> {
    const mappedData = this.mapper.map(entity);
    return this.crudService.create(mappedData);
  }

  /**
   * Delete - Remove cache entry by unique identifier
   */
  async delete(identifier: string | number): Promise<void> {
    this.logger.debug(`Deleting cache entry with identifier: ${identifier}`);
    await this.crudService.delete(identifier);
    this.logger.debug(`✅ Deleted cache entry with identifier: ${identifier}`);
  }

  /**
   * Bulk map - Map multiple entities to cache
   */
  async mapMultipleEntities(entities: TEntity[]): Promise<TCache[]> {
    const results: TCache[] = [];
    
    for (const entity of entities) {
      const cached = await this.mapEntityToIndex(entity);
      results.push(cached);
    }
    
    return results;
  }

  /**
   * Sync - Synchronize entity to cache
   */
  async sync(entity: TEntity): Promise<TCache> {
    const identifier = this.getUniqueIdentifier(entity);
    this.logger.debug(`Syncing entity with identifier: ${identifier}`);
    const result = await this.save(entity);
    this.logger.debug(`✅ Synced entity with identifier: ${identifier}`);
    return result;
  }

  /**
   * Clear - Remove all cache entries
   */
  async clear(): Promise<void> {
    await this.crudService.clearAll();
  }

  /**
   * Sync all entities from TypeORM to MongoDB cache
   * 
   * @param repository - TypeORM repository
   * @param options - Configuration options
   * @returns Total number of entities synced
   */
  async syncAll(
    repository: Repository<TEntity>,
    options?: {
      useStreaming?: boolean;
      batchSize?: number;
      onProgress?: (processed: number, total?: number) => void;
    },
  ): Promise<number> {
    const useStreaming = options?.useStreaming ?? false;
    const total = await repository.count();

    this.logger.log(
      `Starting ${useStreaming ? 'streaming' : 'batch'} sync: ${total} entities planned`,
    );

    if (total === 0) {
      this.logger.log('No entities found to sync.');
      return 0;
    }

    if (useStreaming) {
      return this.syncWithStreaming(repository, total, options?.onProgress);
    } else {
      return this.syncWithBatches(repository, total, options?.batchSize, options?.onProgress);
    }
  }

  /**
   * Sync using batch processing
   */
  private async syncWithBatches(
    repository: Repository<TEntity>,
    total: number,
    typeormBatchSize: number = 500,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<number> {
    let processed = 0;

    for (let offset = 0; offset < total; offset += typeormBatchSize) {
      const batch = await repository.find({
        skip: offset,
        take: typeormBatchSize,
        order: { id: 'ASC' } as any,
      });

      if (batch.length === 0) break;

      await this.saveBatchToMongo(batch);

      processed += batch.length;
      onProgress?.(processed, total);
      this.logger.debug(`Synced ${processed}/${total} entities (batch mode)`);
    }

    this.logger.log(`Finished batch sync: ${processed}/${total} entities cached`);
    return processed;
  }

  /**
   * Sync using TypeORM query streaming
   */
  private async syncWithStreaming(
    repository: Repository<TEntity>,
    total: number,
    onProgress?: (processed: number, total?: number) => void,
  ): Promise<number> {
    let processed = 0;
    let batch: Partial<TCache>[] = [];

    const stream = await repository
      .createQueryBuilder()
      .orderBy('id', 'ASC')
      .stream();

    return new Promise((resolve, reject) => {
      stream.on('data', (rawEntity: any) => {
        const entity = rawEntity as TEntity;
        const mapped = this.mapper.map(entity);
        batch.push(mapped);

        if (batch.length >= this.MONGODB_BATCH_SIZE) {
          stream.pause();
          
          this.saveBatchToMongoDirectly(batch)
            .then(() => {
              processed += batch.length;
              onProgress?.(processed, total);
              this.logger.debug(`Synced ${processed}/${total} entities (streaming mode)`);
              batch = [];
              stream.resume();
            })
            .catch(reject);
        }
      });

      stream.on('end', async () => {
        if (batch.length > 0) {
          await this.saveBatchToMongoDirectly(batch);
          processed += batch.length;
          this.logger.debug(`Synced ${processed}/${total} entities (streaming mode)`);
        }
        
        this.logger.log(`✅ Streaming sync complete: ${processed}/${total} entities cached`);
        resolve(processed);
      });

      stream.on('error', (error) => {
        this.logger.error('❌ Streaming error', error instanceof Error ? error.stack : undefined);
        reject(error);
      });
    });
  }

  /**
   * Save batch to MongoDB in chunks
   */
  private async saveBatchToMongo(entities: TEntity[]): Promise<void> {
    const mappedEntities = this.mapper.mapMany(entities);

    for (let i = 0; i < mappedEntities.length; i += this.MONGODB_BATCH_SIZE) {
      const mongoBatch = mappedEntities.slice(i, i + this.MONGODB_BATCH_SIZE);
      await this.saveBatchToMongoDirectly(mongoBatch);
    }
  }

  /**
   * Save batch directly to MongoDB using bulkWrite
   */
  private async saveBatchToMongoDirectly(batch: Partial<TCache>[]): Promise<void> {
    const uniqueField = this.getUniqueField();
    
    const bulkOps = batch.map(doc => ({
      updateOne: {
        filter: { [uniqueField]: (doc as any)[uniqueField] } as any,
        update: { $set: doc as any },
        upsert: true,
      },
    })) as any;

    await this.crudService['model'].bulkWrite(bulkOps);
  }

  /**
   * Get the unique field name for upsert operations
   * Override in child class if needed
   */
  protected getUniqueField(): string {
    return this.crudService.getUniqueField();
  }
}

