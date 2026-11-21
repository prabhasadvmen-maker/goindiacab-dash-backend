import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },
    excerpt: { type: String, default: '', trim: true, maxlength: 300 },
    content: { type: String, default: '' }, // HTML from rich-text editor
    coverImage: { type: String, default: '' }, // R2 public URL after upload
    author: { type: String, default: 'GoIndiaCab Team', trim: true, maxlength: 60 },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

// Auto-set publishedAt when status changes to published
blogSchema.pre('save', function () {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export default mongoose.model('Blog', blogSchema);
