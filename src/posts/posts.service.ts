import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CommentsService } from '../comments/comments.service';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly commentsService: CommentsService,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const post = new this.postModel(createPostDto);
    return post.save();
  }

  async findAll(): Promise<Post[]> {
    return this.postModel.find().sort({ createdAt: -1 }).exec();
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<Post>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.postModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.postModel.countDocuments().exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as Post[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  async findOneWithComments(id: string) {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
      .exec();
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    const comments = await this.commentsService.findByPost(id);
    return { ...post.toObject(), comments };
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.postModel
      .findByIdAndUpdate(id, updatePostDto, { new: true })
      .exec();
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  async remove(id: string): Promise<Post> {
    const post = await this.postModel.findByIdAndDelete(id).exec();
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    await this.commentsService.removeByPost(id);
    return post;
  }

  async findByTag(tag: string): Promise<Post[]> {
    return this.postModel.find({ tags: tag }).sort({ createdAt: -1 }).exec();
  }

  async search(keyword: string): Promise<Post[]> {
    // text index 사용 (title, content 필드)
    return this.postModel
      .find(
        { $text: { $search: keyword } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .lean()
      .exec();
  }
}
