import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCrudService } from '@uecsio/cache-api';
import { PageCache } from '../schemas/page-cache.schema';

/**
 * Index CRUD Service
 * Extends generic BaseCrudService for PageCache-specific operations
 * Uses 'url' as the unique identifier (inherited from base class)
 */
@Injectable()
export class IndexCrudService extends BaseCrudService<PageCache> {
  protected readonly uniqueField = 'url'; // Pages are identified by URL

  constructor(
    @InjectModel(PageCache.name)
    model: Model<PageCache>,
  ) {
    super(model);
  }
}
