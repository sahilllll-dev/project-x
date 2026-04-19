function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function SurfaceCard({
  as: Component = 'section',
  padding = 'none',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={joinClasses(
        'ui-surface',
        padding !== 'none' ? `ui-surface--${padding}` : '',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export default SurfaceCard
