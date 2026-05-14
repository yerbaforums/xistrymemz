import { render, screen, fireEvent } from '@testing-library/react'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types/product'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: '1', name: 'Test' } } }) }))
jest.mock('@/context/CartContext', () => ({ useCart: () => ({ addItem: jest.fn(), items: [], total: 0, count: 0 }) }))
jest.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => ({ settings: { enableCheckout: true, enableWallet: true } }) }))

const baseProduct: Product = {
  id: '1',
  title: 'Test Product',
  description: 'A test product description',
  price: 29.99,
  type: 'PRODUCT',
  category: 'Electronics',
  condition: 'NEW',
  location: 'New York',
  locationDetails: null,
  latitude: null,
  longitude: null,
  isGlobal: false,
  isRemote: false,
  imageUrl: 'https://example.com/img.jpg',
  published: true,
  pinned: false,
  paymentMethods: 'Cash,Venmo',
  paymentType: 'BOTH',
  acceptsRequests: false,
  acceptsOffers: true,
  requestPrice: null,
  rentalDaily: null,
  rentalWeekly: null,
  rentalMonthly: null,
  rentalDeposit: null,
  rentalMinDays: 1,
  rentalMaxDays: null,
  rentalAvailable: true,
  sellerPayoutAddress: null,
  sellerCryptoCurrency: null,
  userId: 'user1',
  user: { name: 'SellerName', shopSlug: 'test-shop' },
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

describe('ProductCard', () => {
  it('renders product title and price', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
  })

  it('renders type badge PROD', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('PROD')).toBeInTheDocument()
  })

  it('renders condition badge', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('renders service type badge', () => {
    const svc = { ...baseProduct, type: 'SERVICE', price: 50 }
    render(<ProductCard product={svc} />)
    expect(screen.getByText('SVC')).toBeInTheDocument()
  })

  it('renders rental type and daily price', () => {
    const rental = { ...baseProduct, type: 'RENTAL', price: null, rentalDaily: 15 }
    render(<ProductCard product={rental} />)
    expect(screen.getByText('RENT')).toBeInTheDocument()
    expect(screen.getByText('$15')).toBeInTheDocument()
  })

  it('shows Free for null price', () => {
    const free = { ...baseProduct, price: null }
    render(<ProductCard product={free} />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('shows Featured badge when pinned', () => {
    const pinned = { ...baseProduct, pinned: true }
    render(<ProductCard product={pinned} />)
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('renders seller name', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText(/SellerName/)).toBeInTheDocument()
  })

  it('renders location', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText(/New York/)).toBeInTheDocument()
  })

  it('shows Global for global products', () => {
    const global = { ...baseProduct, isGlobal: true, location: null }
    render(<ProductCard product={global} />)
    expect(screen.getByText(/Global/)).toBeInTheDocument()
  })

  it('calls onQuickView when quick view button clicked', () => {
    const onQV = jest.fn()
    render(<ProductCard product={baseProduct} onQuickView={onQV} />)
    const buttons = screen.getAllByTitle('Quick view')
    fireEvent.click(buttons[0])
    expect(onQV).toHaveBeenCalledWith(baseProduct)
  })

  it('renders add to cart button with price', () => {
    render(<ProductCard product={baseProduct} />)
    const cartBtn = screen.getByTitle('Add to cart')
    expect(cartBtn).toBeInTheDocument()
    expect(cartBtn).not.toBeDisabled()
  })

  it('shows description in grid mode but not in list mode', () => {
    const { container: gridContainer } = render(<ProductCard product={baseProduct} viewMode="grid" />)
    expect(gridContainer.textContent).toContain('A test product description')

    const { container: listContainer } = render(<ProductCard product={baseProduct} viewMode="list" />)
    expect(listContainer.textContent).not.toContain('A test product description')
  })
})
