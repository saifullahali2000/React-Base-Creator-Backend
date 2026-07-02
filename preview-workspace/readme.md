## Transaction Manager Application

Build a complete, responsive transaction management system with user authentication, data fetching, filtering, and sorting capabilities.

### Project Overview

Create a modern web application that allows users to:

- Log in securely using the provided authentication API
- View a list of transactions fetched dynamically from the API
- Filter transactions by customer name and category
- Sort transactions by date (newest/oldest first)
- View transaction statistics (total count, total amount, completed count, pending count)
- Navigate between login and transactions pages
- Logout functionality

### Technical Requirements

**Stack:**
- React 19
- react-router-dom v7
- js-cookie v3 for JWT token management
- Fetch API for HTTP requests

**Architecture:**
- Component-based structure with reusable components
- Context API for authentication state management
- Separate API layer for authentication and transactions
- Protected routes for authenticated pages
- Responsive design for mobile and desktop

### API Integration

#### Authentication API

**Endpoint:** `https://mi767o4rag.execute-api.eu-north-1.amazonaws.com/api/auth/signin`

**Method:** POST

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "jwttoken": "<jwt_token_string>",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

**Error Response (401):**
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Invalid credentials"
}
```

**Implementation Notes:**
- Store the JWT token in a cookie named `jwt_token` using js-cookie
- Store user information in localStorage or context
- Redirect to transactions page on successful login
- Display appropriate error messages for failed login attempts

#### Transactions API

**Endpoint:** `https://mi767o4rag.execute-api.eu-north-1.amazonaws.com/api/transactions`

**Method:** GET

**Request Headers:**
```
Authorization: <jwt_token_value>
```

**Note:** Send the raw JWT token value without a "Bearer" prefix.

**Query Parameters (all optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Filter by customer name (case-insensitive substring match) |
| `category` | string | Filter by category (exact match) |
| `sort` | string | `date_desc` for Newest First, `date_asc` for Oldest First |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "TXN-001",
        "customer": "Alice Johnson",
        "date": "2024-01-15",
        "category": "Electronics",
        "amount": "250.00",
        "status": "Completed"
      }
    ],
    "total": 1
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to load transactions."
}
```

**Implementation Notes:**
- Fetch transactions on component mount and when filters change
- Handle loading, success, and error states
- Display appropriate UI for each state
- Calculate statistics dynamically from the response data

### Feature Requirements

#### 1. Authentication
- Login page with email and password fields
- Form validation (email format, required fields)
- Display loading state during login
- Show error messages for failed login attempts
- Store JWT token in cookie and user data in localStorage
- Protected routes that redirect to login if not authenticated
- Logout functionality that clears token and user data

#### 2. Transactions List
- Fetch and display all transactions from the API
- Show transaction details: ID, customer name, date, category, amount, status
- Display statistics calculated from API data:
  - Total number of transactions
  - Total amount (sum of all transaction amounts)
  - Number of completed transactions
  - Number of pending transactions
- Responsive table layout
- Handle empty state when no transactions match filters

#### 3. Filtering and Sorting
- Search by customer name (triggers API call with `name` parameter)
- Filter by category dropdown (triggers API call with `category` parameter)
- Sort by date (newest/oldest first, triggers API call with `sort` parameter)
- Update results dynamically when filters change

#### 4. UI/UX Requirements
- Modern, clean, and professional design
- Responsive layout (mobile, tablet, desktop)
- Loading indicators for async operations
- Error messages with retry option
- Status badges with appropriate colors (Completed: green, Pending: yellow, Failed: red)
- Smooth transitions and hover effects
- Accessible forms and buttons

### Component Structure

```
src/
├── App.jsx                          # Main app with routing
├── App.css                          # App-level styles
├── index.css                        # Global styles and CSS variables
├── components/
│   ├── Login/
│   │   ├── index.jsx               # Login component
│   │   └── index.css               # Login styles
│   ├── Transactions/
│   │   ├── index.jsx               # Transactions list component
│   │   └── index.css               # Transactions styles
│   ├── Header/
│   │   ├── index.jsx               # Header with logout
│   │   └── index.css               # Header styles
│   └── ProtectedRoute/
│       └── index.jsx                # Route protection wrapper
├── context/
│   └── AuthContext.jsx              # Authentication context
└── api/
    ├── auth.js                      # Authentication API calls
    └── transactions.js              # Transactions API calls
```

### Completion Criteria

1. User can log in with valid credentials
2. Invalid login attempts show appropriate error messages
3. Authenticated users are redirected to transactions page
4. Unauthenticated users are redirected to login page
5. Transactions are fetched from the API and displayed in a table
6. Statistics are calculated dynamically from API data
7. Search, filter, and sort functionality work correctly and trigger API calls
8. All loading and error states are handled gracefully
9. User can log out and is redirected to login page
10. Application is fully responsive across devices
11. Code follows clean code practices with proper separation of concerns
12. No hardcoded data for transactions or statistics

### Testing Your Application

Before submitting, verify:

- Login works with valid credentials
- Protected routes redirect to login when not authenticated
- Transactions load correctly after login
- Search, filter, and sort update the transaction list via API calls
- Statistics update based on filtered results
- Logout clears authentication and redirects to login
- Application is responsive on mobile and desktop
- All error states display helpful messages
- Loading states show appropriate indicators

Good luck building your Transaction Manager application!
