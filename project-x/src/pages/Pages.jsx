import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ListViewContainer from '../components/ListViewContainer.jsx'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  createPage,
  deletePage,
  getPage,
  getPages,
  updatePage,
} from '../utils/api.js'

const initialPageForm = {
  title: '',
  slug: '',
  content: '',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
}

function generateSlug(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function ensureUniqueSlug(slug, pages, currentPageId = '') {
  const baseSlug = generateSlug(slug) || 'page'
  const existingSlugs = new Set(
    pages
      .filter((page) => String(page.id) !== String(currentPageId))
      .map((page) => page.slug),
  )

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 1
  let nextSlug = `${baseSlug}-${suffix}`

  while (existingSlugs.has(nextSlug)) {
    suffix += 1
    nextSlug = `${baseSlug}-${suffix}`
  }

  return nextSlug
}

function formatPageDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PageStatusBadge({ status }) {
  const isPublished = status === 'published'

  return (
    <span className={`page-status-badge${isPublished ? ' page-status-badge--published' : ''}`}>
      {isPublished ? 'Published' : 'Draft'}
    </span>
  )
}

function PagesList() {
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [pages, setPages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingPageId, setDeletingPageId] = useState('')

  useEffect(() => {
    let isCancelled = false

    async function loadPages() {
      if (!currentStore?.id) {
        setPages([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const nextPages = await getPages(currentStore.id)

        if (!isCancelled) {
          setPages(nextPages)
        }
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Unable to load pages', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPages()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, showToast])

  async function handleDeletePage(page) {
    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    if (!window.confirm('Are you sure you want to delete this page?')) {
      return
    }

    setDeletingPageId(page.id)

    try {
      await deletePage(page.id, currentStore.id)
      setPages((currentPages) => currentPages.filter((currentPage) => currentPage.id !== page.id))
      showToast('Page deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Unable to delete page', 'error')
    } finally {
      setDeletingPageId('')
    }
  }

  return (
    <div className="pages-page">
      <div className="pages-page__header">
        <div>
          <h2>Pages</h2>
          <p>Create and publish custom content pages for {currentStore?.name ?? 'your store'}.</p>
        </div>
        <Button as={Link} to="/pages/create" variant="primary">
          Create Page
        </Button>
      </div>

      <ListViewContainer
        isLoading={isLoading}
        isEmpty={pages.length === 0}
        loadingMessage="Loading pages..."
        emptyMessage="No pages found."
      >
        <div className="pages-table">
          <div className="pages-table__head">
            <span>Title</span>
            <span>Slug</span>
            <span>Status</span>
            <span>Updated At</span>
            <span>Actions</span>
          </div>

          {pages.map((page) => (
            <div className="pages-table__row" key={page.id}>
              <strong>{page.title || page.name || 'Untitled page'}</strong>
              <span className="pages-table__slug">/{page.slug}</span>
              <PageStatusBadge status={page.status} />
              <span>{formatPageDate(page.updatedAt)}</span>
              <div className="pages-table__actions">
                <Button as={Link} to={`/pages/edit/${page.id}`} size="sm" variant="outline">
                  Edit
                </Button>
                <Button as={Link} to={`/preview/page/${page.slug}`} size="sm" variant="outline">
                  Preview
                </Button>
                <Button
                  disabled={deletingPageId === page.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeletePage(page)}
                >
                  {deletingPageId === page.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ListViewContainer>
    </div>
  )
}

function PageEditor({ mode }) {
  const isEditMode = mode === 'edit'
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [form, setForm] = useState(initialPageForm)
  const [existingPages, setExistingPages] = useState([])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [savedState, setSavedState] = useState('')
  const [editorContent, setEditorContent] = useState('')

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'rich-text-editor__content',
      },
    },
    onUpdate({ editor: activeEditor }) {
      setSavedState('')
      setForm((currentForm) => ({
        ...currentForm,
        content: activeEditor.getHTML(),
      }))
    },
  })

  const isPublishDisabled = !form.title.trim()
  const resolvedSlug = useMemo(
    () => ensureUniqueSlug(form.slug || form.title, existingPages, id),
    [existingPages, form.slug, form.title, id],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    if ((editorContent || '') !== editor.getHTML()) {
      editor.commands.setContent(editorContent || '')
    }
  }, [editor, editorContent])

  useEffect(() => {
    let isCancelled = false

    async function loadPageEditor() {
      if (!currentStore?.id) {
        setExistingPages([])
        setForm(initialPageForm)
        setEditorContent('')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setSavedState('')

      try {
        const [pagesResponse, pageResponse] = await Promise.all([
          getPages(currentStore.id),
          isEditMode ? getPage(id, currentStore.id) : Promise.resolve(null),
        ])

        if (isCancelled) {
          return
        }

        setExistingPages(pagesResponse)

        if (pageResponse) {
          const nextForm = {
            title: pageResponse.title ?? '',
            slug: pageResponse.slug ?? '',
            content: pageResponse.content ?? '',
            status: pageResponse.status ?? 'draft',
            metaTitle: pageResponse.metaTitle ?? '',
            metaDescription: pageResponse.metaDescription ?? '',
          }

          setForm(nextForm)
          setEditorContent(nextForm.content)
          setIsSlugEdited(true)
        } else {
          setForm(initialPageForm)
          setEditorContent('')
          setIsSlugEdited(false)
        }
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Unable to load page', 'error')
        navigate('/pages')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPageEditor()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, id, isEditMode, navigate, showToast])

  function updateForm(nextForm) {
    setSavedState('')
    setForm((currentForm) => ({
      ...currentForm,
      ...nextForm,
    }))
  }

  function handleTitleChange(event) {
    const nextTitle = event.target.value

    setSavedState('')
    setForm((currentForm) => ({
      ...currentForm,
      title: nextTitle,
      slug: isSlugEdited
        ? currentForm.slug
        : ensureUniqueSlug(generateSlug(nextTitle), existingPages, id),
    }))
  }

  function handleSlugChange(event) {
    setIsSlugEdited(true)
    updateForm({ slug: generateSlug(event.target.value) })
  }

  function handleStatusChange(nextStatus) {
    if (nextStatus === 'published' && isPublishDisabled) {
      return
    }

    updateForm({ status: nextStatus })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    if (!form.title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    const finalSlug = ensureUniqueSlug(form.slug || form.title, existingPages, id)
    const payload = {
      store_id: currentStore.id,
      title: form.title.trim(),
      slug: finalSlug,
      content: editor?.getHTML() ?? form.content,
      status: form.status,
      meta_title: form.metaTitle.trim(),
      meta_description: form.metaDescription.trim(),
    }

    setIsSubmitting(true)
    setSavedState('saving')

    try {
      const savedPage = isEditMode ? await updatePage(id, payload) : await createPage(payload)
      setForm((currentForm) => ({
        ...currentForm,
        slug: savedPage.slug,
        content: savedPage.content,
      }))
      setSavedState('saved')
      showToast(isEditMode ? 'Page saved' : 'Page created', 'success')

      if (!isEditMode) {
        navigate(`/pages/edit/${savedPage.id}`, { replace: true })
      }
    } catch (error) {
      console.error(error)
      setSavedState('')
      showToast(error.message || 'Unable to save page', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading page editor...</p>
  }

  return (
    <form className="page-editor" onSubmit={handleSubmit}>
      <div className="page-editor__header">
        <button className="product-editor__back" type="button" onClick={() => navigate('/pages')}>
          <span aria-hidden="true">&lt;-</span>
          Pages
        </button>
        <div className="page-editor__title-row">
          <h2>{isEditMode ? 'Edit Page' : 'Create Page'}</h2>
          {savedState ? (
            <span className={`page-editor__saved page-editor__saved--${savedState}`}>
              {savedState === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="page-editor__grid">
        <div className="page-editor__main">
          <SurfaceCard className="product-panel">
            <div className="product-form__field">
              <label htmlFor="page-title">Title*</label>
              <input
                id="page-title"
                type="text"
                value={form.title}
                onChange={handleTitleChange}
                placeholder="About us"
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="page-slug">Slug*</label>
              <input
                id="page-slug"
                type="text"
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="about-us"
              />
              {form.slug && resolvedSlug !== form.slug ? (
                <p className="page-editor__hint">Will be saved as /{resolvedSlug}</p>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Content</h3>
            <div className="rich-text-editor">
              <div className="rich-text-toolbar" aria-label="Page content formatting">
                <button
                  className={editor?.isActive('bold') ? 'rich-text-toolbar__button--active' : ''}
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  aria-label="Bold"
                >
                  B
                </button>
                <button
                  className={editor?.isActive('italic') ? 'rich-text-toolbar__button--active' : ''}
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  aria-label="Italic"
                >
                  I
                </button>
                <button
                  className={
                    editor?.isActive('heading', { level: 2 })
                      ? 'rich-text-toolbar__button--active'
                      : ''
                  }
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  aria-label="Heading"
                >
                  H
                </button>
                <button
                  className={editor?.isActive('bulletList') ? 'rich-text-toolbar__button--active' : ''}
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  aria-label="Bulleted list"
                >
                  *
                </button>
                <button
                  className={
                    editor?.isActive('orderedList') ? 'rich-text-toolbar__button--active' : ''
                  }
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  aria-label="Numbered list"
                >
                  1.
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>SEO</h3>
            <div className="product-form__field">
              <label htmlFor="page-meta-title">Meta Title</label>
              <input
                id="page-meta-title"
                type="text"
                value={form.metaTitle}
                onChange={(event) => updateForm({ metaTitle: event.target.value })}
                placeholder="About Project X"
              />
            </div>
            <div className="product-form__field">
              <label htmlFor="page-meta-description">Meta Description</label>
              <textarea
                id="page-meta-description"
                rows="3"
                value={form.metaDescription}
                onChange={(event) => updateForm({ metaDescription: event.target.value })}
                placeholder="Short description for search engines"
              />
            </div>
          </SurfaceCard>
        </div>

        <aside className="page-editor__sidebar">
          <SurfaceCard className="product-panel">
            <h3>Status</h3>
            <div className="page-status-toggle" role="group" aria-label="Page status">
              <button
                className={form.status === 'draft' ? 'page-status-toggle__button--active' : ''}
                type="button"
                onClick={() => handleStatusChange('draft')}
              >
                Draft
              </button>
              <button
                className={form.status === 'published' ? 'page-status-toggle__button--active' : ''}
                disabled={isPublishDisabled}
                type="button"
                onClick={() => handleStatusChange('published')}
              >
                Published
              </button>
            </div>
            <Button disabled={isSubmitting || !form.title.trim()} fullWidth type="submit">
              {isSubmitting ? 'Saving...' : 'Save Page'}
            </Button>
            {isEditMode && form.slug ? (
              <Button
                as={Link}
                fullWidth
                to={`/preview/page/${resolvedSlug}`}
                variant="outline"
              >
                Preview
              </Button>
            ) : null}
          </SurfaceCard>
        </aside>
      </div>
    </form>
  )
}

function Pages({ mode = 'list' }) {
  if (mode === 'create' || mode === 'edit') {
    return <PageEditor mode={mode} />
  }

  return <PagesList />
}

export default Pages
