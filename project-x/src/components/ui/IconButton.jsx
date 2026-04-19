import Button from './Button.jsx'

function IconButton({ className = '', children, ...props }) {
  return (
    <Button className={`ui-icon-button ${className}`.trim()} size="icon" variant="outline" {...props}>
      {children}
    </Button>
  )
}

export default IconButton
