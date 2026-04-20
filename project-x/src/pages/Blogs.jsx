import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createBlog, deleteBlog, getBlogs, updateBlog } from '../utils/api.js'
import { normalizeBlog, slugifyBlogValue } from '../utils/blogs.js'

const initialBlogForm = {
  title: '',
  handle: '',
}

function Blogs() {
  const navigate = useNavigate()
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [blogToDelete, setBlogToDelete] = useState(null)
  const [formData, setFormData] = useState(initialBlogForm)
  const [isHandleEdited, setIsHandleEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadBlogs() {
      setBlogs([])
      setIsModalOpen(false)
      setEditingBlog(null)
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

  function openCreateModal() {
    setEditingBlog(null)
    setFormData(initialBlogForm)
    setIsHandleEdited(false)
    setIsModalOpen(true)
  }

  function openEditModal(blog) {
    setEditingBlog(blog)
    setFormData({
      title: blog.title,
      handle: blog.handle,
    })
    setIsHandleEdited(true)
    setIsModalOpen(true)
  }

  function closeModal() {
    if (!isSubmitting) {
      setIsModalOpen(false)
    }
  }

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'title') {
      setFormData((currentData) => ({
        ...currentData,
        title: value,
        handle: isHandleEdited ? currentData.handle : slugifyBlogValue(value),
      }))
      return
    }

    setIsHandleEdited(true)
    setFormData((currentData) => ({
      ...currentData,
      [name]: slugifyBlogValue(value),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    const title = formData.title.trim()
    const handle = slugifyBlogValue(formData.handle || title)

    if (!title) {
      showToast('Blog title is required', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        storeId: currentStore.id,
        title,
        handle,
      }

      if (editingBlog) {
        const updatedBlog = normalizeBlog(await updateBlog(editingBlog.id, payload))
        setBlogs((currentBlogs) =>
          currentBlogs.map((blog) => (blog.id === updatedBlog.id ? updatedBlog : blog)),
        )
        showToast('Blog updated', 'success')
      } else {
        const createdBlog = normalizeBlog(await createBlog(payload))
        setBlogs((currentBlogs) => [createdBlog, ...currentBlogs])
        showToast('Blog created', 'success')
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <Button disabled={!currentStore?.id} onClick={openCreateModal}>
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
            <Button onClick={openCreateModal}>+ Create Blog</Button>
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
                  <Button size="sm" variant="outline" onClick={() => openEditModal(blog)}>
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

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <SurfaceCard
            as="form"
            className="category-modal"
            role="dialog"
            aria-modal="true"
            onSubmit={handleSubmit}
          >
            <div className="category-modal__header">
              <div>
                <h3>{editingBlog ? 'Edit Blog' : 'Create Blog'}</h3>
                <p>Use a short handle for storefront URLs and feeds.</p>
              </div>
              <button type="button" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="product-form__field">
              <label htmlFor="blog-title">Title</label>
              <input
                id="blog-title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="News"
                required
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="blog-handle">Handle</label>
              <input
                id="blog-handle"
                name="handle"
                type="text"
                value={formData.handle}
                onChange={handleChange}
                placeholder="news"
              />
            </div>

            <div className="category-modal__actions">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving...' : editingBlog ? 'Update Blog' : 'Create Blog'}
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

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
