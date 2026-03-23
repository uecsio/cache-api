import { Injectable } from '@nestjs/common';
import { BaseIndexTransformer } from '@uecsio/cache-api';
import { Page } from '@uecsio/pages-api';
import { PageCache } from '../schemas/page-cache.schema';
import { PageIndexMapper } from '../mappers/page-index.mapper';
import { IndexCrudService } from './index-crud.service';

/**
 * Page Index Transformer
 * Extends generic BaseIndexTransformer for Page-specific transformation
 */
@Injectable()
export class PageIndexTransformer extends BaseIndexTransformer<Page, PageCache> {
  constructor(indexCrud: IndexCrudService) {
    super(indexCrud, PageIndexMapper);
  }
}
