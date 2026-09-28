'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import styles from './RichEditor.module.css'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichEditor({ value, onChange, placeholder = 'Start writing...', minHeight = 200 }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showSource, setShowSource] = useState(false)
  const [sourceText, setSourceText] = useState(value)

  // Last HTML emitted via onChange (local edits + toolbar). The parent echoes
  // it back as `value`; the DOM is only rewritten when `value` diverges from
  // BOTH the live DOM and the last emission — i.e. a genuine external change
  // (prefill, edit-existing, post-submit clear). Without this guard, every
  // keystroke's parent re-render replaces innerHTML mid-edit, scrambling the
  // caret and block structure (verified live: mixed-direction paragraphs came
  // out reordered and misaligned).
  const lastEmitted = useRef(value)

  // Render-time HTML is frozen at mount: passing the live `value` into
  // dangerouslySetInnerHTML would make React replace the DOM on every
  // keystroke (parent setState -> re-render -> innerHTML swap), pinning the
  // caret at offset 0 so each character prepends (verified live: typed text
  // came out fully reversed). External updates go through the effect below.
  const initialHtml = useRef<string | null>(null)
  if (initialHtml.current === null) initialHtml.current = value

  const emit = useCallback((html: string) => {
    lastEmitted.current = html
    onChange(html)
  }, [onChange])

  useEffect(() => {
    const el = editorRef.current
    if (!showSource && el && value !== el.innerHTML && value !== lastEmitted.current) {
      el.innerHTML = value
    }
  }, [value, showSource])

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      emit(editorRef.current.innerHTML)
    }
  }, [emit])

  const handleInsertImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      try { new URL(url) } catch { return }
      if (url.startsWith('javascript:')) return
      exec('insertImage', url)
      if (editorRef.current) {
        const img = editorRef.current.querySelector('img:last-child')
        if (img) img.setAttribute('style', 'max-width:100%;border-radius:8px;margin:8px 0;')
      }
    }
  }, [exec])

  const handleInsertAudio = useCallback(() => {
    const url = window.prompt('Enter audio URL (direct mp3, m4a, ogg, or wav link):')
    if (!url) return
    let audioUrl: URL
    try { audioUrl = new URL(url) } catch { return }
    if (audioUrl.protocol !== 'https:' || !audioUrl.pathname.match(/\.(mp3|m4a|aac|ogg|oga|wav|webm|opus|flac)(\?|#|$)/i)) return
    exec('insertHTML', `<audio src="${url}" controls preload="none" style="width:100%;margin:12px 0;" />`)
  }, [exec])

  const handleInsertVideo = useCallback(() => {
    const url = window.prompt('Enter video URL (YouTube, Vimeo, or direct video link):')
    if (!url) return
    try { new URL(url) } catch { return }
    if (url.startsWith('javascript:')) return
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (youtubeMatch) {
      exec('insertHTML', `<div style="position:relative;padding-bottom:56.25%;height:0;margin:12px 0;border-radius:8px;overflow:hidden"><iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div>`)
    } else if (vimeoMatch) {
      exec('insertHTML', `<div style="position:relative;padding-bottom:56.25%;height:0;margin:12px 0;border-radius:8px;overflow:hidden"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div>`)
    } else {
      const videoUrl = new URL(url)
      if (['http:', 'https:'].indexOf(videoUrl.protocol) === -1 || !videoUrl.pathname.match(/\.(mp4|webm|ogg)$/i)) return
      exec('insertHTML', `<video src="${url}" controls style="max-width:100%;border-radius:8px;margin:12px 0;" />`)
    }
  }, [exec])

  const handleInsertLink = useCallback(() => {
    const url = window.prompt('Enter link URL (https://…):')
    if (!url) return
    let parsed: URL
    try { parsed = new URL(url) } catch { return }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
    // Link the current selection; fall back to inserting the URL as link text.
    const sel = window.getSelection()
    if (!sel || sel.toString().trim() === '') {
      exec('insertHTML', `<a href="${parsed.toString()}" target="_blank" rel="noopener noreferrer">${parsed.toString()}</a>`)
    } else {
      exec('createLink', parsed.toString())
    }
  }, [exec])

  // Force paragraph direction for the current selection, overriding the
  // per-paragraph auto-detect (unicode-bidi: plaintext). Useful when the
  // first strong character misleads, e.g. a Latin product name in Arabic text.
  const toggleDirection = useCallback(() => {
    const root = editorRef.current
    if (!root) return
    root.focus()
    const sel = window.getSelection()
    let block: HTMLElement | null = null
    if (sel && sel.anchorNode) {
      const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement)
      block = node?.closest?.('p, div, li, h1, h2, h3, blockquote') as HTMLElement | null
    }
    if (!block || !root.contains(block) || block === root) {
      // No specific block: flip the whole surface explicitly.
      root.setAttribute('dir', root.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl')
    } else if (block.getAttribute('dir') === 'rtl') {
      block.setAttribute('dir', 'ltr')
    } else {
      block.setAttribute('dir', 'rtl')
    }
    emit(root.innerHTML)
  }, [emit])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    if (editorRef.current) emit(editorRef.current.innerHTML)
  }, [onChange])

  const toggleSource = useCallback(() => {
    if (showSource) {
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceText
      }
      emit(sourceText)
      setShowSource(false)
    } else {
      setSourceText(editorRef.current?.innerHTML || '')
      setShowSource(true)
    }
  }, [showSource, sourceText, emit])

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={() => exec('bold')} title="Bold" aria-label="Bold"><strong>B</strong></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('italic')} title="Italic" aria-label="Italic"><em>I</em></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('underline')} title="Underline" aria-label="Underline"><u>U</u></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('strikeThrough')} title="Strikethrough" aria-label="Strikethrough"><s>S</s></button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={() => exec('formatBlock', 'h2')} title="Heading 2" aria-label="Heading 2">H2</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('formatBlock', 'h3')} title="Heading 3" aria-label="Heading 3">H3</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('formatBlock', 'blockquote')} title="Quote" aria-label="Quote">❝</button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={() => exec('insertUnorderedList')} title="Bullet List" aria-label="Bullet List">UL</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('insertOrderedList')} title="Numbered List" aria-label="Numbered List">OL</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('outdent')} title="Decrease indent" aria-label="Decrease indent">⇤</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('indent')} title="Increase indent" aria-label="Increase indent">⇥</button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={() => exec('justifyLeft')} title="Align left" aria-label="Align left">⭰</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('justifyCenter')} title="Align center" aria-label="Align center">⭲</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('justifyRight')} title="Align right" aria-label="Align right">⭱</button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('justifyFull')} title="Justify" aria-label="Justify">☰</button>
        <button type="button" className={styles.toolBtn} onClick={toggleDirection} title="Toggle text direction (LTR/RTL)" aria-label="Toggle text direction">⇄</button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={handleInsertLink} title="Insert Link" aria-label="Insert Link">🔗</button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={handleInsertImage} title="Insert Image" aria-label="Insert Image">🖼️</button>
        <button type="button" className={styles.toolBtn} onClick={handleInsertAudio} title="Insert Audio" aria-label="Insert Audio">🎙️</button>
        <button type="button" className={styles.toolBtn} onClick={handleInsertVideo} title="Insert Video" aria-label="Insert Video">🎬</button>
        <span className={styles.sep} />
        <button type="button" className={styles.toolBtn} onClick={() => exec('removeFormat')} title="Clear formatting" aria-label="Clear formatting">🧹</button>
        <button type="button" className={styles.toolBtn} onClick={toggleSource} title={showSource ? 'Visual' : 'Source'} aria-label="Toggle source">{showSource ? '👁️' : '</>'}</button>
      </div>
      {showSource ? (
        <textarea
          className={styles.sourceArea}
          dir="auto"
          value={sourceText}
          onChange={e => { setSourceText(e.target.value); onChange(e.target.value) }}
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          dir="auto"
          onInput={() => { if (editorRef.current) emit(editorRef.current.innerHTML) }}
          onPaste={handlePaste}
          style={{ minHeight }}
          data-placeholder={placeholder}
          dangerouslySetInnerHTML={{ __html: initialHtml.current ?? '' }}
        />
      )}
    </div>
  )
}
