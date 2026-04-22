import { useEffect, useMemo, useRef, useState } from 'react'
import { createCategory, getCategories } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import Button from './ui/Button.jsx'
import SurfaceCard from './ui/SurfaceCard.jsx'

function normalizeCategory(category) {
  const storeId = category.storeId ?? category.store_id ?? null
  const parentId = category.parentId ?? category.parent_id ?? null
  const isDefault = Boolean(category.isDefault ?? category.is_default)

  return {
    ...category,
    id: category.id,
    storeId,
    store_id: storeId,
    name: category.name ?? '',
    parentId,
    parent_id: parentId,
    isDefault,
    is_default: isDefault,
  }
}

function buildCategoryRows(categories) {
  const rows = []
  const categoryIds = new Set(categories.map((category) => String(category.id)))
  const childrenByParentId = new Map()

  categories.forEach((category) => {
    const parentKey =
      category.parentId && categoryIds.has(String(category.parentId))
        ? String(category.parentId)
        : 'root'
    const children = childrenByParentId.get(parentKey) ?? []
    children.push(category)
    childrenByParentId.set(parentKey, children)
  })

  function appendRows(parentKey = 'root', depth = 0) {
    const children = childrenByParentId.get(parentKey) ?? []

    children
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((category) => {
        rows.push({ ...category, depth })
        appendRows(String(category.id), depth + 1)
      })
  }

  appendRows()
  return rows
}

function CategoryModal({
  categories,
  initialName,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState(initialName)
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')
  const parentOptions = useMemo(() => buildCategoryRows(categories), [categories])

  function submitCategory() {
    if (isSubmitting) {
      return
    }

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Name is required')
      return
    }

    onSubmit({
      name: trimmedName,
      parentId: parentId || null,
    })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitCategory()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <SurfaceCard
        as="div"
        className="category-select-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-select-modal-title"
        onKeyDown={handleKeyDown}
      >
        <div className="category-select-modal__header">
          <h3 id="category-select-modal-title">Add New Category</h3>
          <button type="button" onClick={onClose} aria-label="Close category modal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="product-form__field">
          <label htmlFor="new-category-name">Name*</label>
          <input
            id="new-category-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            required
            autoFocus
          />
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="product-form__field">
          <label htmlFor="new-category-parent">Parent Category</label>
          <select
            id="new-category-parent"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">No parent category</option>
            {parentOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {`${'-- '.repeat(category.depth)}${category.name}`}
              </option>
            ))}
          </select>
        </div>

        <div className="category-select-modal__actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="button" onClick={submitCategory}>
            {isSubmitting ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  )
}

function CategorySelect({ disabled = false, onChange, storeId, value }) {
  const { showToast } = useToast()
  const rootRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialName, setModalInitialName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const scopedCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.isDefault || String(category.storeId ?? '') === String(storeId ?? ''),
      ),
    [categories, storeId],
  )
  const categoryRows = useMemo(() => buildCategoryRows(scopedCategories), [scopedCategories])
  const searchTerm = search.trim().toLowerCase()
  const filteredRows = searchTerm
    ? categoryRows.filter((category) => category.name.toLowerCase().includes(searchTerm))
    : categoryRows
  const defaultRows = filteredRows.filter((category) => category.isDefault)
  const storeRows = filteredRows.filter((category) => !category.isDefault)
  const selectedCategory = scopedCategories.find(
    (category) => String(category.id) === String(value ?? ''),
  )
  const hasSearchMatch = filteredRows.length > 0
  const shouldShowCreateFromSearch = Boolean(searchTerm) && !hasSearchMatch

  useEffect(() => {
    let isCancelled = false

    async function loadCategories() {
      if (!storeId) {
        setCategories([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getCategories(storeId)

        if (!isCancelled) {
          setCategories((response ?? []).map(normalizeCategory))
        }
      } catch (error) {
        console.error(error)

        if (!isCancelled) {
          setCategories([])
          showToast(error.message || 'Failed to load categories', 'error')
        }
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
  }, [showToast, storeId])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  function handleSelect(category) {
    onChange?.(category.id, category)
    setSearch('')
    setIsOpen(false)
  }

  function openCreateModal(initialName = '') {
    setModalInitialName(initialName)
    setIsModalOpen(true)
    setIsOpen(false)
  }

  async function handleCreateCategory({ name, parentId }) {
    if (!storeId) {
      showToast('Select a store first', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const createdCategory = normalizeCategory(
        await createCategory({
          store_id: storeId,
          name,
          parent_id: parentId,
        }),
      )
      const refreshedCategories = (await getCategories(storeId)).map(normalizeCategory)

      setCategories(refreshedCategories)
      onChange?.(createdCategory.id, createdCategory)
      setSearch('')
      setIsModalOpen(false)
      showToast('Category created', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderRows(rows, emptyMessage) {
    if (rows.length === 0) {
      return <p className="category-select__empty">{emptyMessage}</p>
    }

    return rows.map((category) => {
      const isSelected = String(category.id) === String(value ?? '')

      return (
        <button
          className={`category-select__option${isSelected ? ' category-select__option--selected' : ''}`}
          key={category.id}
          type="button"
          style={{ '--category-depth': category.depth }}
          onClick={() => handleSelect(category)}
          role="option"
          aria-selected={isSelected}
        >
          {category.depth > 0 ? (
            <span className="category-select__branch" aria-hidden="true">
              &rarr;
            </span>
          ) : null}
          <span>{category.name}</span>
        </button>
      )
    })
  }

  return (
    <div className="category-select" ref={rootRef}>
      <button
        className={`category-select__trigger${isOpen ? ' category-select__trigger--open' : ''}`}
        type="button"
        disabled={disabled || !storeId}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{selectedCategory?.name || 'Select category'}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div className="category-select__menu">
          <label className="category-select__search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories"
              autoFocus
            />
          </label>

          <div className="category-select__list" role="listbox">
            {isLoading ? (
              <p className="category-select__empty">Loading categories...</p>
            ) : shouldShowCreateFromSearch ? (
              <button
                className="category-select__create-search"
                type="button"
                onClick={() => openCreateModal(search.trim())}
              >
                + Create "{search.trim()}"
              </button>
            ) : (
              <>
                <section className="category-select__section">
                  <h4>Default Categories</h4>
                  {renderRows(defaultRows, 'No default categories')}
                </section>
                <section className="category-select__section">
                  <h4>Your Categories</h4>
                  {renderRows(storeRows, 'No store categories')}
                </section>
              </>
            )}
          </div>

          <button
            className="category-select__add"
            type="button"
            onClick={() => openCreateModal('')}
          >
            + Add New Category
          </button>
        </div>
      ) : null}

      {isModalOpen ? (
        <CategoryModal
          categories={scopedCategories}
          initialName={modalInitialName}
          isSubmitting={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsModalOpen(false)
            }
          }}
          onSubmit={handleCreateCategory}
        />
      ) : null}
    </div>
  )
}

export default CategorySelect
