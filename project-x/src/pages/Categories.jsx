import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../utils/api.js'

const initialFormData = {
  name: '',
  slug: '',
  parentId: '',
}

function slugifyCategoryName(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeCategory(category) {
  const parentId = category.parentId ?? category.parent_id ?? category.parentCategoryId ?? ''

  return {
    ...category,
    id: category.id,
    name: category.name ?? '',
    slug: category.slug ?? slugifyCategoryName(category.name),
    parentId: parentId || '',
  }
}

function buildCategoryRows(categories) {
  const childrenByParentId = new Map()
  const categoriesById = new Map(categories.map((category) => [String(category.id), category]))
  const rows = []

  categories.forEach((category) => {
    const parentKey = category.parentId ? String(category.parentId) : 'root'
    const children = childrenByParentId.get(parentKey) ?? []
    children.push(category)
    childrenByParentId.set(parentKey, children)
  })

  function appendRows(parentKey = 'root', depth = 0) {
    const children = childrenByParentId.get(parentKey) ?? []
    children
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((category) => {
        rows.push({
          ...category,
          depth,
          parentName: category.parentId
            ? categoriesById.get(String(category.parentId))?.name ?? '-'
            : '-',
        })
        appendRows(String(category.id), depth + 1)
      })
  }

  appendRows()
  return rows
}

function CategoriesSkeleton() {
  return (
    <div className="categories-skeleton" aria-label="Loading categories">
      {Array.from({ length: 5 }).map((_, index) => (
        <span className="categories-skeleton__row" key={index} />
      ))}
    </div>
  )
}

function Categories() {
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApiMissing, setIsApiMissing] = useState(false)

  const categoryRows = useMemo(() => buildCategoryRows(categories), [categories])

  useEffect(() => {
    let isCancelled = false

    async function loadCategories() {
      setCategories([])
      setIsModalOpen(false)
      setEditingCategory(null)
      setCategoryToDelete(null)
      setFormData(initialFormData)
      setIsSlugEdited(false)
      setIsApiMissing(false)

      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getCategories(currentStore.id)

        if (isCancelled) {
          return
        }

        setCategories((response ?? []).map(normalizeCategory))
      } catch (error) {
        if (error.status === 404) {
          setIsApiMissing(true)
          setCategories([])
          return
        }

        console.error(error)
        showToast(error.message || 'Failed to load categories', 'error')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, storeSwitchVersion, showToast])

  function openCreateModal() {
    setEditingCategory(null)
    setFormData(initialFormData)
    setIsSlugEdited(false)
    setIsModalOpen(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || '',
    })
    setIsSlugEdited(true)
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSubmitting) {
      return
    }

    setIsModalOpen(false)
  }

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'name') {
      setFormData((currentData) => ({
        ...currentData,
        name: value,
        slug: isSlugEdited ? currentData.slug : slugifyCategoryName(value),
      }))
      return
    }

    if (name === 'slug') {
      setIsSlugEdited(true)
      setFormData((currentData) => ({
        ...currentData,
        slug: slugifyCategoryName(value),
      }))
      return
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    const name = formData.name.trim()
    const slug = slugifyCategoryName(formData.slug || name)

    if (!name) {
      showToast('Category name is required', 'error')
      return
    }

    if (!slug) {
      showToast('Category slug is required', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        storeId: currentStore.id,
        name,
        slug,
        parentId: formData.parentId || null,
      }

      if (editingCategory) {
        const updatedCategory = normalizeCategory(await updateCategory(editingCategory.id, payload))
        setCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          ),
        )
        showToast('Category updated', 'success')
      } else {
        const createdCategory = normalizeCategory(await createCategory(payload))
        setCategories((currentCategories) => [...currentCategories, createdCategory])
        showToast('Category created', 'success')
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteCategory() {
    if (!categoryToDelete) {
      return
    }

    setIsSubmitting(true)

    try {
      await deleteCategory(categoryToDelete.id)
      setCategories((currentCategories) =>
        currentCategories.filter((category) => category.id !== categoryToDelete.id),
      )
      setCategoryToDelete(null)
      showToast('Category deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="categories-page">
      <div className="stores-page__header">
        <div>
          <h2>Categories</h2>
          <p>Group products into clean, storefront-ready collections.</p>
        </div>
        <Button disabled={!currentStore?.id} onClick={openCreateModal}>
          + Add Category
        </Button>
      </div>

      <SurfaceCard className="categories-card">
        {!currentStore?.id ? (
          <div className="categories-empty-state">
            <strong>Select a store first</strong>
            <p>Categories are managed per store.</p>
          </div>
        ) : isApiMissing ? (
          <div className="categories-empty-state">
            <strong>Categories API is not deployed yet</strong>
            <p>Deploy the latest backend to Render, then refresh this page.</p>
          </div>
        ) : isLoading ? (
          <CategoriesSkeleton />
        ) : categories.length === 0 ? (
          <div className="categories-empty-state">
            <strong>No categories yet</strong>
            <p>Create your first category to start organizing products.</p>
            <Button onClick={openCreateModal}>+ Add Category</Button>
          </div>
        ) : (
          <div className="categories-table">
            <div className="categories-table__head">
              <span>Category Name</span>
              <span>Slug</span>
              <span>Parent Category</span>
              <span>Actions</span>
            </div>

            {categoryRows.map((category) => (
              <div className="categories-table__row" key={category.id}>
                <div
                  className="categories-table__name"
                  style={{ '--category-depth': category.depth }}
                >
                  {category.depth > 0 ? <span className="categories-table__branch" /> : null}
                  <strong>{category.name}</strong>
                </div>
                <span className="categories-table__slug">{category.slug}</span>
                <span>{category.parentName}</span>
                <span className="categories-table__actions">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(category)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCategoryToDelete(category)}
                  >
                    Delete
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
                <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                <p>Keep names simple and slugs storefront-friendly.</p>
              </div>
              <button type="button" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="product-form__field">
              <label htmlFor="category-name">Name*</label>
              <input
                id="category-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Men Shoes"
                required
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="category-slug">Slug</label>
              <input
                id="category-slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="men-shoes"
              />
            </div>

            <div className="product-form__field">
              <label htmlFor="category-parent">Parent Category</label>
              <select
                id="category-parent"
                name="parentId"
                value={formData.parentId}
                onChange={handleChange}
              >
                <option value="">No parent category</option>
                {categories
                  .filter((category) => category.id !== editingCategory?.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="category-modal__actions">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {categoryToDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete category?</h3>
            <p>
              This will remove "{categoryToDelete.name}". Products already using this
              category may need to be reassigned.
            </p>
            <div className="confirm-modal__actions">
              <button type="button" onClick={() => setCategoryToDelete(null)}>
                Cancel
              </button>
              <button
                className="confirm-modal__danger"
                disabled={isSubmitting}
                type="button"
                onClick={handleDeleteCategory}
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

export default Categories
