import { Schema, model, Document, Types } from 'mongoose';

export interface IVideo extends Document {
  title: string;
  description: string;
  url: string;
  duration: number;
  thumbnail: string;
  isPublished: boolean;
  order: number;
}

export interface IAssignment extends Document {
  title: string;
  description: string;
  deadline: Date;
  totalMarks: number;
  submissions: Types.ObjectId[];
}

export interface IMilestone extends Document {
  title: string;
  description: string;
  order: number;
  videos: IVideo[];
  assignments: IAssignment[];
  isPublished: boolean;
}

export interface ICourse extends Document {
  title: string;
  description: string;
  instructor: Types.ObjectId;
  price: number;
  discount: number;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail: string;
  milestones: IMilestone[];
  studentsEnrolled: Types.ObjectId[];
  rating: number;
  totalReviews: number;
  isPublished: boolean;
  requirements: string[];
  learningOutcomes: string[];
}

const videoSchema = new Schema<IVideo>({
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String },
  isPublished: { type: Boolean, default: false },
  order: { type: Number, required: true }
});

const assignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  deadline: { type: Date, required: true },
  totalMarks: { type: Number, required: true },
  submissions: [{ type: Schema.Types.ObjectId, ref: 'Submission' }]
});

const milestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true },
  videos: [videoSchema],
  assignments: [assignmentSchema],
  isPublished: { type: Boolean, default: false }
});

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  category: { type: String, required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  thumbnail: { type: String },
  milestones: [milestoneSchema],
  studentsEnrolled: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  requirements: [{ type: String }],
  learningOutcomes: [{ type: String }]
}, {
  timestamps: true
});

courseSchema.virtual('discountedPrice').get(function() {
  return this.price - (this.price * this.discount / 100);
});

export const Course = model<ICourse>('Course', courseSchema);