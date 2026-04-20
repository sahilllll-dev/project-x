export function slugifyBlogValue(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeBlog(blog) {
  return {
    ...blog,
    id: blog.id,
    storeId: blog.storeId ?? blog.store_id ?? '',
    title: blog.title ?? blog.name ?? '',
    handle: blog.handle ?? blog.slug ?? slugifyBlogValue(blog.title ?? blog.name),
    createdAt: blog.createdAt ?? blog.created_at ?? '',
    updatedAt: blog.updatedAt ?? blog.updated_at ?? '',
  }
}

export function normalizePost(post) {
  const isPublished =
    post.isPublished ?? post.is_published ?? post.status === 'published'

  return {
    ...post,
    id: post.id,
    blogId: post.blogId ?? post.blog_id ?? '',
    storeId: post.storeId ?? post.store_id ?? '',
    title: post.title ?? '',
    slug: post.slug ?? slugifyBlogValue(post.title),
    excerpt: post.excerpt ?? '',
    content: post.content ?? post.body ?? '',
    featuredImage: post.featuredImage ?? post.featured_image ?? '',
    tags: Array.isArray(post.tags)
      ? post.tags
      : String(post.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
    isPublished: Boolean(isPublished),
    publishedAt: post.publishedAt ?? post.published_at ?? '',
    createdAt: post.createdAt ?? post.created_at ?? '',
    updatedAt: post.updatedAt ?? post.updated_at ?? '',
  }
}

export function formatBlogDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
