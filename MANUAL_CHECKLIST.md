# XistrYmemZ Manual Verification Checklist

## Authentication & User Management

### Login Page (`/auth/login`)
- [ ] Can access login page without being logged in
- [ ] Shows validation error for empty fields
- [ ] Shows error for invalid credentials
- [ ] Successfully logs in with valid credentials
- [ ] Redirects to dashboard after login
- [ ] "Remember me" checkbox works
- [ ] Link to register page works

### Registration Page (`/auth/register`)
- [ ] Can access register page without being logged in
- [ ] Shows validation errors for:
  - [ ] Empty email
  - [ ] Invalid email format
  - [ ] Empty password
  - [ ] Password too short (< 6 chars)
  - [ ] Empty name
- [ ] Rejects duplicate email registration
- [ ] Successfully creates account with valid data
- [ ] Redirects to onboarding after registration

### Onboarding (`/onboarding`)
- [ ] Shows welcome step first
- [ ] Profile step allows adding:
  - [ ] Display name
  - [ ] Bio
  - [ ] Multiple locations (add/delete/set primary)
  - [ ] Search radius selection
- [ ] First plan step creates a draft plan
- [ ] Community step shows quick links
- [ ] Complete step shows success message
- [ ] Skip button works on optional steps
- [ ] Back button navigates correctly
- [ ] Progress bar updates correctly

---

## Dashboard & Profile

### Dashboard (`/dashboard`)
- [ ] Shows user's plans
- [ ] Shows recent activity
- [ ] Quick action buttons work
- [ ] Navigation links are correct

### Profile (`/profile/[username]`)
- [ ] Displays user information
- [ ] Shows user's public plans
- [ ] Shows user's products
- [ ] Edit profile button (own profile only)
- [ ] Connection request button (other profiles)

### Profile Settings (`/profile/settings`)
- [ ] Can update display name
- [ ] Can update bio
- [ ] Can update location
- [ ] Can update profile image
- [ ] Can change password
- [ ] Shows success message after save

---

## Plans & Projects

### Plans List (`/plans`)
- [ ] Shows all public plans
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Create new plan button works

### My Plans (`/dashboard/plans`)
- [ ] Shows user's plans
- [ ] Filter by status (draft, active, completed)
- [ ] Edit button works
- [ ] Delete button works with confirmation

### Plan Detail (`/plans/[id]`)
- [ ] Shows plan details
- [ ] Shows goals and mileposts
- [ ] Can add updates
- [ ] Can add comments
- [ ] Join/Leave button works
- [ ] Edit button (owner only)
- [ ] Shows plan members
- [ ] Can create requests for plan

### Create/Edit Plan (`/plans/new`, `/plans/[id]/edit`)
- [ ] Title is required
- [ ] Description is optional
- [ ] Can set status
- [ ] Can add goals
- [ ] Can add mileposts
- [ ] Save button creates/updates plan
- [ ] Cancel button returns to previous page

---

## Requests System

### Requests List (`/requests`, `/requests/public`)
- [ ] Shows all requests
- [ ] Filter by category works
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Create request button works

### Request Detail (`/requests/[id]`)
- [ ] Shows request details
- [ ] Shows comments
- [ ] Can add comment
- [ ] Can edit (owner only)
- [ ] Can delete with confirmation
- [ ] Shows linked plan/product if any

### Create Request (`/requests/new`)
- [ ] Can link to plan
- [ ] Can link to product
- [ ] Title is required
- [ ] Description is optional
- [ ] Can set budget
- [ ] Can set priority
- [ ] Can set category
- [ ] Submit creates request

---

## Marketplace & Products

### Products List (`/products`, `/dashboard/marketplace`)
- [ ] Shows all products
- [ ] Filter by type (product/service)
- [ ] Filter by category
- [ ] Filter by location
- [ ] Search works
- [ ] Map view toggles correctly
- [ ] Add to cart works
- [ ] Make offer button works

### Product Detail (`/products/[id]`)
- [ ] Shows product details
- [ ] Shows seller info
- [ ] Shows payment methods accepted
- [ ] Add to cart works
- [ ] Make offer works
- [ ] Contact seller works
- [ ] Shows related products

### Shop Setup (`/shop/setup`)
- [ ] Template selection works
- [ ] Multi-step wizard shows correct steps
- [ ] Progress bar updates
- [ ] Shop profile step:
  - [ ] Name is required
  - [ ] Can upload image
  - [ ] Can paste image URL
  - [ ] About section works
- [ ] Products step:
  - [ ] Can add new product
  - [ ] Can edit existing product
  - [ ] Can delete product
  - [ ] Can publish/unpublish
  - [ ] Sample products import works (with template)
- [ ] Payment setup step shows info
- [ ] Review step shows all details
- [ ] Publish creates shop

### My Products (`/dashboard/marketplace`)
- [ ] Shows user's products
- [ ] Can edit products
- [ ] Can delete products
- [ ] Can toggle publish status
- [ ] Shows sales/orders

---

## Schools & Education

### Schools List (`/schools`)
- [ ] Shows all schools
- [ ] Search functionality works
- [ ] Filter by category

### School Detail (`/school/[slug]`)
- [ ] Shows school information
- [ ] Shows content list
- [ ] Can enroll in paid content
- [ ] Can access free content
- [ ] Shows instructor info

