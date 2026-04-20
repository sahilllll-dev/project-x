import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  createBlogPost,
  getBlogPost,
  getBlogPosts,
  getCategories,
  updateBlogPost,
} from '../utils/api.js'
import { normalizePost, slugifyBlogValue } from '../utils/blogs.js'

const initialPostForm = {
  title: '',
  slug: '',
  excerpt: '',
  featuredImage: '',
  categoryId: '',
  scheduledAt: '',
  seoTitle: '',
  seoDescription: '',
  tags: [],
  isPublished: false,
}

function getDraftKey(blogId, postId) {
  return `projectx:blog-draft:${blogId}:${postId || 'new'}`
}

function getTagValue(value) {
  return String(value || '').trim()
}

function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name ?? '',
    parentId: category.parentId ?? category.parent_id ?? '',
  }
}

function getScheduledInputValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 16)
}

function buildUniqueSlug(baseSlug, posts, currentPostId) {
  const fallbackSlug = baseSlug || 'post'
  const usedSlugs = new Set(
    posts
      .filter((post) => String(post.id) !== String(currentPostId ?? ''))
      .map((post) => post.slug)
      .filter(Boolean),
  )

  if (!usedSlugs.has(fallbackSlug)) {
    return fallbackSlug
  }

  let suffix = 1
  let nextSlug = `${fallbackSlug}-${suffix}`

  while (usedSlugs.has(nextSlug)) {
    suffix += 1
    nextSlug = `${fallbackSlug}-${suffix}`
  }

  return nextSlug
}

