import { Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import type { ObjectLiteral, Repository } from 'typeorm';
import type { BaseIndexTransformer } from './base-index.transformer';
import { indexOperations } from '../constants/index-operations';
import type { IndexJobPayload } from '../interfaces/index-job-payload.interface';

@Injectable()
export class BaseConsumer {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly transformService: BaseIndexTransformer<ObjectLiteral, any>,
    private readonly repository?: Repository<ObjectLiteral>,
  ) {}

  @Process()
  async index(job: Job<IndexJobPayload<ObjectLiteral>>) {
    const jobData = job.data;
    const operation = jobData.operation;
    const model = jobData.model || 'unknown';

    this.logger.log(`Processing job ${job.id} - operation: ${operation}, model: ${model}`);

    try {
      if (operation === indexOperations.delete) {
        const field = jobData.field ?? 'url';
        const identifier = jobData.entity[field];

        this.logger.debug(`Delete operation - field: ${field}, identifier: ${identifier}`);

        if (identifier === undefined) {
          throw new Error(`Cannot delete cache entry without identifier field "${field}"`);
        }

        await this.transformService.delete(identifier as string | number);
        this.logger.log(`Delete operation completed for identifier: ${identifier}`);
      } else if (operation === indexOperations.syncAll) {
        this.logger.log(`SyncAll operation started`);

        const repository = this.repository ?? jobData.repository;

        if (!repository) {
          throw new Error(
            'syncAll operation requires a TypeORM repository. ' +
            'Pass it to the BaseConsumer constructor or include it in the job payload.',
          );
        }

        const count = await this.transformService.syncAll(repository);
        this.logger.log(`SyncAll operation completed - synced ${count} entities`);
      } else {
        const identifier = jobData.entity[jobData.field || 'id'];
        this.logger.debug(`Sync operation - identifier: ${identifier}`);
        await this.transformService.sync(jobData.entity);
        this.logger.log(`Sync operation completed for identifier: ${identifier}`);
      }

      await job.moveToCompleted(undefined, true);
      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (e) {
      this.logger.error(`Cache consumer error for job ${job.id}:`, e instanceof Error ? e.stack : e);
      const error = e instanceof Error ? e : new Error(String(e));
      await job.moveToFailed(error);
    }

    await job.finished();
  }
}
