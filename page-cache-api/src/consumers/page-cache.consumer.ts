import { Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { BaseConsumer } from '@uecsio/cache-api';
import { PageIndexTransformer } from '../services/page-index.transformer';
import { PAGE_CACHE_QUEUE_NAME } from '../constants/page-cache.constants';

@Injectable()
@Processor(PAGE_CACHE_QUEUE_NAME)
export class PageCacheConsumer extends BaseConsumer {
  constructor(transformService: PageIndexTransformer) {
    super(transformService);
  }
}

