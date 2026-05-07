# Development Priority List

> Generated from comprehensive site architecture review. Prioritized by impact and urgency.

---

## High Priority

### 1. Implement Consistent API Response Format
- **Issue**: API routes return inconsistent formats (`{ error }`, `{ success: true }`, raw data)
- **Solution**: Create standard envelope `{ success: boolean, data?: T, error?: string }`
- **Files to create**: `src/lib/api-helpers.ts`
- **Impact**: Makes frontend error handling predictable, reduces bugs

### 2. Create `requireAdmin()` Helper
- **Issue**: Admin checks duplicated across 30+ API routes with different patterns
- **Solution**: Single helper function with consistent 401/403 responses
- **Example**:
  ```typescript
  export async function requireAdmin(session: Session | null) {
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }
    if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 }
    return null
  }
  ```

### 3. Add React Error Boundary
- **Issue**: No error boundaries exist; crashes show blank screens
- **Solution**: Add `ErrorBoundary` component to wrap major sections
- **Files to create**: `src/components/ErrorBoundary.tsx`
- **Usage**: Wrap dashboard, marketplace, community sections

### 4. Reduce 166 `any` Type Usage
- **Issue**: 166 instances of `any` type, primarily in API routes
- **Solution**: Enable `@typescript-eslint/no-explicit-any` rule, create proper Prisma types
- **First targets**: `src/app/api/admin/users/route.ts`, `where: any = {}` patterns

---

## Medium Priority

### 5. Create Service Layer
- **Move business logic out of API routes**
- Create: `src/services/productService.ts`, `src/services/eventService.ts`, `src/services/walletService.ts`
- API routes should only handle HTTP concerns (request/response)

### 6. Add `withAuth()` Wrapper
- **Reduce boilerplate** in API routes
- Wrap handlers with automatic session checking
- Pattern: `export const GET = withAuth(async (req, session) => { ... })`

### 7. Request Validation Middleware
- **Use Zod schemas consistently** across all API routes
- Create middleware that validates request body against schema
- Return structured validation errors

### 8. Enable Stricter ESLint Rules
```javascript
'@next/next/no-img-element': 'warn',
'react-hooks/exhaustive-deps': 'warn',
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unused-vars': 'error'
```

### 9. Centralize TypeScript Types
- Create `src/types/` directory
- Move domain types: `Product.ts`, `User.ts`, `Event.ts`, `Request.ts`
- Reuse across frontend components and API routes

### 10. Performance Optimizations
- Add `useMemo` for filtered/sorted lists (PublicPlansClient, EventsPage)
- Add `useCallback` for function props passed to child components
- Add `React.memo()` to frequently-rendered components

### 11. CSS Standardization
- Pick one pattern: CSS modules for components, globals only for design tokens
- Remove mixed Tailwind-like utility classes from `globals.css`
- Document CSS naming conventions

### 12. Expand Test Coverage
- Currently only 6 API test files
- Add React Testing Library for components
- Test hooks: `useCart`, `useToast`, `useSiteSettings`
- Target: 60%+ coverage on critical paths

### 13. Database Transactions
- Use `$transaction()` for multi-step operations
- Affected: order creation, wallet transfers, event join/leave
- Prevents partial state on failure

---

## Low Priority

### 14. Proper Error Handling with `AppError`
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message)
  }
}
```

### 15. Health Check Endpoint
- Add `/api/health` for monitoring
- Check database connectivity, return status

### 16. Bundle Optimization
- Use `@next/bundle-analyzer` to identify large dependencies
- Add `dynamic()` imports for heavy components (charts, editors)
- Optimize Leaflet bundle size

### 17. Accessibility Improvements
- Add `role="navigation"` to nav elements
- Add `role="main"` to main content areas
- Test with axe-core for compliance
- Keyboard navigation for all interactive elements

### 18. Environment Validation
- Use Zod to validate `process.env` at startup
- Fail fast with clear error messages for missing required vars

### 19. Logging Framework
- Replace `console.error` with Winston/Pino
- Add correlation IDs for request tracking
- Structured logging for debugging

### 20. API Versioning
- Implement `/api/v1/` strategy
- Plan for backward compatibility
- Document API changes

---

## Patterns to Standardize

| Pattern | Current | Target |
|---------|---------|--------|
| API Responses | Inconsistent | `{ success, data, error }` |
| Admin Checks | Inline duplication | `requireAdmin()` |
| Validation | Good (Zod) | Apply to ALL routes |
| Error Handling | try/catch per route | Error handler wrapper |
| Exports | Mixed default/named | Named exports |
| CSS | Modules + global utils | Standardize per type |

---

## Security Notes

### Current Strengths
- ✅ bcryptjs password hashing
- ✅ Rate limiting in middleware
- ✅ Security headers in next.config.ts
- ✅ Zod validation
- ✅ Session-based auth with JWT

### Needs Improvement
- ⚠️ File upload needs size/type validation
- ⚠️ Input sanitization for XSS
- ⚠️ CORS configuration
- ⚠️ Crypto key encryption audit

---

## Performance Notes

- ✅ Dynamic imports for Leaflet
- ❌ No `React.memo()` on any components
- ❌ No virtualization for long lists
- ⚠️ `useMemo` needed for filtered/sorted lists in PublicPlansClient.tsx
