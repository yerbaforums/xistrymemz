# ✅ COMPLETED — Drag-and-Drop Reordering for Donation Addresses

**File:** `src/app/profile/edit/page.tsx`

## Change 1 — Add handler function (after line 372, before `getSocialType`)

Insert this block between `handleDeleteDonation` and `getSocialType`:

```tsx
const handleReorderDonations = async (draggedIndex: number, targetIndex: number) => {
  const newAddresses = [...donationAddresses]
  const [draggedItem] = newAddresses.splice(draggedIndex, 1)
  newAddresses.splice(targetIndex, 0, draggedItem)
  setDonationAddresses(newAddresses)

  for (let i = 0; i < newAddresses.length; i++) {
    if (newAddresses[i].sortOrder !== i) {
      await fetch(`/api/users/donations/${newAddresses[i].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: i })
      })
    }
  }
}
```

Same pattern as `handleReorderLinks` (lines 378-393).

## Change 2 — Add index param to map (line 770)

Change:
```tsx
{donationAddresses.map(da => {
```
To:
```tsx
{donationAddresses.map((da, index) => {
```

## Change 3 — Update donation card with DnD attributes and drag handle (lines 773-802)

Replace the opening `<div>` with DnD-enabled version, add drag handle before content.

**Before (line 773):**
```tsx
              <div key={da.id} style={{display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border-color)'}}>
                <div style={{flex: 1}}>
```

**After:**
```tsx
              <div
                key={da.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                  if (draggedIndex !== index) handleReorderDonations(draggedIndex, index)
                }}
                style={{display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border-color)', cursor: 'grab'}}
              >
                <div style={{width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', marginTop: '2px'}} title="Drag to reorder">
                  ⠿
                </div>
                <div style={{flex: 1}}>
```

## Verification

Run `npx tsc --noEmit --pretty` to check for TypeScript errors.
