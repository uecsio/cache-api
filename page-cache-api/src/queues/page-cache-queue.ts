import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BaseQueueService, type IndexJobPayload } from '@uecsio/cache-api';
import { Page } from '@uecsio/pages-api';
import { PAGE_CACHE_MODEL, PAGE_CACHE_QUEUE_NAME } from '../constants/page-cache.constants';

const UNIQUE_FIELD: keyof Page & string = 'url';

@Injectable()
export class PageCacheQueue extends BaseQueueService<Page> {
  constructor(@InjectQueue(PAGE_CACHE_QUEUE_NAME) queue: Queue<IndexJobPayload<Page>>) {
    super(queue, { model: PAGE_CACHE_MODEL, uniqueField: UNIQUE_FIELD });
  }
}
