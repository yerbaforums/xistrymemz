import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-item">
          {item.href ? (
            <Link href={item.href} className="breadcrumb-link" title={item.label}>
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current" title={item.label}>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="breadcrumb-sep" aria-hidden="true"> / </span>}
        </span>
      ))}
    </nav>
  )
}