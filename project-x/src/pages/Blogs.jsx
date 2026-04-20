import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteBlog, getBlogs } from '../utils/api.js'
import { formatBlogDate, normalizePost } from '../utils/blogs.js'

function Blogs() {
  const navigate = useNavigate()
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [postToDelete, setPostToDelete] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadBlogs() {
      setPosts([])
      setPostToDelete(null)

      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getBlogs(currentStore.id)

        if (!isCancelled) {
          setPosts((response ?? []).map(normalizePost))
        }
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Failed to load blog posts', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadBlogs()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, storeSwitchVersion, showToast])

  async function handleDeleteBlog() {
    if (!postToDelete || !currentStore?.id) {
      return
    }

    setIsSubmitting(true)

    try {
      await deleteBlog(postToDelete.id, currentStore.id)
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postToDelete.id))
      setPostToDelete(null)
      showToast('Blog post deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="blogs-page">
      <div className="stores-page__header">
        <div>
          <h2>Blogs</h2>
          <p>Create, publish, and manage blog posts for this store.</p>
        </div>
        <Button disabled={!currentStore?.id} onClick={() => navigate('/blogs/create')}>
          + Create Blog
        </Button>
      </div>

      <SurfaceCard className="blogs-card">
        {!currentStore?.id ? (
          <div className="categories-empty-state">
            <strong>Select a store first</strong>
            <p>Blog posts are managed per store.</p>
          </div>
        ) : isLoading ? (
          <div className="categories-skeleton" aria-label="Loading blog posts">
            {Array.from({ length: 5 }).map((_, index) => (
              <span className="categories-skeleton__row" key={index} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="categories-empty-state">
            <strong>No blog posts yet</strong>
            <p>Create your first post to publish announcements, guides, and stories.</p>
            <Button onClick={() => navigate('/blogs/create')}>+ Create Blog</Button>
          </div>
        ) : (
          <div className="blogs-table">
            <div className="blogs-table__head">
              <span>Title</span>
              <span>Status</span>
              <span>Created At</span>
              <span>Actions</span>
            </div>
            {posts.map((post) => (
              <div className="blogs-table__row" key={post.id}>
                <strong>{post.title}</strong>
                <span className={`blog-status ${post.isPublished ? 'blog-status--published' : ''}`}>
                  {post.isPublished ? 'Published' : 'Draft'}
                </span>
                <span>{formatBlogDate(post.createdAt)}</span>
                <span className="blogs-table__actions">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/blogs/create?edit=${post.id}`)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPostToDelete(post)}>
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/blog/${post.slug}?storeId=${encodeURIComponent(currentStore.id)}`
                    }}
                  >
                    Open
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
            <h3>Delete blog post?</h3>
            <p>This will remove "{postToDelete.title}" from this store.</p>
            <div className="confirm-modal__actions">
              <button type="button" onClick={() => setPostToDelete(null)}>
                Cancel
              </button>
              <button
                className="confirm-modal__danger"
                disabled={isSubmitting}
                type="button"
                onClick={handleDeleteBlog}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Blogs
