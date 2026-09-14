import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type CommerceProduct, type ProductVariant } from '../services/api'

const storageKey = 'marianas-open-cart-v1'

export interface CartLine {
  productId: number
  variantId: number
  quantity: number
}

interface ResolvedCartLine extends CartLine {
  product: CommerceProduct
  variant: ProductVariant
}

interface CommerceContextValue {
  enabled: boolean
  loading: boolean
  error: string
  products: CommerceProduct[]
  cartLines: ResolvedCartLine[]
  cartCount: number
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (productId: number, variantId: number, quantity?: number) => void
  updateQuantity: (variantId: number, quantity: number) => void
  removeFromCart: (variantId: number) => void
  reload: () => Promise<void>
}

const CommerceContext = createContext<CommerceContextValue | null>(null)

function readStoredCart(): CartLine[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((line): line is CartLine => (
      Number.isInteger(line?.productId) && Number.isInteger(line?.variantId) &&
      Number.isInteger(line?.quantity) && line.quantity > 0
    ))
  } catch {
    return []
  }
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<CommerceProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>(readStoredCart)
  const [cartOpen, setCartOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const configuration = await api.getShopConfiguration()
      setEnabled(configuration.enabled)
      if (!configuration.enabled) {
        setProducts([])
        return
      }
      const catalog = await api.getShopProducts()
      setProducts(catalog.products)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The shop could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(cart)) } catch { /* Storage can be unavailable. */ }
  }, [cart])

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const cartLines = useMemo(() => cart.flatMap(line => {
    const product = productById.get(line.productId)
    const variant = product?.variants.find(candidate => candidate.id === line.variantId)
    if (!product || !variant || !variant.id || variant.available_quantity < 1) return []
    return [{ ...line, quantity: Math.min(line.quantity, variant.available_quantity), product, variant }]
  }), [cart, productById])

  const addToCart = useCallback((productId: number, variantId: number, quantity = 1) => {
    const product = productById.get(productId)
    const variant = product?.variants.find(candidate => candidate.id === variantId)
    if (!variant || variant.available_quantity < 1) return
    setCart(current => {
      const existing = current.find(line => line.variantId === variantId)
      if (!existing) return [...current, { productId, variantId, quantity: Math.min(quantity, variant.available_quantity) }]
      return current.map(line => line.variantId === variantId
        ? { ...line, quantity: Math.min(line.quantity + quantity, variant.available_quantity) }
        : line)
    })
    setCartOpen(true)
  }, [productById])

  const updateQuantity = useCallback((variantId: number, quantity: number) => {
    setCart(current => current.flatMap(line => {
      if (line.variantId !== variantId) return [line]
      const product = productById.get(line.productId)
      const variant = product?.variants.find(candidate => candidate.id === variantId)
      if (!variant || variant.available_quantity < 1 || quantity <= 0) return []
      return [{ ...line, quantity: Math.min(quantity, variant.available_quantity) }]
    }))
  }, [productById])

  const removeFromCart = useCallback((variantId: number) => {
    setCart(current => current.filter(line => line.variantId !== variantId))
  }, [])

  const value = useMemo<CommerceContextValue>(() => ({
    enabled,
    loading,
    error,
    products,
    cartLines,
    cartCount: cartLines.reduce((sum, line) => sum + line.quantity, 0),
    cartOpen,
    setCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    reload,
  }), [enabled, loading, error, products, cartLines, cartOpen, addToCart, updateQuantity, removeFromCart, reload])

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>
}

export function useCommerce() {
  const context = useContext(CommerceContext)
  if (!context) throw new Error('useCommerce must be used inside CommerceProvider')
  return context
}
