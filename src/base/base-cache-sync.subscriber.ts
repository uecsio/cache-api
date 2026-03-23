import type {
  ObjectLiteral,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  EntitySubscriberInterface,
} from 'typeorm';
import type { BaseQueueService } from './base-queue.service';

type SubscriberRegistry = {
  subscribers?: any[];
};

export abstract class BaseCacheSyncSubscriber<TEntity extends ObjectLiteral>
  implements EntitySubscriberInterface<TEntity>
{
  protected constructor(
    protected readonly dataSource: SubscriberRegistry,
    protected readonly queue: BaseQueueService<TEntity>,
    private readonly entityTarget: () => Function,
  ) {
    const subscriberName = this.constructor.name;

    // Register subscriber with DataSource
    this.dataSource.subscribers?.push(this as EntitySubscriberInterface<any>);
    console.log(`🔷 [${subscriberName}] registered with DataSource, total subscribers:`, this.dataSource.subscribers?.length);
  }

  listenTo = () => this.entityTarget();

  protected abstract isEntityEligible(entity: unknown): entity is TEntity;

  async afterInsert(event: InsertEvent<TEntity>): Promise<void> {
    const subscriberName = this.constructor.name;
    console.log(`🟢 [${subscriberName}] afterInsert called, entity:`, event.entity);

    if (!this.isEntityEligible(event.entity)) {
      console.log(`⚠️  [${subscriberName}] afterInsert - entity not eligible, skipping`);
      return;
    }

    console.log(`✅ [${subscriberName}] afterInsert - entity eligible, enqueueing add operation`);
    await this.queue.enqueueAdd(event.entity);
  }

  async afterUpdate(event: UpdateEvent<TEntity>): Promise<void> {
    const subscriberName = this.constructor.name;
    const updatedEntity = event.entity;
    const previousEntity = event.databaseEntity;

    console.log(`🔄 [${subscriberName}] afterUpdate called, entity:`, updatedEntity);

    if (!this.isEntityEligible(updatedEntity)) {
      console.log(`⚠️  [${subscriberName}] afterUpdate - entity not eligible, skipping`);
      return;
    }

    const uniqueField = this.queue.getUniqueField();
    const previousValue = this.extractField(previousEntity, uniqueField);
    const updatedValue = this.extractField(updatedEntity, uniqueField);

    console.log(`🔄 [${subscriberName}] afterUpdate - uniqueField: ${String(uniqueField)}, previous: ${previousValue}, updated: ${updatedValue}`);

    if (previousValue === undefined || previousValue === updatedValue) {
      console.log(`✅ [${subscriberName}] afterUpdate - enqueueing update operation`);
      await this.queue.enqueueUpdate(updatedEntity);
      return;
    }

    console.log(`✅ [${subscriberName}] afterUpdate - unique field changed, enqueueing add and delete operations`);
    await this.queue.enqueueAdd(updatedEntity);

    if (this.isEntityEligible(previousEntity)) {
      await this.queue.enqueueDelete(previousEntity);
    }
  }

  async afterRemove(event: RemoveEvent<TEntity>): Promise<void> {
    const subscriberName = this.constructor.name;
    console.log(`🔴 [${subscriberName}] afterRemove called`);

    const entity = this.isEntityEligible(event.entity)
      ? event.entity
      : this.isEntityEligible(event.databaseEntity)
      ? (event.databaseEntity as TEntity)
      : undefined;

    if (!entity) {
      console.log(`⚠️  [${subscriberName}] afterRemove - no eligible entity found, skipping`);
      return;
    }

    console.log(`✅ [${subscriberName}] afterRemove - entity eligible, enqueueing delete operation`);
    await this.queue.enqueueDelete(entity);
  }

  private extractField(
    entity: unknown,
    field: keyof TEntity & string,
  ): string | number | undefined {
    if (!this.isEntityEligible(entity)) return undefined;
    const value = (entity as TEntity)[field];
    return typeof value === 'string' || typeof value === 'number' ? value : undefined;
  }
}

