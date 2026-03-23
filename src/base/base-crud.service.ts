import { Injectable } from '@nestjs/common';
import { Model, Document, UpdateQuery } from 'mongoose';

/**
 * Base CRUD Service for Cache Operations
 * Generic service that works with any Mongoose schema
 * 
 * @template TCache - Mongoose Document type
 */
@Injectable()
export class BaseCrudService<TCache extends Document> {
  protected readonly MONGODB_BATCH_SIZE = 100;
  protected readonly uniqueField: string;

  constructor(protected readonly model: Model<TCache>, uniqueField: string = 'url') {
    this.uniqueField = uniqueField;
    const serviceName = this.constructor.name;
    console.log(`🔷 [${serviceName}] initialized with model: ${model.modelName}, uniqueField: ${this.uniqueField}`);
  }

  /**
   * Get the unique field name for upsert operations
   * Override in child class if needed
   */
  public getUniqueField(): string {
    return this.uniqueField;
  }

  /**
   * Create new cache entry
   */
  async create(data: Partial<TCache>): Promise<TCache> {
    const cacheEntry = new this.model(data);
    return cacheEntry.save();
  }

  /**
   * Upsert - Update if exists, insert if not
   * Uses the uniqueField property to identify the document
   */
  async upsert(identifier: string | number, data: Partial<TCache>): Promise<TCache> {
    const serviceName = this.constructor.name;
    console.log(`🔷 [${serviceName}] upsert - identifier: ${identifier}, uniqueField: ${this.uniqueField}`);
    const result = await this.model.findOneAndUpdate(
      { [this.uniqueField]: identifier } as any,
      { $set: data },
      { upsert: true, new: true },
    ).exec();
    console.log(`✅ [${serviceName}] upsert completed - identifier: ${identifier}`);
    return result;
  }

  /**
   * Update existing cache entry
   * Uses the uniqueField property to identify the document
   */
  async update(identifier: string | number, data: Partial<TCache>): Promise<TCache | null> {
    return this.model.findOneAndUpdate(
      { [this.uniqueField]: identifier } as any,
      { $set: data },
      { new: true },
    ).exec();
  }

  /**
   * Delete cache entry
   * Uses the uniqueField property to identify the document
   */
  async delete(identifier: string | number): Promise<void> {
    const serviceName = this.constructor.name;
    console.log(`🔷 [${serviceName}] delete - identifier: ${identifier}, uniqueField: ${this.uniqueField}`);
    const result = await this.model.deleteOne({ [this.uniqueField]: identifier } as any).exec();
    console.log(`✅ [${serviceName}] delete completed - identifier: ${identifier}, deletedCount: ${result.deletedCount}`);
  }

  /**
   * Find by identifier
   * Uses the uniqueField property to identify the document
   */
  async findById(identifier: string | number): Promise<TCache | null> {
    return this.model.findOne({ [this.uniqueField]: identifier } as any).exec();
  }

  /**
   * Find all cache entries
   */
  async findAll(): Promise<TCache[]> {
    return this.model.find().exec();
  }

  /**
   * Find by status (if applicable)
   */
  async findByStatus(status: number): Promise<TCache[]> {
    return this.model.find({ status } as any).exec();
  }

  /**
   * Count total entries
   */
  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  /**
   * Check if entry exists
   * Uses the uniqueField property to identify the document
   */
  async exists(identifier: string | number): Promise<boolean> {
    const count = await this.model.countDocuments({ [this.uniqueField]: identifier } as any).exec();
    return count > 0;
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    await this.model.deleteMany({}).exec();
  }

  /**
   * Bulk upsert - Generic implementation
   * Child classes should override if they need custom logic
   */
  async bulkUpsert(data: Partial<TCache>[], uniqueField: string = 'entityId'): Promise<number> {
    if (data.length === 0) return 0;

    const bulkOps = data.map(doc => ({
      updateOne: {
        filter: { [uniqueField]: (doc as any)[uniqueField] } as any,
        update: { $set: doc as any },
        upsert: true,
      },
    })) as any;

    const result = await this.model.bulkWrite(bulkOps);
    return result.upsertedCount + result.modifiedCount;
  }
}

