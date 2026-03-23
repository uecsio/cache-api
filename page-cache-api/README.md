# @uecsio/page-cache-api

A NestJS module for caching pages from SQL (PostgreSQL) to NoSQL (MongoDB) for improved read performance.

## Architecture

This package implements a **TypeORM Entity → Mongoose Schema** mapping pattern:

```
TypeORM Entity (SQL)
      ↓
Index Mapper Service ← Maps Entity to Schema
      ↓
Mongoose Schema (NoSQL)
      ↓
Index CRUD Service ← Cache operations
      ↓
MongoDB Cache Storage
```

## Overview

This package provides:
- **Index Mapper** - Maps TypeORM entities to Mongoose schemas
- **Index CRUD Service** - CRUD operations on cached data
- **Page Cache Service** - High-level cache management
- **Controller** - REST API for cache operations
- Fast read access to page data from MongoDB
- Synchronization between SQL and NoSQL

## Installation

```bash
npm install @uecsio/page-cache-api
```

## Usage

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { PageCacheModule } from '@uecsio/page-cache-api';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/admin-api'),
    PageCacheModule,
  ],
})
export class AppModule {}
```

### 2. Use the Index Mapper (TypeORM Entity → MongoDB)

```typescript
import { Injectable } from '@nestjs/common';
import { PagesService } from '@uecsio/pages-api';
import { IndexMapperService } from '@uecsio/page-cache-api';

@Injectable()
export class PageSyncService {
  constructor(
    private readonly pagesService: PagesService,      // TypeORM CRUD
    private readonly indexMapper: IndexMapperService, // Cache mapper
  ) {}

  // Sync a page to cache after create/update
  async syncPage(pageId: number) {
    const page = await this.pagesService.findOne({ where: { id: pageId } });
    if (page) {
      await this.indexMapper.save(page); // Map TypeORM Entity → Mongoose Schema
    }
  }

  // Sync all pages to cache
  async syncAll() {
    const pages = await this.pagesService.findAll();
    await this.indexMapper.mapMultipleEntities(pages);
  }

  // Remove from cache when deleted
  async removeFromCache(pageId: number) {
    await this.indexMapper.delete(pageId);
  }
}
```

### 3. Use the Index CRUD Service (Cache Operations)

```typescript
import { Injectable } from '@nestjs/common';
import { IndexCrudService } from '@uecsio/page-cache-api';

@Injectable()
export class PublicPagesService {
  constructor(
    private readonly indexCrud: IndexCrudService, // Fast MongoDB reads
  ) {}

  // Get pages from cache (fast!)
  async getActivePages() {
    return this.indexCrud.findActive();
  }

  async getPageFromCache(pageId: number) {
    return this.indexCrud.findById(pageId);
  }
}
```

## API

### IndexMapperService (TypeORM Entity → Mongoose Schema)

Maps SQL entities to NoSQL cache:

- `save(entity: Page)` - Map and save entity to cache
- `insert(entity: Page)` - Create new cache entry from entity
- `delete(entityId: number)` - Remove cache entry
- `mapEntityToIndex(entity: Page)` - Map entity and upsert to cache
- `mapMultipleEntities(entities: Page[])` - Bulk map entities
- `sync(entity: Page)` - Synchronize entity to cache
- `clear()` - Clear all cache

### IndexCrudService (MongoDB Cache Operations)

Direct cache CRUD operations:

- `create(data)` - Create cache entry
- `upsert(pageId, data)` - Update or insert cache entry
- `update(pageId, data)` - Update existing cache entry
- `delete(pageId)` - Delete cache entry
- `findById(pageId)` - Get cached page by ID
- `findAll()` - Get all cached pages
- `findByStatus(status)` - Get pages by status
- `findActive()` - Get active pages
- `count()` - Count cached pages
- `exists(pageId)` - Check if page is cached
- `clearAll()` - Clear all cache

### PageCacheService (Legacy/Helper)

- `upsertPage(pageData)` - Create or update a cached page
- `findAll()` - Get all cached pages
- `findByPageId(pageId)` - Get cached page by SQL page ID
- `findByStatus(status)` - Get cached pages by status
- `findActive()` - Get all active pages
- `deleteCachedPage(pageId)` - Delete a cached page
- `clearCache()` - Clear all cached pages
- `getStats()` - Get cache statistics

### REST API Endpoints

The package provides these endpoints:

- `GET /page-cache` - Get all cached pages
- `GET /page-cache/active` - Get active cached pages
- `GET /page-cache/stats` - Get cache statistics
- `GET /page-cache/:id` - Get cached page by ID
- `POST /page-cache/upsert/:id` - Upsert cache entry
- `DELETE /page-cache/:id` - Delete cached page
- `DELETE /page-cache` - Clear all cache

## Schema Customization

The MongoDB schema can be customized by editing `src/entities/page-cache.schema.ts`. Add additional fields as needed for your MongoDB-specific optimizations.

## License

MIT
