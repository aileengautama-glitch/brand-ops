import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Package, Layers, Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProductCard from '@/components/creative/ProductCard'
import StylingCard from '@/components/creative/StylingCard'
import EmptyState from '@/components/ui/EmptyState'
import { usePrint } from '@/hooks/usePrint'

function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white border border-surface-3 rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-3 bg-surface-1">
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function ShootProductsStyling() {
  const { id } = useParams<{ id: string }>()
  const project = useShootStore((s) => s.projects.find((p) => p.id === id))

  const addProduct = useShootStore((s) => s.addProduct)
  const updateProduct = useShootStore((s) => s.updateProduct)
  const removeProduct = useShootStore((s) => s.removeProduct)
  const moveProduct = useShootStore((s) => s.moveProduct)
  const addProductUSP = useShootStore((s) => s.addProductUSP)
  const updateProductUSP = useShootStore((s) => s.updateProductUSP)
  const removeProductUSP = useShootStore((s) => s.removeProductUSP)
  const addProductCategory = useShootStore((s) => s.addProductCategory)
  const removeProductCategory = useShootStore((s) => s.removeProductCategory)

  const addStyling = useShootStore((s) => s.addStyling)
  const updateStyling = useShootStore((s) => s.updateStyling)
  const removeStyling = useShootStore((s) => s.removeStyling)
  const moveStyling = useShootStore((s) => s.moveStyling)

  const { canEdit } = useCurrentUser()
  const readOnly = !canEdit('shoot.styling', id)
  const triggerPrint = usePrint('portrait')

  const [categoryDraft, setCategoryDraft] = useState('')

  if (!project || !id) return null

  const products = [...(project.products ?? [])].sort((a, b) => a.order - b.order)
  const stylings = [...(project.stylings ?? [])].sort((a, b) => a.order - b.order)
  const categories = project.productCategories ?? []

  const handleAddProduct = () => {
    addProduct(id, { name: '', imageId: '', usps: [], ownership: '', category: '' })
  }

  const handleAddStyling = () => {
    const code = (stylings.length + 1).toString().padStart(2, '0')
    addStyling(id, { stylingCode: code, name: '', imageId: '', productIds: [], modelIds: [] })
  }

  const handleAddCategory = () => {
    if (!categoryDraft.trim()) return
    addProductCategory(id, categoryDraft.trim())
    setCategoryDraft('')
  }

  const hasContent = products.length > 0 || stylings.length > 0

  return (
    <div className="print-page-wrapper p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-base font-semibold text-ink">Products &amp; Styling</h1>
          <p className="text-xs text-ink-muted mt-0.5">{project.name}</p>
        </div>
        {hasContent && (
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <Printer size={13} /> Print / Export
          </button>
        )}
      </div>

      {/* Print-only document header */}
      <div className="print-only print-doc-header">
        <span className="print-label">Products &amp; Styling</span>
        <h1>{project.name}</h1>
      </div>

      {/* ── Products panel ─────────────────────────────────────────────────────── */}
      <Panel
        title={`Products${products.length > 0 ? ` — ${products.length}` : ''}`}
        actions={!readOnly ? (
          <button
            onClick={handleAddProduct}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <Plus size={12} /> Add product
          </button>
        ) : undefined}
      >
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add the products being shot — images, USPs, and category."
            action={!readOnly ? (
              <button onClick={handleAddProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add product
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                categories={categories}
                isFirst={i === 0}
                isLast={i === products.length - 1}
                onUpdate={(patch) => updateProduct(id, product.id, patch)}
                onRemove={() => removeProduct(id, product.id)}
                onMove={(dir) => moveProduct(id, product.id, dir)}
                onAddUSP={(text) => addProductUSP(id, product.id, text)}
                onUpdateUSP={(uspId, text) => updateProductUSP(id, product.id, uspId, text)}
                onRemoveUSP={(uspId) => removeProductUSP(id, product.id, uspId)}
                projectId={id}
              />
            ))}
          </div>
        )}

        {/* Categories management */}
        {(products.length > 0 || categories.length > 0) && (
          <div className="mt-4 pt-4 border-t border-surface-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-2">Product Categories</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categories.map((cat) => (
                <span key={cat}
                  className="inline-flex items-center gap-1 text-xs bg-surface-1 border border-surface-3 rounded px-2 py-0.5 text-ink">
                  {cat}
                  {!readOnly && (
                    <button onClick={() => removeProductCategory(id, cat)}
                      className="text-ink-faint hover:text-red-400 transition-colors">
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="New category…"
                  className="text-xs border border-surface-3 rounded px-2 py-1 bg-white focus:outline-none focus:border-accent"
                />
                <button onClick={handleAddCategory}
                  className="text-xs px-2 py-1 border border-surface-3 rounded text-ink-muted hover:bg-surface-2 transition-colors">
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ── Stylings panel ─────────────────────────────────────────────────────── */}
      <Panel
        title={`Styling${stylings.length > 0 ? ` — ${stylings.length} combination${stylings.length !== 1 ? 's' : ''}` : ''}`}
        actions={!readOnly ? (
          <button
            onClick={handleAddStyling}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <Plus size={12} /> Add styling
          </button>
        ) : undefined}
      >
        {stylings.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No stylings yet"
            description="Create styling combinations pairing products with models."
            action={!readOnly ? (
              <button onClick={handleAddStyling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add styling
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stylings.map((styling, i) => (
              <StylingCard
                key={styling.id}
                styling={styling}
                products={products}
                models={project.models ?? []}
                isFirst={i === 0}
                isLast={i === stylings.length - 1}
                onUpdate={(patch) => updateStyling(id, styling.id, patch)}
                onRemove={() => removeStyling(id, styling.id)}
                onMove={(dir) => moveStyling(id, styling.id, dir)}
                projectId={id}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
