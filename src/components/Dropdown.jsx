import { useEffect, useRef, useState } from 'react'

// Bootstrap-styled dropdown driven by React state (no Bootstrap JS needed).
export default function Dropdown({ label, children, align = 'start', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button type="button" className="btn btn-outline-secondary dropdown-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      <div className={`dropdown-menu ${align === 'end' ? 'dropdown-menu-end' : ''} ${open ? 'show' : ''}`} style={align === 'end' ? { right: 0, left: 'auto' } : undefined}>
        {typeof children === 'function' ? children(() => setOpen(false)) : children}
      </div>
    </div>
  )
}
