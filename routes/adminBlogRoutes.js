import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listBlogs, getBlog, createBlog, updateBlog, deleteBlog } from '../controllers/adminBlogController.js';

const router = express.Router();
router.use(protect);

// Mounted at /api/admins/blogs
// Read: Admin + SuperAdmin | Write: SuperAdmin only (enforced inside controller)
router.route('/').get(listBlogs).post(createBlog);
router.route('/:id').get(getBlog).put(updateBlog).delete(deleteBlog);

export default router;
