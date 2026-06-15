export function JSONLD({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function WebSiteLD() {
  return (
    <JSONLD
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'XistrYmemZ',
        url: 'https://xistrymemz.xyz',
        description: 'The cooperative platform for building, sharing, and growing together.',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: 'https://xistrymemz.xyz/search?q={search_term_string}' },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  )
}

export function OrganizationLD() {
  return (
    <JSONLD
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'XistrYmemZ',
        url: 'https://xistrymemz.xyz',
        logo: 'https://xistrymemz.xyz/logo.png',
        sameAs: [
          'https://github.com/yerbaforums/xistrymemz',
        ],
      }}
    />
  )
}

export function BreadcrumbLD({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JSONLD
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}

export function ProductLD({ product }: { product: { name: string; description?: string; image?: string; price?: number; url: string } }) {
  return (
    <JSONLD
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.image,
        url: product.url,
        ...(product.price ? {
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'USD',
          },
        } : {}),
      }}
    />
  )
}

export function EventLD({ event }: { event: { name: string; description?: string; startDate: string; location?: string; url: string; image?: string } }) {
  return (
    <JSONLD
      data={{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        url: event.url,
        ...(event.location ? { location: { '@type': 'Place', name: event.location } } : {}),
        ...(event.image ? { image: event.image } : {}),
      }}
    />
  )
}