### School Setup (`/school/setup`)
- [ ] Template selection works
- [ ] Multi-step wizard works
- [ ] School profile step:
  - [ ] Name is required
  - [ ] About section works
  - [ ] Cover image works
- [ ] Content step:
  - [ ] Sample content import works
  - [ ] Info about adding content later
- [ ] Pricing step shows info
- [ ] Review step shows all details
- [ ] Publish creates school

---

## Community Features

### Community Page (`/community`)
- [ ] Shows member directory
- [ ] Search members works
- [ ] Filter by location works
- [ ] Shows forum categories
- [ ] Recent posts displayed

### Forum (`/community/forum`)
- [ ] Shows all posts
- [ ] Filter by category
- [ ] Create post button works
- [ ] Search posts works

### Forum Post (`/community/forum/[id]`)
- [ ] Shows post content
- [ ] Shows replies
- [ ] Can reply to post
- [ ] Poll voting works (if poll)
- [ ] Can edit post (owner)
- [ ] Can delete post with confirmation

### Groups (`/groups`)
- [ ] Shows all groups
- [ ] Create group button works
- [ ] Search groups works
- [ ] Join/Leave button works

### Group Detail (`/groups/[id]`)
- [ ] Shows group info
- [ ] Shows members
- [ ] Shows posts
- [ ] Can post in group
- [ ] Admin controls visible to admins only

---

## Events

### Events List (`/events`)
- [ ] Shows upcoming events
- [ ] Filter by type
- [ ] Search events
- [ ] Create event button works

### Event Detail (`/events/[id]`)
- [ ] Shows event details
- [ ] Shows location on map
- [ ] Join/Leave button works
- [ ] Shows attendees
- [ ] Can edit (organizer only)

### Create Event (`/events/new`)
- [ ] Title is required
- [ ] Date/time selection works
- [ ] Location works with map
- [ ] Can set online/hybrid
- [ ] Can create tickets
- [ ] Submit creates event

---

## Courier Services

### Courier Setup (`/courier/setup`)
- [ ] Template selection works
- [ ] Multi-step wizard works
- [ ] Service details step:
  - [ ] Name is required
  - [ ] Service type selection works
  - [ ] Description works
- [ ] Coverage areas step:
  - [ ] Can set service areas
  - [ ] Max distance works
- [ ] Pricing step:
  - [ ] Base price is required
  - [ ] Price per mile works
- [ ] Review step shows all details
- [ ] Submit creates service
- [ ] Can edit existing service
- [ ] Can delete service
- [ ] Can toggle active/paused

---

## Messaging

### Messages List (`/messages`)
- [ ] Shows all conversations
- [ ] Unread indicator shows
- [ ] Click conversation opens messages
- [ ] New message button works

### Conversation (`/messages/[id]`)
- [ ] Shows message history
- [ ] Can send new message
- [ ] Messages appear in real-time
- [ ] Can delete conversation

---

## Wallet & Payments

### Wallet (`/wallet`)
- [ ] Shows balance
- [ ] Shows transaction history
- [ ] Deposit button works
- [ ] Withdraw button works (if enabled)
- [ ] Connect Tari wallet works

### Escrow (`/escrow`)
- [ ] Shows active escrow transactions
- [ ] Can create escrow payment
- [ ] Can release funds (seller)
- [ ] Can confirm receipt (buyer)
- [ ] Shows escrow history

---

## Admin Panel

### Admin Dashboard (`/admin`)
- [ ] Accessible only to admins
- [ ] Shows platform statistics
- [ ] Quick links to management sections

### User Management (`/admin/users`)
- [ ] Shows all users
- [ ] Can search users
- [ ] Can edit user details
- [ ] Can ban/suspend users
- [ ] Can verify users

### Order Management (`/admin/orders`)
- [ ] Shows all orders
- [ ] Can filter by status
- [ ] Can update order status
- [ ] Can view order details

### Site Settings (`/admin/settings`)
- [ ] Can update site settings
- [ ] Changes reflect on site
- [ ] Can manage invite codes

---

## General Features

### Search (`/search`)
- [ ] Global search works
- [ ] Searches plans, products, users, posts
- [ ] Results are categorized
- [ ] Click result navigates correctly

### Notifications (`/notifications`)
- [ ] Shows all notifications
- [ ] Unread notifications highlighted
- [ ] Can mark as read
- [ ] Can delete notifications
- [ ] Real-time notifications work

### Theme & UI
- [ ] Dark theme is default
- [ ] All buttons have hover states
- [ ] Forms show validation errors
- [ ] Success/error toasts appear
- [ ] Responsive design works (test at 768px, 1024px)
- [ ] All links navigate correctly
- [ ] Back buttons work
- [ ] Loading states show during API calls

---

## Browser Compatibility

- [ ] Chrome - full functionality
- [ ] Firefox - full functionality
- [ ] Safari - full functionality
- [ ] Mobile Chrome - responsive layout works
- [ ] Mobile Safari - responsive layout works

---

## Performance

- [ ] Pages load within 2 seconds
- [ ] Images are optimized
- [ ] No console errors on page load
- [ ] API responses are fast (< 500ms)
- [ ] Infinite scroll/load more works (if applicable)

---

## Security

- [ ] Protected routes redirect to login
- [ ] Users can only edit own content
- [ ] API validates user permissions
- [ ] Passwords are hashed
- [ ] HTTPS enforced (production)
- [ ] Rate limiting works
