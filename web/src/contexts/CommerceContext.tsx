import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type CommerceProduct, type ProductVariant } from '../services/api'

const storageKey = 'marianas-open-cart-v1'
const activeCheckoutStorageKey = 'marianas-open-active-checkout-v1'

export interface CartLine {
  productId: number
  variantId: number
  quantity: number
}

export interface ResolvedCartLine extends CartLine {
  product: CommerceProduct
  variant: ProductVariant
}

interface CommerceContextValue {
  enabled: boolean
  fakeCheckoutEnabled: boolean
  pocMode: boolean
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
  clearCart: () => void
  rememberCheckout: (orderToken: string) => void
  clearCartForCheckout: (orderToken: string) => void
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

function cartSignature(lines: CartLine[]) {
  return JSON.stringify([...lines]
    .sort((left, right) => left.variantId - right.variantId)
    .map(({ productId, variantId, quantity }) => [productId, variantId, quantity]))
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [fakeCheckoutEnabled, setFakeCheckoutEnabled] = useState(false)
  const [pocMode, setPocMode] = useState(false)
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
      setFakeCheckoutEnabled(configuration.fake_checkout_enabled)
      setPocMode(configuration.poc_mode)
      if (!configuration.enabled) {
        setProducts([])
        return
      }
      const catalog = await api.getShopProducts()
      setProducts(catalog.products)
      const catalogById = new Map(catalog.products.map(product => [product.id, product]))
      setCart(current => current.flatMap(line => {
        const product = catalogById.get(line.productId)
        const variant = product?.variants.find(candidate => candidate.id === line.variantId)
        if (!variant || variant.available_quantity < 1) return []
        return [{ ...line, quantity: Math.min(line.quantity, variant.available_quantity) }]
      }))
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

  const clearCart = useCallback(() => setCart([]), [])
  const rememberCheckout = useCallback((orderToken: string) => {
    try {
      window.sessionStorage.setItem(activeCheckoutStorageKey, JSON.stringify({
        orderToken,
        cartSignature: cartSignature(cart),
      }))
    } catch { /* Storage can be unavailable. */ }
  }, [cart])
  const clearCartForCheckout = useCallback((orderToken: string) => {
    setCart(current => {
      try {
        const marker = JSON.parse(window.sessionStorage.getItem(activeCheckoutStorageKey) || 'null')
        if (marker?.orderToken !== orderToken || marker?.cartSignature !== cartSignature(current)) return current
        window.sessionStorage.removeItem(activeCheckoutStorageKey)
        return []
      } catch {
        return current
      }
    })
  }, [])

  const value = useMemo<CommerceContextValue>(() => ({
    enabled,
    fakeCheckoutEnabled,
    pocMode,
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
    clearCart,
    rememberCheckout,
    clearCartForCheckout,
    reload,
  }), [enabled, fakeCheckoutEnabled, pocMode, loading, error, products, cartLines, cartOpen, addToCart, updateQuantity, removeFromCart, clearCart, rememberCheckout, clearCartForCheckout, reload])

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>
}

export function useCommerce() {
  const context = useContext(CommerceContext)
  if (!context) throw new Error('useCommerce must be used inside CommerceProvider')
  return context
}
