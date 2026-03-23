import { Injectable, Inject, Type } from '@nestjs/common';
import { Processor } from '@nestjs/bull';
import type { ObjectLiteral } from 'typeorm';
import { BaseConsumer } from '../base/base-consumer';
import type { BaseIndexTransformer } from '../base/base-index.transformer';

/**
 * Factory that creates a Bull queue consumer class bound to a specific queue name.
 *
 * The returned class extends BaseConsumer and has @Processor(queueName) applied at
 * class-definition time, which is required for @nestjs/bull queue scanning to work.
 *
 * Register the returned class directly as a provider (class as its own token) so that
 * Bull can discover it via metadata scanning:
 *   providers: [ConsumerClass]
 */
export function createCacheConsumer(queueName: string, transformerToken: string): Type<BaseConsumer> {
  @Processor(queueName)
  @Injectable()
  class CacheConsumer extends BaseConsumer {
    constructor(
      @Inject(transformerToken) transformer: BaseIndexTransformer<ObjectLiteral, any>,
    ) {
      super(transformer);
    }
  }

  Object.defineProperty(CacheConsumer, 'name', {
    value: `CacheConsumer_${queueName}`,
    configurable: true,
  });

  return CacheConsumer;
}
