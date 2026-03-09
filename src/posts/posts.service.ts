import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CommentsService } from '../comments/comments.service';

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
    const regex = new RegExp(keyword, 'i');
    return this.postModel
      .find({ $or: [{ title: regex }, { content: regex }] })
      .sort({ createdAt: -1 })
      .exec();
  }
}
