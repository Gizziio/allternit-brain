import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { marked } from 'marked'
import vaultJson from './generated/vault.json'
import type { VaultFile, VaultIndex } from './types'
import './App.css'

const vault = vaultJson as VaultIndex

const COLORS = ['black', 'purple', 'blue', 'green', 'gold', 'rose'] as const

function colorFor(name: string) {
  let n = 0
  for (const c of name) n += c.charCodeAt(0)
  return COLORS[n % COLORS.length]
}

function resolveVaultPath(fromPath: string, href: string) {
  const clean = href.split('#')[0].replace(/^\.\//, '')
  if (!clean || clean.startsWith('http') || clean.startsWith('mailto:')) return null
  const fromDir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : ''
  const joined = (fromDir ? `${fromDir}/${clean}` : clean).replaceAll('\\', '/')
  const parts: string[] = []
  for (const p of joined.split('/')) {
    if (p === '' || p === '.') continue
    if (p === '..') parts.pop()
    else parts.push(p)
  }
  let path = parts.join('/')
  if (path.endsWith('/')) path += 'INDEX.md'
  else if (!path.endsWith('.md')) path += '.md'
  path = path.replace('%20', ' ')
  return path
}

function renderMarkdown(file: VaultFile) {
  const html = marked.parse(file.body, { async: false }) as string
  return html
}

const HOME = 'Dashboard'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('brain-theme') || 'light')
  const [tab, setTab] = useState<'folders' | 'tags'>('folders')
  const [folder, setFolder] = useState(HOME)
  const [selected, setSelected] = useState('Dashboard/Now.md')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('brain-theme', theme)
  }, [theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const file = vault.files.find((f) => f.path === selected) ?? vault.files[0]

  const folderFiles = useMemo(() => {
    if (folder === 'Home') {
      return vault.files.filter((f) =>
        ['INDEX.md', 'BRAIN.md', 'AGENTS.md'].includes(f.path) || f.path.startsWith('Dashboard/'),
      )
    }
    return vault.files.filter((f) => f.path === folder || f.path.startsWith(folder + '/'))
  }, [folder])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return vault.files.filter((f) =>
      f.title.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q) ||
      f.body.toLowerCase().includes(q),
    ).slice(0, 20)
  }, [query])

  const tags = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of vault.files) {
      if (f.doc) map.set(`doc:${f.doc}`, (map.get(`doc:${f.doc}`) || 0) + 1)
      if (f.status) map.set(f.status, (map.get(f.status) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [])

  const stale = vault.files.filter((f) => f.status === 'draft').length

  function openPath(path: string) {
    const found = vault.files.find((f) => f.path === path)
    if (!found) return
    setSelected(path)
    const top = path.includes('/') ? path.split('/')[0] : 'Home'
    if (top !== 'Home') setFolder(top)
    setSearchOpen(false)
    setQuery('')
  }

  function onReaderClick(e: MouseEvent<HTMLElement>) {
    const a = (e.target as HTMLElement).closest('a')
    if (!a || !file) return
    const href = a.getAttribute('href') || ''
    const resolved = resolveVaultPath(file.path, href)
    if (resolved && vault.files.some((f) => f.path === resolved)) {
      e.preventDefault()
      openPath(resolved)
    }
  }

  const treeKids = (name: string) => {
    const prefix = name + '/'
    const kids = new Map<string, number>()
    for (const f of vault.files) {
      if (!f.path.startsWith(prefix)) continue
      const rest = f.path.slice(prefix.length)
      const child = rest.split('/')[0]
      if (child.endsWith('.md') && rest === child) continue
      if (!child.endsWith('.md')) kids.set(child, (kids.get(child) || 0) + 1)
    }
    return [...kids.entries()]
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="mark" aria-hidden>A</div>
        <button className="rail-btn on" title="Home" onClick={() => { setFolder(HOME); setSelected('Dashboard/Now.md') }}>⌂</button>
        <button className="rail-btn" title="Vault" onClick={() => setTab('folders')}>▣</button>
        <button className="rail-btn" title="Tags" onClick={() => setTab('tags')}>🏷</button>
        <div className="rail-spacer" />
        <button className="rail-btn" title="Theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </aside>

      <div className="shell">
        <header className="top">
          <div className="brand">
            <strong>Allternit Brain</strong>
            <span>Knowledge Base</span>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} title="Search">⌘K</button>
            <button className="icon-btn bell" title={`${stale} draft docs`}>{stale > 0 && <i />}</button>
          </div>
        </header>

        <div className="body">
          <nav className="tree">
            <h2>Knowledge Base</h2>
            <button className="search-fake" onClick={() => setSearchOpen(true)}>
              Search knowledge... <kbd>⌘K</kbd>
            </button>
            <div className="tabs">
              <button className={tab === 'folders' ? 'on' : ''} onClick={() => setTab('folders')}>Folders</button>
              <button className={tab === 'tags' ? 'on' : ''} onClick={() => setTab('tags')}>Tags</button>
            </div>
            {tab === 'folders' ? (
              <ul className="tree-list">
                <li>
                  <button className={folder === HOME ? 'row on' : 'row'} onClick={() => setFolder(HOME)}>
                    Dashboard
                    <em>{vault.files.filter((f) => f.path.startsWith('Dashboard/')).length}</em>
                  </button>
                </li>
                {vault.folders.filter((f) => f.name !== 'Dashboard').map((f) => (
                  <li key={f.name}>
                    <button className={folder === f.name ? 'row on' : 'row'} onClick={() => setFolder(f.name)}>
                      {f.name}
                      <em>{f.count}</em>
                    </button>
                    {folder === f.name && treeKids(f.name).map(([k, n]) => (
                      <button key={k} className="row sub" onClick={() => setFolder(f.name)}>
                        {k} <em>{n}</em>
                      </button>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="tree-list">
                {tags.map(([t, n]) => (
                  <li key={t}><span className="row"><span>{t}</span><em>{n}</em></span></li>
                ))}
              </ul>
            )}
          </nav>

          <main className="main">
            <section>
              <div className="sec-head">
                <h1>{folder}</h1>
                <span>{folderFiles.length} files</span>
              </div>
              <div className="cards">
                {(folder === HOME ? vault.folders.slice(0, 4) : [vault.folders.find((f) => f.name === folder)].filter(Boolean)).map((f) => f && (
                  <button key={f.name} className={`card ${colorFor(f.name)}`} onClick={() => setFolder(f.name)}>
                    <div className="folder-3d" />
                    <strong>{f.name}</strong>
                    <span>{f.count} Files</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="sec-head">
                <h2>Files</h2>
                <span>Last modified</span>
              </div>
              <table>
                <thead>
                  <tr><th>Name</th><th>Status</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {folderFiles.map((f) => (
                    <tr key={f.path} className={selected === f.path ? 'on' : ''} onClick={() => openPath(f.path)}>
                      <td>
                        <b>{f.title}</b>
                        <small>{f.path}</small>
                      </td>
                      <td><span className={`pill ${f.status || 'none'}`}>{f.status || '—'}</span></td>
                      <td>{f.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {file && (
              <article className="reader" onClick={onReaderClick}>
                <header>
                  <span className="crumb">{file.path}</span>
                  {file.doc && <span className="pill">{file.doc}</span>}
                  {file.status && <span className={`pill ${file.status}`}>{file.status}</span>}
                </header>
                <h1>{file.title}</h1>
                <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(file) }} />
              </article>
            )}
          </main>
        </div>
      </div>

      {searchOpen && (
        <div className="modal" onClick={() => setSearchOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              placeholder="Search knowledge..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul>
              {(query ? hits : vault.files.slice(0, 8)).map((f) => (
                <li key={f.path}>
                  <button onClick={() => openPath(f.path)}>
                    <b>{f.title}</b>
                    <small>{f.path}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
