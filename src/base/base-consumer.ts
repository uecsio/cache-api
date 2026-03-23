import { Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import type { ObjectLiteral } from 'typeorm';
import type { BaseIndexTransformer } from './base-index.transformer';
import { indexOperations } from '../constants/index-operations';
import type { IndexJobPayload } from '../interfaces/index-job-payload.interface';

@Injectable()
export class BaseConsumer {
  constructor(
    private readonly transformService: BaseIndexTransformer<ObjectLiteral, any>,
  ) {}

  @Process()
  async index(job: Job<IndexJobPayload<ObjectLiteral>>) {
    const jobData = job.data;
    const consumerName = this.constructor.name;
    const operation = jobData.operation;
    const model = jobData.model || 'unknown';

    console.log(`🔷 [${consumerName}] Processing job ${job.id} - operation: ${operation}, model: ${model}`);

    try {
      if (operation === indexOperations.delete) {
        const field = jobData.field ?? 'url';
        const identifier = jobData.entity[field];

        console.log(`🔷 [${consumerName}] Delete operation - field: ${field}, identifier: ${identifier}`);

        if (identifier === undefined) {
          throw new Error(`Cannot delete cache entry without identifier field "${field}"`);
        }

        await this.transformService.delete(identifier as string | number);
        console.log(`✅ [${consumerName}] Delete operation completed for identifier: ${identifier}`);
      } else if (operation === indexOperations.syncAll) {
        console.log(`🔷 [${consumerName}] SyncAll operation started`);
        
        if (!jobData.repository) {
          throw new Error('syncAll operation requires a TypeORM repository instance in the job payload');
        }

        const count = await this.transformService.syncAll(jobData.repository);
        console.log(`✅ [${consumerName}] SyncAll operation completed - synced ${count} entities`);
      } else {
        const identifier = jobData.entity[jobData.field || 'id'];
        console.log(`🔷 [${consumerName}] Sync operation - identifier: ${identifier}`);
        await this.transformService.sync(jobData.entity);
        console.log(`✅ [${consumerName}] Sync operation completed for identifier: ${identifier}`);
      }

      await job.moveToCompleted(undefined, true);
      console.log(`✅ [${consumerName}] Job ${job.id} completed successfully`);
    } catch (e) {
      console.error(`❌ [${consumerName}] Cache consumer error for job ${job.id}:`, e);
      const error = e instanceof Error ? e : new Error(String(e));
      await job.moveToFailed(error);
    }

    await job.finished();
  }
}

