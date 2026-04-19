import SurfaceCard from './ui/SurfaceCard.jsx'

function ListViewContainer({
  topContent = null,
  isLoading = false,
  isEmpty = false,
  loadingMessage = 'Loading...',
  emptyMessage = 'No items found.',
  children,
}) {
  return (
    <SurfaceCard className="list-view-card">
      {topContent ? <div className="list-view-card__top">{topContent}</div> : null}

      {isLoading ? (
        <p className="product-empty-state">{loadingMessage}</p>
      ) : isEmpty ? (
        <p className="product-empty-state">{emptyMessage}</p>
      ) : (
        children
      )}
    </SurfaceCard>
  )
}

export default ListViewContainer
