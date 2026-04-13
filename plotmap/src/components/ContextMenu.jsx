import { useEffect, useRef, useState } from 'react'
import './ContextMenu.css'

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // Adjust position so the menu stays within the viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    setPos({
      left: rect.right > vw ? x - rect.width : x,
      top:  rect.bottom > vh ? y - rect.height : y,
    })
  }, [x, y])

  // Close on outside mousedown or Escape
  useEffect(() => {
    const onKey  = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    // Delay so the right-click that opened the menu is not caught here
    const tid = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="ctx-menu" style={pos} ref={menuRef}>
      {items.map((item, i) => {
        if (item.type === 'divider') return <hr key={i} className="ctx-menu__divider" />
        return (
          <button
            key={i}
            className={`ctx-menu__item${item.danger ? ' ctx-menu__item--danger' : ''}`}
            onClick={(e) => { e.stopPropagation(); item.action(); onClose() }}
            disabled={item.disabled}
          >
            {item.icon && <span className="ctx-menu__icon">{item.icon}</span>}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
