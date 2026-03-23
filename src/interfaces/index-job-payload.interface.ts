import type { ObjectLiteral, Repository } from 'typeorm';
import type { IndexOperation } from '../constants/index-operations';

export interface IndexJobPayload<TEntity extends ObjectLiteral> {
  operation: IndexOperation;
  entity: TEntity;
  field?: keyof TEntity & string;
  model: string;
  repository?: Repository<TEntity>;
}

