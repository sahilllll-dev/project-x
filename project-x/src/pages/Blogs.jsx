import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { deleteBlog, getBlogs } from '../utils/api.js'
import { normalizeBlog } from '../utils/blogs.js'

function Blogs() {
  const navigate = useNavigate()
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [blogToDelete, setBlogToDelete] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadBlogs() {
      setBlogs([])
      setBlogToDelete(null)

      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getBlogs(currentStore.id)

        if (!isCancelled) {
          setBlogs((response ?? []).map(normalizeBlog))
        }
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Failed to load blogs', 'error')
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
    if (!blogToDelete || !currentStore?.id) {
      return
    }

    setIsSubmitting(true)

    try {
      await deleteBlog(blogToDelete.id, currentStore.id)
      setBlogs((currentBlogs) => currentBlogs.filter((blog) => blog.id !== blogToDelete.id))
      setBlogToDelete(null)
      showToast('Blog deleted', 'success')
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
          <p>Create multiple blogs for this store and manage their posts.</p>
        </div>
        <Button disabled={!currentStore?.id} onClick={() => navigate('/blogs/create')}>
          + Create Blog
        </Button>
      </div>

      <SurfaceCard className="blogs-card">
        {!currentStore?.id ? (
          <div className="categories-empty-state">
            <strong>Select a store first</strong>
            <p>Blogs are managed per store.</p>
          </div>
        ) : isLoading ? (
          <div className="categories-skeleton" aria-label="Loading blogs">
            {Array.from({ length: 5 }).map((_, index) => (
              <span className="categories-skeleton__row" key={index} />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="categories-empty-state">
            <strong>No blogs yet</strong>
            <p>Create your first blog to publish announcements, guides, and stories.</p>
            <Button onClick={() => navigate('/blogs/create')}>+ Create Blog</Button>
          </div>
        ) : (
          <div className="blogs-table">
            <div className="blogs-table__head">
              <span>Blog Title</span>
              <span>Handle</span>
              <span>Actions</span>
            </div>
            {blogs.map((blog) => (
              <div className="blogs-table__row" key={blog.id}>
                <strong>{blog.title}</strong>
                <span className="categories-table__slug">{blog.handle}</span>
                <span className="blogs-table__actions">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/blogs/create?edit=${blog.id}`)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBlogToDelete(blog)}>
                    Delete
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/blogs/${blog.id}`)}>
                    Open
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {blogToDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete blog?</h3>
            <p>This will remove "{blogToDelete.title}" and may also remove its posts.</p>
            <div className="confirm-modal__actions">
              <button type="button" onClick={() => setBlogToDelete(null)}>
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
