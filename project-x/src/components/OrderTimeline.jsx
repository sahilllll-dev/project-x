function formatDateTime(value) {
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

function OrderTimeline({ timeline = [] }) {
  if (timeline.length === 0) {
    return <p className="product-empty-state">No timeline entries yet.</p>
  }

  return (
    <div className="order-timeline">
      {timeline.map((entry) => (
        <div className="order-timeline__item" key={entry.id}>
          <span className="order-timeline__dot" />
          <div>
            <strong>{entry.message || entry.status}</strong>
            <p>{formatDateTime(entry.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default OrderTimeline
