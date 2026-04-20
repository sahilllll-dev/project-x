import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import SurfaceCard from '../../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../../context/AppContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import {
  createBlog,
  getBlogs,
  updateBlog,
} from '../../utils/api.js'
import { normalizePost } from '../../utils/blogs.js'

const initialFormData = {
  title: '',
  slug: '',
  content: '',
  tags: [],
  thumbnailUrl: '',
  metaTitle: '',
  metaDescription: '',
  isPublished: false,
  publishedAt: '',
}

function getDraftKey(storeId, editId) {
  return `projectx:create-blog-post:${storeId || 'store'}:${editId || 'new'}`
}

function sanitizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getDatetimeInput(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 16)
}

function isLocalImagePreview(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}

function getPersistableImageUrl(value) {
  return isLocalImagePreview(value) ? '' : value
}

function CreateBlogToolbar({ editor }) {
  if (!editor) {
    return null
  }

  function setLink() {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter link URL', previousUrl || 'https://')

    if (url === null) {
      return
    }

    if (!url) {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function addImage() {
    const url = window.prompt('Paste image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="blog-editor-toolbar">
      <button
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <button className={editor.isActive('bold') ? 'is-active' : ''} type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
        Bold
      </button>
      <button className={editor.isActive('italic') ? 'is-active' : ''} type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
        Italic
      </button>
      <button className={editor.isActive('strike') ? 'is-active' : ''} type="button" onClick={() => editor.chain().focus().toggleStrike().run()}>
        Underline
      </button>
      <button className={editor.isActive('bulletList') ? 'is-active' : ''} type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        Bullets
      </button>
      <button className={editor.isActive('orderedList') ? 'is-active' : ''} type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        Numbers
      </button>
      <button className={editor.isActive('link') ? 'is-active' : ''} type="button" onClick={setLink}>
        Link
      </button>
      <button type="button" onClick={addImage}>
        Image
      </button>
    </div>
  )
}

function CreateBlogPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditMode = Boolean(editId)
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(initialFormData)
  const [tagInput, setTagInput] = useState('')
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastAutosavedAt, setLastAutosavedAt] = useState('')

  const draftKey = useMemo(() => getDraftKey(currentStore?.id, editId), [currentStore?.id, editId])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    ],
    content: '<p>Start writing your blog content...</p>',
    editorProps: {
      attributes: {
        class: 'blog-rich-editor__content',
      },
    },
    onUpdate({ editor: currentEditor }) {
      setFormData((currentData) => ({ ...currentData, content: currentEditor.getHTML() }))
      setIsDirty(true)
    },
  })

  useEffect(() => {
    let isCancelled = false

    async function loadPageData() {
      if (!currentStore?.id) {
        return
      }

      try {
        const blogsResponse = isEditMode ? await getBlogs(currentStore.id) : []

        if (isCancelled) {
          return
        }

        if (isEditMode) {
          const post = (blogsResponse ?? []).map(normalizePost).find((entry) => entry.id === editId)
          if (post) {
            setFormData({
              ...initialFormData,
              title: post.title,
              slug: post.slug,
              content: post.content || '',
              tags: Array.isArray(post.tags) ? post.tags : [],
              thumbnailUrl: post.thumbnail || post.thumbnailUrl || '',
              metaTitle: post.seoTitle || post.metaTitle || post.meta_title || '',
              metaDescription: post.seoDescription || post.metaDescription || post.meta_description || '',
              isPublished: post.isPublished,
              publishedAt: getDatetimeInput(post.publishedAt || post.scheduledAt),
            })
            setIsSlugEdited(true)
            editor?.commands.setContent(post.content || '<p></p>')
          }
        }
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Failed to load blog editor', 'error')
      }
    }

    loadPageData()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, editId, editor, isEditMode, showToast])

  useEffect(() => {
    if (!editor || isEditMode) {
      return undefined
    }

    const rawDraft = window.localStorage.getItem(draftKey)
    if (!rawDraft) {
      return undefined
    }

    try {
      const draft = JSON.parse(rawDraft)
      const timerId = window.setTimeout(() => {
        setFormData({ ...initialFormData, ...draft.formData })
        setIsSlugEdited(Boolean(draft.formData?.slug))
        editor.commands.setContent(draft.formData?.content || '<p></p>')
      }, 0)
      return () => window.clearTimeout(timerId)
    } catch {
      window.localStorage.removeItem(draftKey)
      return undefined
    }
  }, [draftKey, editor, isEditMode])

  useEffect(() => {
    if (!isDirty) {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ formData, savedAt: new Date().toISOString() }))
      setLastAutosavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }, 10000)

    return () => window.clearTimeout(timerId)
  }, [draftKey, formData, isDirty])

  async function resolveUniqueSlug(baseSlug) {
    const fallbackSlug = baseSlug || 'blog'

    try {
      const blogsResponse = await getBlogs(currentStore?.id)
      const existingSlugs = new Set(
        (blogsResponse ?? [])
          .map(normalizePost)
          .filter((post) => post.id !== editId)
          .map((post) => post.slug)
          .filter(Boolean),
      )

      let suffix = 1
      let nextSlug = fallbackSlug
      while (existingSlugs.has(nextSlug) && suffix < 50) {
        nextSlug = `${fallbackSlug}-${suffix}`
        suffix += 1
      }

      if (!existingSlugs.has(nextSlug)) {
        return nextSlug
      }

      while (suffix < 100) {
        const nextSlug = `${fallbackSlug}-${suffix}`
        if (!existingSlugs.has(nextSlug)) {
          return nextSlug
        }
        suffix += 1
      }
    } catch (error) {
      if (error.status !== 404) {
        console.error(error)
      }
    }

    return fallbackSlug
  }

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'title') {
      const nextSlug = isSlugEdited ? formData.slug : sanitizeSlug(value)
      setFormData((currentData) => ({
        ...currentData,
        title: value,
        slug: nextSlug,
        metaTitle: currentData.metaTitle || value,
      }))
      setIsDirty(true)
      return
    }

    if (name === 'slug') {
      setIsSlugEdited(true)
      setFormData((currentData) => ({ ...currentData, slug: sanitizeSlug(value) }))
      setIsDirty(true)
      return
    }

    if (name === 'isPublished') {
      setFormData((currentData) => ({ ...currentData, isPublished: value === 'true' }))
      setIsDirty(true)
      return
    }

    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setIsDirty(true)
  }

  function handleThumbnailChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((currentData) => ({
        ...currentData,
        thumbnailUrl: typeof reader.result === 'string' ? reader.result : '',
      }))
      setIsDirty(true)
    }
    reader.readAsDataURL(file)
  }

  function addTag() {
    const nextTag = tagInput.trim()
    if (!nextTag || formData.tags.includes(nextTag)) {
      setTagInput('')
      return
    }
    setFormData((currentData) => ({ ...currentData, tags: [...currentData.tags, nextTag] }))
    setTagInput('')
    setIsDirty(true)
  }

  function removeTag(tag) {
    setFormData((currentData) => ({
      ...currentData,
      tags: currentData.tags.filter((currentTag) => currentTag !== tag),
    }))
    setIsDirty(true)
  }

  async function saveBlog() {
    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    const title = formData.title.trim()
    if (!title) {
      showToast('Blog post title is required', 'error')
      return
    }

    const plainText = editor?.getText().trim() || ''
    if (!plainText) {
      showToast('Content cannot be empty', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const slug = await resolveUniqueSlug(sanitizeSlug(formData.slug || title))
      const content = editor?.getHTML() || formData.content
      const featuredImage = getPersistableImageUrl(formData.thumbnailUrl)
      const publishedAt = formData.isPublished ? new Date().toISOString() : null

      const payload = {
        store_id: currentStore.id,
        title,
        slug,
        content,
        excerpt: plainText.slice(0, 180),
        featured_image: featuredImage || null,
        is_published: formData.isPublished,
        published_at: publishedAt,
        meta_title: formData.metaTitle.trim() || null,
        meta_description: formData.metaDescription.trim() || null,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
      }

      console.log('FINAL BLOG PAYLOAD:', payload)

      if (isEditMode) {
        await updateBlog(editId, payload)
        showToast('Blog post updated', 'success')
      } else {
        await createBlog(payload)
        window.localStorage.removeItem(draftKey)
        showToast('Blog post published', 'success')
      }

      setIsDirty(false)
      navigate('/blogs')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="blog-create-page">
      <div className="blog-create-header">
        <button className="product-editor__back" type="button" onClick={() => navigate('/blogs')}>
          <span aria-hidden="true">‹</span>
          Back
        </button>
        <div className="blog-create-header__actions">
          <Button disabled={isSubmitting} type="button" variant="outline" onClick={saveBlog}>
            Save Draft
          </Button>
          <Button disabled={isSubmitting} type="button" onClick={saveBlog}>
            Publish
          </Button>
        </div>
      </div>

      <div className="blog-create-layout">
        <main className="blog-create-main">
          <input
            className="blog-post-title-input"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            placeholder="Blog post title"
          />

          <SurfaceCard className="product-panel blog-post-editor__panel">
            <div className="product-form__field">
              <label htmlFor="blog-slug">Slug</label>
              <input
                id="blog-slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="blog-title"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel blog-rich-editor">
            <div className="blog-rich-editor__header">
              <h3>Content</h3>
              <span>{lastAutosavedAt ? `Autosaved ${lastAutosavedAt}` : 'Autosaves every 10 seconds'}</span>
            </div>
            <CreateBlogToolbar editor={editor} />
            <EditorContent editor={editor} />
          </SurfaceCard>
        </main>

        <aside className="blog-create-sidebar">
          <SurfaceCard className="product-panel">
            <h3>Publish Settings</h3>
            <div className="product-form__field">
              <label htmlFor="blog-publish-state">Publish state</label>
              <select
                id="blog-publish-state"
                name="isPublished"
                value={String(formData.isPublished)}
                onChange={handleChange}
              >
                <option value="false">Draft</option>
                <option value="true">Published</option>
              </select>
            </div>
            <div className="product-form__field">
              <label htmlFor="blog-published-at">Schedule</label>
              <input
                id="blog-published-at"
                name="publishedAt"
                type="datetime-local"
                value={formData.publishedAt}
                onChange={handleChange}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Thumbnail</h3>
            <label className="blog-featured-upload" htmlFor="blog-thumbnail">
              {formData.thumbnailUrl ? <img src={formData.thumbnailUrl} alt="Blog thumbnail" /> : <span>Upload image</span>}
              <input id="blog-thumbnail" type="file" accept="image/*" onChange={handleThumbnailChange} />
            </label>
            {isLocalImagePreview(formData.thumbnailUrl) ? (
              <p className="blog-upload-note">Preview only. Connect media storage to save uploaded thumbnails.</p>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Tags</h3>
            <div className="blog-tags-input">
              <input
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add tag"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="blog-tags-list">
              {formData.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => removeTag(tag)}>
                  {tag}
                  <span aria-hidden="true">x</span>
                </button>
              ))}
              {formData.tags.length === 0 ? <p>No tags added.</p> : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>SEO</h3>
            <div className="product-form__field">
              <label htmlFor="blog-meta-title">Meta title</label>
              <input
                id="blog-meta-title"
                name="metaTitle"
                type="text"
                value={formData.metaTitle}
                onChange={handleChange}
                placeholder="Search result title"
              />
            </div>
            <div className="product-form__field">
              <label htmlFor="blog-meta-description">Meta description</label>
              <textarea
                id="blog-meta-description"
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                placeholder="Search result description"
                rows="4"
              />
            </div>
            <div className="blog-seo-preview">
              <strong>{formData.metaTitle || formData.title || 'Blog title preview'}</strong>
              <span>{formData.slug || 'blog-slug'}</span>
              <p>{formData.metaDescription || 'Meta description preview will appear here.'}</p>
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  )
}

export default CreateBlogPage
