import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * MongoDB schema for cached pages
 * This will mirror the SQL Page entity structure
 */
@Schema({ timestamps: true, collection: 'page' })
export class PageCache extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  url: string;

  @Prop()
  content?: string;

  @Prop()
  metaTitle?: string;

  @Prop()
  metaKeywords?: string;

  @Prop()
  metaDescription?: string;

  @Prop({ required: true, default: 1 })
  status: number;

  @Prop()
  activateFrom?: Date;

  @Prop()
  activateTo?: Date;
}

export const PageCacheSchema = SchemaFactory.createForClass(PageCache);

// Add indexes for better query performance
PageCacheSchema.index({ url: 1 }, { unique: true });
PageCacheSchema.index({ status: 1 });
PageCacheSchema.index({ activateFrom: 1, activateTo: 1 });
