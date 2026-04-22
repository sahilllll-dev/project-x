import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { createCategory, getCategories } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { categoryIcons } from './categoryIcons.js'
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
    slug: category.slug ?? '',
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

function buildCategoryTree(categories) {
  const map = new Map()
  const roots = []

  categories.forEach((category) => {
    map.set(String(category.id), { ...category, children: [] })
  })

  categories.forEach((category) => {
    const node = map.get(String(category.id))
    const parentId = category.parent_id ?? category.parentId

    if (parentId && map.has(String(parentId))) {
      map.get(String(parentId)).children.push(node)
    } else {
      roots.push(node)
    }
  })

  function sortNodes(nodes) {
    nodes.sort((left, right) => left.name.localeCompare(right.name))
    nodes.forEach((node) => sortNodes(node.children))
  }

  sortNodes(roots)
  return roots
}

function getSearchScopedCategories(categories, searchTerm) {
  if (!searchTerm) {
    return categories
  }

  const categoriesById = new Map(
    categories.map((category) => [String(category.id), category]),
  )
  const visibleIds = new Set()

  categories.forEach((category) => {
    if (!category.name.toLowerCase().includes(searchTerm)) {
      return
    }

    let currentCategory = category

    while (currentCategory) {
      const currentId = String(currentCategory.id)

      if (visibleIds.has(currentId)) {
        break
      }

      visibleIds.add(currentId)

      const parentId = currentCategory.parent_id ?? currentCategory.parentId
      currentCategory = parentId ? categoriesById.get(String(parentId)) : null
    }
  })

  return categories.filter((category) => visibleIds.has(String(category.id)))
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
  const [expanded, setExpanded] = useState({})

  const scopedCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.isDefault || String(category.storeId ?? '') === String(storeId ?? ''),
      ),
    [categories, storeId],
  )
  const searchTerm = search.trim().toLowerCase()
  const defaultCategories = useMemo(
    () => scopedCategories.filter((category) => category.isDefault),
    [scopedCategories],
  )
  const storeCategories = useMemo(
    () => scopedCategories.filter((category) => !category.isDefault),
    [scopedCategories],
  )
  const visibleDefaultCategories = useMemo(
    () => getSearchScopedCategories(defaultCategories, searchTerm),
    [defaultCategories, searchTerm],
  )
  const visibleStoreCategories = useMemo(
    () => getSearchScopedCategories(storeCategories, searchTerm),
    [storeCategories, searchTerm],
  )
  const defaultTree = useMemo(
    () => buildCategoryTree(visibleDefaultCategories),
    [visibleDefaultCategories],
  )
  const storeTree = useMemo(
    () => buildCategoryTree(visibleStoreCategories),
    [visibleStoreCategories],
  )
  const selectedCategory = useMemo(
    () => scopedCategories.find((category) => String(category.id) === String(value ?? '')),
    [scopedCategories, value],
  )
  const selectedAncestorIds = useMemo(() => {
    const ancestors = new Set()

    if (!selectedCategory?.parentId) {
      return ancestors
    }

    const categoriesById = new Map(
      scopedCategories.map((category) => [String(category.id), category]),
    )
    let parentId = selectedCategory.parentId

    while (parentId) {
      ancestors.add(String(parentId))
      parentId = categoriesById.get(String(parentId))?.parentId ?? null
    }

    return ancestors
  }, [scopedCategories, selectedCategory])
  const expandedCategoryIds = useMemo(
    () =>
      selectedAncestorIds.size === 0
        ? expanded
        : {
            ...expanded,
            ...Object.fromEntries([...selectedAncestorIds].map((categoryId) => [categoryId, true])),
          },
    [expanded, selectedAncestorIds],
  )
  const hasSearchMatch = scopedCategories.some((category) =>
    category.name.toLowerCase().includes(searchTerm),
  )
  const shouldShowCreateFromSearch = Boolean(searchTerm) && !hasSearchMatch

  function toggle(categoryId) {
    setExpanded((currentExpanded) => ({
      ...currentExpanded,
      [categoryId]: !currentExpanded[categoryId],
    }))
  }

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

  function renderTree(nodes, level = 0) {
    return nodes.map((node) => {
      const Icon = categoryIcons[String(node.slug ?? '').toLowerCase()]
      const hasChildren = node.children.length > 0
      const isExpanded = Boolean(expandedCategoryIds[node.id]) || Boolean(searchTerm)
      const isRootCategory = !node.parent_id && !node.parentId
      const isSelected = String(node.id) === String(value ?? '')

      return (
        <div className="category-select__tree-item" key={node.id}>
          <div
            className={`category-select__tree-row${isSelected ? ' category-select__tree-row--selected' : ''}`}
            role="treeitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={level + 1}
            aria-selected={isSelected}
            style={{ '--category-level': level }}
          >
            <button
              className="category-select__toggle"
              type="button"
              disabled={!hasChildren}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onClick={() => toggle(node.id)}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown size={15} aria-hidden="true" />
                ) : (
                  <ChevronRight size={15} aria-hidden="true" />
                )
              ) : null}
            </button>

            <button
              className="category-select__node"
              type="button"
              onClick={() => handleSelect(node)}
            >
              {isRootCategory && Icon ? (
                <span className="category-select__node-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
              ) : (
                <span className="category-select__node-icon-placeholder" aria-hidden="true" />
              )}
              <span className="category-select__node-name">{node.name}</span>
            </button>
          </div>

          {hasChildren && isExpanded ? (
            <div className="category-select__tree-children" role="group">
              {renderTree(node.children, level + 1)}
            </div>
          ) : null}
        </div>
      )
    })
  }

  function renderTreeSection(tree, emptyMessage) {
    if (tree.length === 0) {
      return <p className="category-select__empty">{emptyMessage}</p>
    }

    return (
      <div className="category-select__tree" role="tree">
        {renderTree(tree)}
      </div>
    )
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
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="category-select__menu">
          <label className="category-select__search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories"
              autoFocus
            />
          </label>

          <div className="category-select__list">
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
                  {renderTreeSection(defaultTree, 'No default categories')}
                </section>
                <section className="category-select__section">
                  <h4>Your Categories</h4>
                  {renderTreeSection(storeTree, 'No store categories')}
                </section>
              </>
            )}
          </div>

          <button
            className="category-select__add"
            type="button"
            onClick={() => openCreateModal('')}
          >
            <Plus size={16} aria-hidden="true" />
            Add New Category
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
