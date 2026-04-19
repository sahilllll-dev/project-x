function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  active = false,
  className = '',
  type,
  children,
  ...props
}) {
  const resolvedType = Component === 'button' ? type ?? 'button' : undefined

  return (
    <Component
      className={joinClasses(
        'ui-button',
        `ui-button--${variant}`,
        size !== 'md' ? `ui-button--${size}` : '',
        fullWidth ? 'ui-button--full-width' : '',
        active ? 'ui-button--active' : '',
        className,
      )}
      type={resolvedType}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Button
