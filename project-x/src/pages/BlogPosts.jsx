import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteBlogPost, getBlogPosts, getBlogs } from '../utils/api.js'
import { formatBlogDate, normalizeBlog, normalizePost } from '../utils/blogs.js'

function BlogPosts() {
  const navigate = useNavigate()
  const { id: blogId } = useParams()
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [blog, setBlog] = useState(null)
  const [posts, setPosts] = useState([])
  const [postToDelete, setPostToDelete] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadBlogPosts() {
      setBlog(null)
      setPosts([])
      setPostToDelete(null)

      if (!currentStore?.id || !blogId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const [blogsResponse, postsResponse] = await Promise.all([
          getBlogs(currentStore.id),
          getBlogPosts(blogId, currentStore.id),
        ])

        if (isCancelled) {
          return
        }

        const blogs = (blogsResponse ?? []).map(normalizeBlog)
        setBlog(blogs.find((entry) => String(entry.id) === String(blogId)) ?? null)
        setPosts((postsResponse ?? []).map(normalizePost))
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Failed to load blog posts', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadBlogPosts()

    return () => {
      isCancelled = true
    }
  }, [blogId, currentStore?.id, storeSwitchVersion, showToast])

  async function handleDeletePost() {
    if (!postToDelete || !currentStore?.id) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteBlogPost(postToDelete.id, blogId, currentStore.id)
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postToDelete.id))
      setPostToDelete(null)
      showToast('Post deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const blogTitle = blog?.title ?? 'Blog'

  return (
    <div className="blogs-page">
      <div className="stores-page__header">
        <div>
          <button className="product-editor__back" type="button" onClick={() => navigate('/blogs')}>
            <span aria-hidden="true">‹</span>
            Blogs
          </button>
          <h2>{blogTitle}</h2>
          <p>Write, schedule, and manage posts for this blog.</p>
        </div>
        <Button disabled={!currentStore?.id} onClick={() => navigate(`/blogs/${blogId}/posts/new`)}>
          + Create Post
        </Button>
      </div>

      <SurfaceCard className="blogs-card">
        {isLoading ? (
          <div className="categories-skeleton" aria-label="Loading posts">
            {Array.from({ length: 5 }).map((_, index) => (
              <span className="categories-skeleton__row" key={index} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="categories-empty-state">
            <strong>No posts yet</strong>
            <p>Create a draft or publish your first story for this blog.</p>
            <Button onClick={() => navigate(`/blogs/${blogId}/posts/new`)}>+ Create Post</Button>
          </div>
        ) : (
          <div className="blog-posts-table">
            <div className="blog-posts-table__head">
              <span>Title</span>
              <span>Status</span>
              <span>Published Date</span>
              <span>Actions</span>
            </div>
            {posts.map((post) => (
              <div className="blog-posts-table__row" key={post.id}>
                <strong>{post.title}</strong>
                <span className={`blog-status ${post.isPublished ? 'blog-status--published' : ''}`}>
                  {post.isPublished ? 'Published' : 'Draft'}
                </span>
                <span>{post.isPublished ? formatBlogDate(post.publishedAt) : '-'}</span>
                <span className="blogs-table__actions">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/blogs/${blogId}/posts/${post.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPostToDelete(post)}>
                    Delete
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {postToDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete post?</h3>
            <p>This will remove "{postToDelete.title}" from this blog.</p>
            <div className="confirm-modal__actions">
              <button type="button" onClick={() => setPostToDelete(null)}>
                Cancel
              </button>
              <button
                className="confirm-modal__danger"
                disabled={isDeleting}
                type="button"
                onClick={handleDeletePost}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BlogPosts
