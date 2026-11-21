import Blog from '../models/Blog.js';
import { uploadBase64ToR2, getPresignedUrl } from '../services/r2Service.js';

const isSuper = (req) => req.superadmin?.role === 'SuperAdmin';
const forbid = (res) => res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A blog post with this slug already exists' });
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      const first = err.errors ? Object.values(err.errors)[0]?.message : err.message;
      return res.status(400).json({ success: false, message: first || err.message });
    }
    console.error('adminBlog error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const BLOG_FIELDS = ['title', 'slug', 'excerpt', 'content', 'coverImage', 'author', 'tags', 'status'];

const cleanBody = async (body) => {
  const out = Object.fromEntries(BLOG_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

  if (out.slug !== undefined) out.slug = String(out.slug).toLowerCase().trim();
  if (out.title !== undefined) out.title = String(out.title).trim();
  if (out.author !== undefined) out.author = String(out.author).trim() || 'GoIndiaCab Team';
  if (out.excerpt !== undefined) out.excerpt = String(out.excerpt).trim();

  if (out.tags !== undefined) {
    if (typeof out.tags === 'string') {
      out.tags = out.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(out.tags)) {
      out.tags = out.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    }
    out.tags = [...new Set(out.tags)].slice(0, 10);
  }

  // base64 → upload to R2, store public URL
  if (out.coverImage && out.coverImage.startsWith('data:image')) {
    out.coverImage = await uploadBase64ToR2(out.coverImage, 'blog-cover');
  }

  return out;
};

// ───────── Admin (protected) ─────────

export const listBlogs = handle(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const { search, status } = req.query;

  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ title: rx }, { tags: rx }, { author: rx }];
  }
  if (status === 'published' || status === 'draft') filter.status = status;

  const [data, total, published, draft] = await Promise.all([
    Blog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Blog.countDocuments(filter),
    Blog.countDocuments({ status: 'published' }),
    Blog.countDocuments({ status: 'draft' }),
  ]);

  // Dashboard needs presigned URLs to display images
  const signed = await Promise.all(
    data.map(async (b) => ({ ...b, coverImage: await getPresignedUrl(b.coverImage) }))
  );

  res.json({
    success: true,
    data: signed,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    stats: { total: await Blog.countDocuments(), published, draft },
  });
});

export const getBlog = handle(async (req, res) => {
  const blog = await Blog.findById(req.params.id).lean();
  if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
  blog.coverImage = await getPresignedUrl(blog.coverImage);
  res.json({ success: true, data: blog });
});

export const createBlog = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const body = await cleanBody(req.body);
  if (!body.title) return res.status(400).json({ success: false, message: 'Title is required' });
  if (!body.slug) return res.status(400).json({ success: false, message: 'Slug is required' });
  const data = await Blog.create(body);
  res.status(201).json({ success: true, data });
});

export const updateBlog = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
  const body = await cleanBody(req.body);
  blog.set(body);
  await blog.save();
  res.json({ success: true, data: blog });
});

export const deleteBlog = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
  res.json({ success: true, message: 'Blog post deleted' });
});

// ───────── Public (no auth) ─────────
// Raw R2 public URL return karo — no presigning needed for public bucket

export const publicListBlogs = handle(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit) || 12));
  const { tag, search } = req.query;

  const filter = { status: 'published' };
  if (tag) filter.tags = String(tag).toLowerCase().trim();
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ title: rx }, { tags: rx }];
  }

  const [data, total] = await Promise.all([
    Blog.find(filter)
      .select('title slug excerpt coverImage author tags publishedAt createdAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Blog.countDocuments(filter),
  ]);

  const signed = await Promise.all(
    data.map(async (b) => ({ ...b, coverImage: await getPresignedUrl(b.coverImage) }))
  );

  res.json({ success: true, data: signed, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const publicGetBlog = handle(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
  blog.coverImage = await getPresignedUrl(blog.coverImage);
  res.json({ success: true, data: blog });
});
