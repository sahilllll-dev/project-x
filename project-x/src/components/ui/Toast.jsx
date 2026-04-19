const toastIcons = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
}

const toastTitles = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
}

function Toast({
  message,
  type = 'info',
  visible = false,
  token = 0,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <div
      className={`toast toast--${type}${visible ? ' toast--visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="toast__icon" aria-hidden="true">
        {toastIcons[type] ?? toastIcons.info}
      </span>
      <div className="toast__content">
        <strong>{toastTitles[type] ?? toastTitles.info}</strong>
        <p>{message}</p>
      </div>
      <span className="toast__progress" key={token} aria-hidden="true" />
    </div>
  )
}

export default Toast
