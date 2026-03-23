import type { Job, JobCounts, JobOptions, Queue } from 'bull';
import type { ObjectLiteral, Repository } from 'typeorm';
import { indexOperations } from '../constants/index-operations';
import type { IndexJobPayload } from '../interfaces/index-job-payload.interface';

type CleanStatus<TEntity extends ObjectLiteral> = Parameters<Queue<IndexJobPayload<TEntity>>['clean']>[1];

type DefaultStatuses = readonly ['completed', 'wait', 'active', 'delayed', 'paused'];

const DEFAULT_CLEAN_STATUSES: DefaultStatuses = ['completed', 'wait', 'active', 'delayed', 'paused'];
const DEFAULT_CLEAN_GRACE = 3000;

export type QueueConfig<TEntity extends ObjectLiteral> = {
  model: string;
  uniqueField?: keyof TEntity & string;
  cleanStatuses?: CleanStatus<TEntity>[];
};

export class BaseQueueService<TEntity extends ObjectLiteral = ObjectLiteral> {
  private readonly cleanStatuses: CleanStatus<TEntity>[];
  private readonly model: string;
  private readonly uniqueField: keyof TEntity & string;

  constructor(
    protected readonly queue: Queue<IndexJobPayload<TEntity>>,
    config: QueueConfig<TEntity>,
  ) {
    this.model = config.model;
    this.uniqueField = config.uniqueField ?? ('id' as keyof TEntity & string);
    this.cleanStatuses =
      config.cleanStatuses ??
      (DEFAULT_CLEAN_STATUSES as unknown as CleanStatus<TEntity>[]);
    
    const serviceName = this.constructor.name;
    console.log(`🔷 [${serviceName}] initialized with model: ${this.model}, uniqueField: ${String(this.uniqueField)}`);
  }

  getUniqueField(): keyof TEntity & string {
    return this.uniqueField;
  }

  protected buildPayload(
    operation: IndexJobPayload<TEntity>['operation'],
    entity: TEntity,
    options?: Partial<Pick<IndexJobPayload<TEntity>, 'field' | 'model'>>,
  ): IndexJobPayload<TEntity> {
    return {
      operation,
      entity,
      field: options?.field ?? this.uniqueField,
      model: options?.model ?? this.model,
    };
  }

  async enqueue(payload: IndexJobPayload<TEntity>, options?: JobOptions): Promise<Job<IndexJobPayload<TEntity>>> {
    return this.queue.add(payload, options);
  }

  async enqueueAdd(entity: TEntity, options?: JobOptions): Promise<Job<IndexJobPayload<TEntity>>> {
    const payload = this.buildPayload(indexOperations.add, entity);
    const identifier = entity[this.uniqueField];
    console.log(`🔷 [${this.constructor.name}] enqueueAdd - model: ${this.model}, identifier: ${identifier}`);
    const job = await this.enqueue(payload, options);
    console.log(`✅ [${this.constructor.name}] enqueueAdd - job ${job.id} queued`);
    return job;
  }

  async enqueueUpdate(entity: TEntity, options?: JobOptions): Promise<Job<IndexJobPayload<TEntity>>> {
    const payload = this.buildPayload(indexOperations.update, entity);
    const identifier = entity[this.uniqueField];
    console.log(`🔷 [${this.constructor.name}] enqueueUpdate - model: ${this.model}, identifier: ${identifier}`);
    const job = await this.enqueue(payload, options);
    console.log(`✅ [${this.constructor.name}] enqueueUpdate - job ${job.id} queued`);
    return job;
  }

  async enqueueDelete(entity: TEntity, options?: JobOptions): Promise<Job<IndexJobPayload<TEntity>>> {
    const payload = this.buildPayload(indexOperations.delete, entity);
    const identifier = entity[this.uniqueField];
    console.log(`🔷 [${this.constructor.name}] enqueueDelete - model: ${this.model}, identifier: ${identifier}`);
    const job = await this.enqueue(payload, options);
    console.log(`✅ [${this.constructor.name}] enqueueDelete - job ${job.id} queued`);
    return job;
  }

  async enqueueSyncAll(
    repository: Repository<TEntity>,
    options?: JobOptions,
  ): Promise<Job<IndexJobPayload<TEntity>>> {
    const payload: IndexJobPayload<TEntity> = {
      operation: indexOperations.syncAll,
      entity: {} as TEntity,
      model: repository.metadata.tableName ?? repository.metadata.name ?? this.model,
      repository,
    };

    return this.queue.add(payload, options);
  }

  async cleanQueue(
    grace: number = DEFAULT_CLEAN_GRACE,
    statuses: CleanStatus<TEntity>[] = this.cleanStatuses,
  ): Promise<void> {
    await this.queue.pause();
    for (const status of statuses) {
      await this.queue.clean(grace, status);
    }
    await this.queue.resume();
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }

  async empty(): Promise<void> {
    await this.queue.empty();
  }

  async getJobCounts(): Promise<JobCounts> {
    return this.queue.getJobCounts();
  }
}

