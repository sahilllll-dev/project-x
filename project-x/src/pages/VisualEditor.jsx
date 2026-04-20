import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import PageRenderer from '../components/page-builder/PageRenderer.jsx'
import WidgetRenderer from '../components/page-builder/WidgetRenderer.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getProducts, getStorePage, saveStorePage } from '../utils/api.js'

const widgetTemplates = [
  { type: 'heading', label: 'Heading', defaults: { content: 'Welcome to Store', fontSize: 44 } },
  { type: 'text', label: 'Text', defaults: { content: 'Tell customers about this section.' } },
  { type: 'image', label: 'Image', defaults: { src: '', alt: '' } },
  { type: 'products', label: 'Products', defaults: { limit: 6 } },
]

const initialLayout = {
  sections: [
    {
      id: 'section1',
      columns: [
        {
          id: 'col1',
          widgets: [
            {
              id: 'widget-heading-1',
              type: 'heading',
              content: 'Welcome to Store',
              fontSize: 44,
            },
            {
              id: 'widget-products-1',
              type: 'products',
              limit: 6,
            },
          ],
        },
      ],
    },
  ],
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeLayout(layout) {
  if (!Array.isArray(layout?.sections) || layout.sections.length === 0) {
    return initialLayout
  }

  return {
    sections: layout.sections.map((section) => ({
      id: section.id || createId('section'),
      columns: Array.isArray(section.columns) && section.columns.length > 0
        ? section.columns.map((column) => ({
            id: column.id || createId('column'),
            widgets: Array.isArray(column.widgets)
              ? column.widgets.map((widget) => ({
                  id: widget.id || createId('widget'),
                  ...widget,
                }))
              : [],
          }))
        : [{ id: createId('column'), widgets: [] }],
    })),
  }
}

function DraggableWidget({ template }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${template.type}`,
    data: {
      source: 'palette',
      widgetType: template.type,
    },
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      className={`builder-widget-tile${isDragging ? ' is-dragging' : ''}`}
      ref={setNodeRef}
      style={style}
      type="button"
      {...listeners}
      {...attributes}
    >
      {template.label}
    </button>
  )
}

function DroppableColumn({
  column,
  products,
  selectedWidgetId,
  onSelectWidget,
  onDeleteWidget,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  })

  return (
    <div className={`builder-canvas-column${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      {column.widgets.length === 0 ? (
        <p className="builder-canvas-empty">Drop widgets here</p>
      ) : (
        column.widgets.map((widget) => (
          <div
            className={`builder-canvas-widget${selectedWidgetId === widget.id ? ' is-selected' : ''}`}
            key={widget.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectWidget(widget.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectWidget(widget.id)
              }
            }}
          >
            <WidgetRenderer widget={widget} products={products} useSeoProductUrls={false} />
            <button
              className="builder-canvas-widget__delete"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDeleteWidget(widget.id)
              }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function VisualEditor() {
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [layout, setLayout] = useState(initialLayout)
  const [products, setProducts] = useState([])
  const [selectedWidgetId, setSelectedWidgetId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState([])
  const selectedWidget = useMemo(() => {
    for (const section of layout.sections) {
      for (const column of section.columns) {
        const widget = column.widgets.find((entry) => entry.id === selectedWidgetId)
        if (widget) return widget
      }
    }

    return null
  }, [layout, selectedWidgetId])

  useEffect(() => {
    async function loadPage() {
      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const [page, productResponse] = await Promise.all([
          getStorePage(currentStore.id),
          getProducts(currentStore.id),
        ])
        setLayout(normalizeLayout(page.layout))
        setProducts(productResponse.filter((product) => product.status === 'active'))
      } catch (error) {
        console.error(error)
        showToast(error.message || 'Something went wrong', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [currentStore?.id, showToast])

  function commitLayout(nextLayout) {
    setHistory((currentHistory) => [...currentHistory.slice(-9), layout])
    setLayout(nextLayout)
  }

  function addSection() {
    commitLayout({
      ...layout,
      sections: [
        ...layout.sections,
        {
          id: createId('section'),
          columns: [{ id: createId('column'), widgets: [] }],
        },
      ],
    })
  }

  function addColumn(sectionId) {
    commitLayout({
      ...layout,
      sections: layout.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              columns: [...section.columns, { id: createId('column'), widgets: [] }],
            }
          : section,
      ),
    })
  }

  function addWidget(columnId, widget) {
    commitLayout({
      ...layout,
      sections: layout.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                widgets: [...column.widgets, widget],
              }
            : column,
        ),
      })),
    })
    setSelectedWidgetId(widget.id)
  }

  function updateWidget(widgetId, updates) {
    commitLayout({
      ...layout,
      sections: layout.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) => ({
          ...column,
          widgets: column.widgets.map((widget) =>
            widget.id === widgetId ? { ...widget, ...updates } : widget,
          ),
        })),
      })),
    })
  }

  function deleteWidget(widgetId) {
    commitLayout({
      ...layout,
      sections: layout.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) => ({
          ...column,
          widgets: column.widgets.filter((widget) => widget.id !== widgetId),
        })),
      })),
    })
    if (selectedWidgetId === widgetId) setSelectedWidgetId('')
  }

  function deleteSection(sectionId) {
    commitLayout({
      ...layout,
      sections: layout.sections.filter((section) => section.id !== sectionId),
    })
  }

  function duplicateSection(sectionId) {
    const section = layout.sections.find((entry) => entry.id === sectionId)
    if (!section) return

    const copy = {
      ...section,
      id: createId('section'),
      columns: section.columns.map((column) => ({
        ...column,
        id: createId('column'),
        widgets: column.widgets.map((widget) => ({ ...widget, id: createId('widget') })),
      })),
    }

    commitLayout({
      ...layout,
      sections: [...layout.sections, copy],
    })
  }

  function undo() {
    const previousLayout = history.at(-1)
    if (!previousLayout) return

    setHistory((currentHistory) => currentHistory.slice(0, -1))
    setLayout(previousLayout)
  }

  function handleDragEnd(event) {
    const widgetType = event.active.data.current?.widgetType
    const columnId = event.over?.data.current?.columnId
    const template = widgetTemplates.find((entry) => entry.type === widgetType)

    if (!template || !columnId) {
      return
    }

    addWidget(columnId, {
      id: createId('widget'),
      type: template.type,
      ...template.defaults,
    })
  }

  async function handleSave() {
    if (!currentStore?.id) return

    setIsSaving(true)

    try {
      await saveStorePage({
        storeId: currentStore.id,
        name: 'homepage',
        slug: '/',
        layout,
      })
      showToast('Page saved', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentStore?.id) {
    return <p className="product-empty-state">Create a store first to edit pages.</p>
  }

  if (isLoading) {
    return <p className="product-empty-state">Loading editor...</p>
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="visual-editor-page">
        <div className="visual-editor-page__header">
          <div>
            <h2>Visual Editor</h2>
            <p>Homepage layout for {currentStore.name}</p>
          </div>
          <div className="visual-editor-page__actions">
            <Button type="button" variant="outline" onClick={undo} disabled={history.length === 0}>
              Undo
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Page'}
            </Button>
          </div>
        </div>

        <div className="elementor-editor">
          <aside className="elementor-sidebar">
            <h3>Widgets</h3>
            {widgetTemplates.map((template) => (
              <DraggableWidget key={template.type} template={template} />
            ))}
            <Button fullWidth type="button" variant="outline" onClick={addSection}>
              Add Section
            </Button>
          </aside>

          <main className="elementor-canvas">
            {layout.sections.map((section) => (
              <section className="builder-canvas-section" key={section.id}>
                <div className="builder-section-toolbar">
                  <span>Section</span>
                  <div>
                    <button type="button" onClick={() => addColumn(section.id)}>Add column</button>
                    <button type="button" onClick={() => duplicateSection(section.id)}>Duplicate</button>
                    <button type="button" onClick={() => deleteSection(section.id)}>Delete</button>
                  </div>
                </div>
                <div className="builder-canvas-columns">
                  {section.columns.map((column) => (
                    <DroppableColumn
                      key={column.id}
                      column={column}
                      products={products}
                      selectedWidgetId={selectedWidgetId}
                      onSelectWidget={setSelectedWidgetId}
                      onDeleteWidget={deleteWidget}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>

          <aside className="elementor-settings">
            <h3>Settings</h3>
            {!selectedWidget ? (
              <p className="builder-canvas-empty">Select a widget to edit it.</p>
            ) : (
              <div className="elementor-settings__fields">
                <strong>{selectedWidget.type}</strong>

                {['heading', 'text'].includes(selectedWidget.type) ? (
                  <div className="product-form__field">
                    <label htmlFor="widget-content">Content</label>
                    <textarea
                      id="widget-content"
                      value={selectedWidget.content || ''}
                      onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })}
                    />
                  </div>
                ) : null}

                {selectedWidget.type === 'heading' ? (
                  <div className="product-form__field">
                    <label htmlFor="widget-font-size">Font size</label>
                    <input
                      id="widget-font-size"
                      type="number"
                      min="18"
                      max="96"
                      value={selectedWidget.fontSize || 44}
                      onChange={(event) => updateWidget(selectedWidget.id, { fontSize: Number(event.target.value) })}
                    />
                  </div>
                ) : null}

                {selectedWidget.type === 'image' ? (
                  <>
                    <div className="product-form__field">
                      <label htmlFor="widget-image-src">Image URL</label>
                      <input
                        id="widget-image-src"
                        type="url"
                        value={selectedWidget.src || ''}
                        onChange={(event) => updateWidget(selectedWidget.id, { src: event.target.value })}
                      />
                    </div>
                    <div className="product-form__field">
                      <label htmlFor="widget-image-alt">Alt text</label>
                      <input
                        id="widget-image-alt"
                        type="text"
                        value={selectedWidget.alt || ''}
                        onChange={(event) => updateWidget(selectedWidget.id, { alt: event.target.value })}
                      />
                    </div>
                  </>
                ) : null}

                {selectedWidget.type === 'products' ? (
                  <div className="product-form__field">
                    <label htmlFor="widget-products-limit">Product limit</label>
                    <input
                      id="widget-products-limit"
                      type="number"
                      min="1"
                      max="24"
                      value={selectedWidget.limit || 6}
                      onChange={(event) => updateWidget(selectedWidget.id, { limit: Number(event.target.value) })}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </div>

        <SurfaceCard className="elementor-live-preview">
          <div className="elementor-live-preview__header">
            <h3>Live preview</h3>
          </div>
          <PageRenderer
            layout={layout}
            products={products}
            store={currentStore}
            onBuyNow={() => {}}
            useSeoProductUrls={false}
          />
        </SurfaceCard>
      </div>
    </DndContext>
  )
}

export default VisualEditor
