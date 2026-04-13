import { Component, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import './NodeDetailOverlay.css'

const TYPE_LABELS = {
  event:     'Event',
  character: 'Character',
  note:      'Note',
}

// ── Error boundary — catches TipTap or content parsing crashes ────────────────
class OverlayErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: false }
  }

  static getDerivedStateFromError() {
    return { error: true }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="ndo__backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) this.props.onClose() }}
        >
          <div className="ndo__card">
            <div className="ndo__header">
              <div className="ndo__header-left">
                <span className="ndo__type-badge">Error</span>
                <span className="ndo__title">Could not load editor</span>
              </div>
              <button className="ndo__close" onClick={this.props.onClose} title="Close (Esc)">✕</button>
            </div>
            <div className="ndo__body ndo__body--error">
              The rich text content could not be loaded. The stored data may be corrupted.
              Close this dialog and try again, or clear the node's detail content.
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ToolBtn({ action, isActive, title, children }) {
  return (
    <button
      className={`ndo__tool${isActive ? ' ndo__tool--on' : ''}`}
      // mousedown instead of click so focus stays in editor
      onMouseDown={(e) => { e.preventDefault(); action() }}
      title={title}
    >
      {children}
    </button>
  )
}

function NodeDetailOverlayInner({ node, onClose, onChange, readOnly = false }) {
  // Keep a stable ref to onChange so the TipTap onUpdate closure is always current
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const initialContent = (() => {
    if (!node.data.detailContent) return ''
    try { return JSON.parse(node.data.detailContent) } catch { return '' }
  })()

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !readOnly,
    autofocus: readOnly ? false : 'end',
    onUpdate({ editor }) {
      if (!readOnly) onChangeRef.current(JSON.stringify(editor.getJSON()))
    },
  })

  // Escape closes the overlay
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdropDown = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const nodeTitle = node.data.title || node.data.name || '(untitled)'
  const typeLabel = TYPE_LABELS[node.type] || node.type

  return (
    <div className="ndo__backdrop" onMouseDown={handleBackdropDown}>
      <div className="ndo__card">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="ndo__header">
          <div className="ndo__header-left">
            <span className="ndo__type-badge">{typeLabel}</span>
            <span className="ndo__title">{nodeTitle}</span>
          </div>
          <button className="ndo__close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* ── Toolbar (hidden in read-only mode) ──────────────────────── */}
        {editor && !readOnly && (
          <div className="ndo__toolbar">
            <ToolBtn
              action={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <s>S</s>
            </ToolBtn>

            <div className="ndo__sep" />

            <ToolBtn
              action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              H1
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolBtn>

            <div className="ndo__sep" />

            <ToolBtn
              action={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet list"
            >
              •≡
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Ordered list"
            >
              1≡
            </ToolBtn>

            <div className="ndo__sep" />

            <ToolBtn
              action={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Blockquote"
            >
              ❝
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code block"
            >
              {'</>'}
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().setHorizontalRule().run()}
              isActive={false}
              title="Horizontal rule"
            >
              ─
            </ToolBtn>

            <div className="ndo__sep" />

            <ToolBtn
              action={() => editor.chain().focus().undo().run()}
              isActive={false}
              title="Undo (Ctrl+Z)"
            >
              ↩
            </ToolBtn>
            <ToolBtn
              action={() => editor.chain().focus().redo().run()}
              isActive={false}
              title="Redo (Ctrl+Y)"
            >
              ↪
            </ToolBtn>
          </div>
        )}

        {/* ── Editor content area ─────────────────────────────────────── */}
        <div className="ndo__body">
          <EditorContent editor={editor} className="ndo__editor" />
        </div>

      </div>
    </div>
  )
}

// Wrap in error boundary so a TipTap crash shows a fallback instead of blanking the page.
export default function NodeDetailOverlay({ node, onClose, onChange, readOnly = false }) {
  return (
    <OverlayErrorBoundary onClose={onClose}>
      <NodeDetailOverlayInner
        node={node}
        onClose={onClose}
        onChange={onChange}
        readOnly={readOnly}
      />
    </OverlayErrorBoundary>
  )
}
