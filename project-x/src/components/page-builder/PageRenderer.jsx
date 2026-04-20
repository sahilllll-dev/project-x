import WidgetRenderer from './WidgetRenderer.jsx'

function PageRenderer({ layout, products = [], store, onBuyNow = () => {}, useSeoProductUrls = true }) {
  const sections = Array.isArray(layout?.sections) ? layout.sections : []

  return (
    <main className="builder-page-renderer" aria-label={store?.name || 'Store page'}>
      {sections.map((section) => (
        <section className="builder-section" key={section.id}>
          {(section.columns || []).map((column) => (
            <div className="builder-column" key={column.id}>
              {(column.widgets || []).map((widget) => (
                <WidgetRenderer
                  key={widget.id}
                  widget={widget}
                  products={products}
                  onBuyNow={onBuyNow}
                  useSeoProductUrls={useSeoProductUrls}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}

export default PageRenderer