function RichTextToolbar({ editor }) {
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
      <button
        className={editor.isActive('bold') ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        className={editor.isActive('italic') ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        Bullets
      </button>
      <button
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        Numbers
      </button>
      <button
        className={editor.isActive('link') ? 'is-active' : ''}
        type="button"
        onClick={setLink}
      >
        Link
      </button>
      <button type="button" onClick={addImage}>
        Image
      </button>
    </div>
  )
}

function BlogPost() {
  const navigate = useNavigate()
  const { blogId, postId } = useParams()
  const isEditMode = Boolean(postId)
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(initialPostForm)
  const [tagInput, setTagInput] = useState('')
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastAutosavedAt, setLastAutosavedAt] = useState('')
  const [categories, setCategories] = useState([])
  const [existingPosts, setExistingPosts] = useState([])

  const draftKey = useMemo(() => getDraftKey(blogId, postId), [blogId, postId])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
    ],
    content: '<p>Start writing your post...</p>',
    editorProps: {
      attributes: {
        class: 'blog-rich-editor__content',
      },
    },
  })

  useEffect(() => {
    let isCancelled = false

    async function loadPost() {
      if (!isEditMode || !currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const post = normalizePost(await getBlogPost(postId, blogId, currentStore.id))

        if (isCancelled) {
          return
        }

        setFormData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          featuredImage: post.featuredImage,
          categoryId: post.categoryId ?? post.category_id ?? '',
          scheduledAt: getScheduledInputValue(post.scheduledAt ?? post.scheduled_at),
          seoTitle: post.seoTitle ?? post.seo_title ?? '',
          seoDescription: post.seoDescription ?? post.seo_description ?? '',
          tags: post.tags,
          isPublished: post.isPublished,
        })
        setIsSlugEdited(true)
        editor?.commands.setContent(post.content || '<p></p>')
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Failed to load post', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPost()

    return () => {
      isCancelled = true
    }
  }, [blogId, currentStore?.id, editor, isEditMode, postId, showToast])

  useEffect(() => {
    let isCancelled = false

    async function loadSettingsData() {
      if (!currentStore?.id || !blogId) {
        setCategories([])
        setExistingPosts([])
        return
      }

      try {
        const [categoriesResponse, postsResponse] = await Promise.all([
          getCategories(currentStore.id),
          getBlogPosts(blogId, currentStore.id),
        ])

        if (isCancelled) {
          return
        }

        setCategories((categoriesResponse ?? []).map(normalizeCategory))
        setExistingPosts(postsResponse ?? [])
      } catch (error) {
        console.error(error)
      }
    }

    loadSettingsData()

    return () => {
      isCancelled = true
    }
  }, [blogId, currentStore?.id])

  useEffect(() => {
    if (!editor || isEditMode) {
      return
    }

    const rawDraft = window.localStorage.getItem(draftKey)
    if (!rawDraft) {
      return
    }

    try {
      const draft = JSON.parse(rawDraft)
      const timerId = window.setTimeout(() => {
        setFormData({ ...initialPostForm, ...draft.formData })
        setIsSlugEdited(Boolean(draft.formData?.slug))
        editor.commands.setContent(draft.content || '<p></p>')
      }, 0)

      return () => {
        window.clearTimeout(timerId)
      }
    } catch {
      window.localStorage.removeItem(draftKey)
    }

    return undefined
  }, [draftKey, editor, isEditMode])

  useEffect(() => {
    if (!editor || isLoading) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          formData,
          content: editor.getHTML(),
          savedAt: new Date().toISOString(),
        }),
      )
      setLastAutosavedAt(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }))
    }, 1200)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [draftKey, editor, formData, isLoading])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    if (name === 'title') {
      setFormData((currentData) => ({
        ...currentData,
        title: value,
        slug: isSlugEdited ? currentData.slug : slugifyBlogValue(value),
      }))
      return
    }

    if (name === 'slug') {
      setIsSlugEdited(true)
      setFormData((currentData) => ({
        ...currentData,
        slug: slugifyBlogValue(value),
      }))
      return
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleFeaturedImageChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((currentData) => ({
        ...currentData,
        featuredImage: typeof reader.result === 'string' ? reader.result : '',
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleAddTag() {
    const nextTag = getTagValue(tagInput)

    if (!nextTag || formData.tags.includes(nextTag)) {
      setTagInput('')
      return
    }

    setFormData((currentData) => ({
      ...currentData,
      tags: [...currentData.tags, nextTag],
    }))
    setTagInput('')
  }

  function handleTagKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddTag()
    }
  }

  function removeTag(tag) {
    setFormData((currentData) => ({
      ...currentData,
      tags: currentData.tags.filter((currentTag) => currentTag !== tag),
    }))
  }

  async function savePost(shouldPublish) {

    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    const title = formData.title.trim()
    const slug = buildUniqueSlug(slugifyBlogValue(formData.slug || title), existingPosts, postId)

    if (!title) {
      showToast('Post title is required', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        storeId: currentStore.id,
        blogId,
        title,
        slug,
        excerpt: formData.excerpt.trim(),
        featuredImage: formData.featuredImage,
        content: editor?.getHTML() ?? '',
        tags: formData.tags,
        categoryId: formData.categoryId || null,
        category_id: formData.categoryId || null,
        isPublished: shouldPublish,
        is_published: shouldPublish,
        publishedAt: shouldPublish ? new Date().toISOString() : null,
        published_at: shouldPublish ? new Date().toISOString() : null,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        scheduled_at: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        thumbnail: formData.featuredImage,
        seoTitle: formData.seoTitle.trim(),
        seo_title: formData.seoTitle.trim(),
        seoDescription: formData.seoDescription.trim(),
        seo_description: formData.seoDescription.trim(),
      }

      if (isEditMode) {
        await updateBlogPost(postId, payload)
        showToast('Post updated', 'success')
      } else {
        await createBlogPost(payload)
        window.localStorage.removeItem(draftKey)
        showToast(shouldPublish ? 'Post published' : 'Draft saved', 'success')
      }

      navigate(`/blogs/${blogId}`)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    savePost(formData.isPublished)
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading post...</p>
  }

  return (
    <div className="blog-post-editor-page">
      <form className="blog-post-editor" onSubmit={handleSubmit}>
        <div className="blog-post-editor__main">
          <div className="blog-post-editor__title-row">
            <div>
              <button className="product-editor__back" type="button" onClick={() => navigate(`/blogs/${blogId}`)}>
                <span aria-hidden="true">‹</span>
                Back
              </button>
              <input
                className="blog-post-title-input"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Blog post title"
                required
              />
              <p>{lastAutosavedAt ? `Autosaved at ${lastAutosavedAt}` : 'Drafts autosave locally while you write.'}</p>
            </div>
            <div className="blog-post-editor__header-actions">
              <Button
                disabled={isSubmitting}
                type="button"
                variant="outline"
                onClick={() => savePost(false)}
              >
                Save Draft
              </Button>
              <Button disabled={isSubmitting} type="button" onClick={() => savePost(true)}>
                Publish
              </Button>
            </div>
          </div>

          <SurfaceCard className="product-panel blog-post-editor__panel">
            <div className="product-form__field">
              <label htmlFor="post-slug">Slug</label>
              <input
                id="post-slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="how-to-style-your-new-collection"
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="post-excerpt">Excerpt</label>
              <textarea
                id="post-excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="Short summary shown in blog cards and SEO previews."
                rows="4"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel blog-rich-editor">
            <div className="blog-rich-editor__header">
              <h3>Content</h3>
              <span>TipTap rich text editor</span>
            </div>
            <RichTextToolbar editor={editor} />
            <EditorContent editor={editor} />
          </SurfaceCard>
        </div>

        <aside className="blog-post-editor__sidebar">
          <SurfaceCard className="product-panel">
            <h3>Status</h3>
            <label className="theme-settings-toggle" htmlFor="post-published">
              <div>
                <strong>{formData.isPublished ? 'Published' : 'Draft'}</strong>
                <p>{formData.isPublished ? 'This post will be public.' : 'Keep this post private.'}</p>
              </div>
              <input
                id="post-published"
                name="isPublished"
                type="checkbox"
                checked={formData.isPublished}
                onChange={handleChange}
              />
            </label>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Schedule</h3>
            <div className="product-form__field">
              <label htmlFor="post-scheduled-at">Publish date</label>
              <input
                id="post-scheduled-at"
                name="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={handleChange}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Thumbnail</h3>
            <label className="blog-featured-upload" htmlFor="post-featured-image">
              {formData.featuredImage ? (
                <img src={formData.featuredImage} alt="Featured preview" />
              ) : (
                <span>Upload image</span>
              )}
              <input
                id="post-featured-image"
                type="file"
                accept="image/*"
                onChange={handleFeaturedImageChange}
              />
            </label>
            {formData.featuredImage ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData((currentData) => ({ ...currentData, featuredImage: '' }))}
              >
                Remove image
              </Button>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Category</h3>
            <div className="product-form__field">
              <label htmlFor="post-category">Category</label>
              <select
                id="post-category"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>Tags</h3>
            <div className="blog-tags-input">
              <input
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            <div className="blog-tags-list">
              {formData.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => removeTag(tag)}>
                  {tag}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              {formData.tags.length === 0 ? <p>No tags added.</p> : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="product-panel">
            <h3>SEO</h3>
            <div className="product-form__field">
              <label htmlFor="post-seo-title">SEO Title</label>
              <input
                id="post-seo-title"
                name="seoTitle"
                type="text"
                value={formData.seoTitle}
                onChange={handleChange}
                placeholder="Search title"
              />
            </div>
            <div className="product-form__field">
              <label htmlFor="post-seo-description">SEO Description</label>
              <textarea
                id="post-seo-description"
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                placeholder="Short search description"
                rows="4"
              />
            </div>
          </SurfaceCard>
        </aside>
      </form>
    </div>
  )
}

export default BlogPost
