import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  author: string;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: [] })
  tags: string[];
}

export const PostSchema = SchemaFactory.createForClass(Post);

// 목록 정렬(최신순)용
PostSchema.index({ createdAt: -1 });

// 제목+내용 검색용 (search API)
PostSchema.index({ title: 'text', content: 'text' });

// 작성자별 조회 + 최신순
PostSchema.index({ author: 1, createdAt: -1 });
