/** Injection token for the BaseCrudService instance of a cache feature. */
export const getCacheCrudToken = (queueName: string) => `CACHE_CRUD_${queueName}`;

/** Injection token for the BaseQueueService instance of a cache feature. */
export const getCacheQueueServiceToken = (queueName: string) => `CACHE_QUEUE_${queueName}`;

/** Injection token for the BaseIndexTransformer instance of a cache feature. */
export const getCacheTransformerToken = (queueName: string) => `CACHE_TRANSFORMER_${queueName}`;

/** Injection token for the mapper service instance of a cache feature. */
export const getCacheMapperToken = (queueName: string) => `CACHE_MAPPER_${queueName}`;
