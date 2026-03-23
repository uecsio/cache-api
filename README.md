# @uecsio/cache-api

Generic base package for creating TypeORM Entity → MongoDB Cache transformation modules.

## Overview

This package provides **generic base classes** that you can extend to create cache modules for any entity type.

## Installation

```bash
npm install @uecsio/cache-api
```

## Usage: Create Your Own Cache Module

### Step 1: Create Mapper

```typescript
// mappers/page-index.mapper.ts
import { ICacheMapper } from '@uecsio/cache-api';
import { Page } from '@uecsio/pages-api';
import { PageCache } from '../schemas/page-cache.schema';

export class PageIndexMapper implements ICacheMapper<Page, PageCache> {
  static map(entity: Page): Partial<PageCache> {
    return {
      pageId: entity.id,
      title: entity.title,
      url: entity.url,
      // ... map all fields
    };
  }

  static mapMany(entities: Page[]): Partial<PageCache>[] {
    return entities.map(e => this.map(e));
  }
}
```

### Step 2: Create CRUD Service

```typescript
// services/index-crud.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCrudService } from '@uecsio/cache-api';
import { PageCache } from '../schemas/page-cache.schema';

@Injectable()
export class IndexCrudService extends BaseCrudService<PageCache> {
  constructor(
    @InjectModel(PageCache.name)
    model: Model<PageCache>,
  ) {
    super(model);
  }

  // Implement abstract methods
  async upsert(pageId: number, data: Partial<PageCache>): Promise<PageCache> {
    return this.model.findOneAndUpdate(
      { pageId },  // Your unique field
      { $set: data },
      { upsert: true, new: true },
    ).exec();
  }

  async update(pageId: number, data: Partial<PageCache>): Promise<PageCache | null> {
    return this.model.findOneAndUpdate(
      { pageId },
      { $set: data },
      { new: true },
    ).exec();
  }

  async delete(pageId: number): Promise<void> {
    await this.model.deleteOne({ pageId }).exec();
  }

  async findById(pageId: number): Promise<PageCache | null> {
    return this.model.findOne({ pageId }).exec();
  }

  async exists(pageId: number): Promise<boolean> {
    const count = await this.model.countDocuments({ pageId }).exec();
    return count > 0;
  }
}
```

### Step 3: Create Transformer

```typescript
// services/page-index.transformer.ts
import { Injectable } from '@nestjs/common';
import { BaseIndexTransformer } from '@uecsio/cache-api';
import { Page } from '@uecsio/pages-api';
import { PageCache } from '../schemas/page-cache.schema';
import { PageIndexMapper } from '../mappers/page-index.mapper';
import { IndexCrudService } from './index-crud.service';

@Injectable()
export class PageIndexTransformer extends BaseIndexTransformer<Page, PageCache> {
  constructor(indexCrud: IndexCrudService) {
    super(indexCrud, PageIndexMapper);
  }

  protected getEntityId(entity: Page): number {
    return entity.id;
  }

  protected getUniqueField(): string {
    return 'pageId';  // Field name in MongoDB schema
  }
}
```

### Step 4: Create Module

```typescript
// page-cache.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PageCache, PageCacheSchema } from './schemas/page-cache.schema';
import { PageIndexTransformer } from './services/page-index.transformer';
import { IndexCrudService } from './services/index-crud.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageCache.name, schema: PageCacheSchema },
    ]),
  ],
  providers: [
    IndexCrudService,
    PageIndexTransformer,
  ],
  exports: [
    IndexCrudService,
    PageIndexTransformer,
  ],
})
export class PageCacheModule {}
```

## What You Get

By extending the base classes, you automatically get:

### From BaseCrudService:
- ✅ `create()` - Create cache entry
- ✅ `upsert()` - Update or insert
- ✅ `update()` - Update existing
- ✅ `delete()` - Delete entry
- ✅ `findAll()` - Get all entries
- ✅ `findByStatus()` - Filter by status
- ✅ `count()` - Count entries
- ✅ `clearAll()` - Clear cache
- ✅ `bulkUpsert()` - Bulk operations

### From BaseIndexTransformer:
- ✅ `save()` - Transform and save entity
- ✅ `insert()` - Create cache entry
- ✅ `delete()` - Remove from cache
- ✅ `mapMultipleEntities()` - Bulk mapping
- ✅ `sync()` - Sync entity
- ✅ `clear()` - Clear all
- ✅ `syncAll()` - Bulk sync with streaming support
- ✅ **Streaming mode** with `useStreaming` flag
- ✅ **Batch processing** (100 records per MongoDB operation)
- ✅ **Progress tracking** with callbacks

## Features

### TypeORM Streaming Support
```typescript
await transformer.syncAll(repository, {
  useStreaming: true,  // Memory efficient for large datasets
});
```

### MongoDB Bulk Operations
- Automatically batches in chunks of 100 records
- Uses `bulkWrite` for optimal performance

### Generic Types
- Type-safe throughout
- Works with any TypeORM entity
- Works with any Mongoose schema

## Example: Create User Cache Module

```typescript
// user-cache/mappers/user-index.mapper.ts
export class UserIndexMapper implements ICacheMapper<User, UserCache> {
  static map(entity: User): Partial<UserCache> {
    return {
      userId: entity.id,
      username: entity.username,
      // ... map fields
    };
  }
  
  static mapMany(entities: User[]): Partial<UserCache>[] {
    return entities.map(e => this.map(e));
  }
}

// user-cache/services/user-crud.service.ts
@Injectable()
export class UserCrudService extends BaseCrudService<UserCache> {
  constructor(@InjectModel(UserCache.name) model: Model<UserCache>) {
    super(model);
  }
  
  // Implement abstract methods for userId field
  async upsert(userId: number, data: Partial<UserCache>) {
    return this.model.findOneAndUpdate({ userId }, { $set: data }, { upsert: true, new: true }).exec();
  }
  // ... implement other abstract methods
}

// user-cache/services/user-index.transformer.ts
@Injectable()
export class UserIndexTransformer extends BaseIndexTransformer<User, UserCache> {
  constructor(userCrud: UserCrudService) {
    super(userCrud, UserIndexMapper);
  }
  
  protected getEntityId(entity: User): number {
    return entity.id;
  }
  
  protected getUniqueField(): string {
    return 'userId';
  }
}
```

Done! You now have a generic user cache module with all the streaming and batch features! 🎉

## Benefits

✅ **Reusable** - Create cache modules for any entity in minutes  
✅ **Consistent** - Same pattern across all cache modules  
✅ **Type-safe** - Full TypeScript support with generics  
✅ **Battle-tested** - Streaming and batching built-in  
✅ **Maintainable** - Update base package, all modules benefit  

## License

MIT

