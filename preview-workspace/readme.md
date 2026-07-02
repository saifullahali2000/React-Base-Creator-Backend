## Newspaper E-commerce

Build a **Newspaper E-commerce** application using React that displays a collection of newspapers and allows users to search, view details, and add items to a shopping cart.

### Demo Video

<div style="text-align: center; margin: 24px 0;">
  <video style="max-width:100%; box-shadow: 0 2.8px 2.2px rgba(0, 0, 0, 0.12);" loop="true" autoplay="autoplay" controls="controls" muted>
    <source src="https://assets.ccbp.in/frontend/content/react-js/placeholder-demo-video.mp4" type="video/mp4">
  </video>
</div>

### Design Files

No design files are provided. Create a modern, professional, and responsive UI following contemporary design standards with proper spacing, typography, color scheme, and layout hierarchy.

### Setup Instructions

- The project uses **React 19**, **react-router-dom v7**, and **js-cookie v3**.
- All necessary dependencies are pre-configured.
- Focus on implementing the application logic and user interface.

### Completion Instructions

#### Functionality

Implement the following features:

**Newspaper Display**

- Display all 10 newspapers from the provided dataset on initial load.
- Each newspaper card should show:
  - **Title**
  - **Author**
  - **Published Date** (formatted)
  - **Category**
  - **Image**
  - **"Add to Cart" button**

**Search Functionality**

- Provide a search input field that filters newspapers by **title**.
- Searching should be case-insensitive.
- If no newspapers match the search query, display: **"No newspapers found matching your search."**
- Clearing the search input should restore the full list of newspapers.

**Add to Cart**

- Clicking the **"Add to Cart"** button should:
  - Add the newspaper's **title** and **author** to the cart.
  - Change the button text to **"Added to Cart"**.
  - Prevent duplicate additions (clicking "Added to Cart" again should have no effect).
- The cart section should be displayed at the **bottom of the page** (visible after scrolling).
- The cart should display:
  - The **total count** of items.
  - Each cart item showing the newspaper **title** and **author**.

**State Management**

- **Do NOT use React Context API**.
- Manage state using component-level `useState` and pass data via props.

#### Data

Use the following newspaper articles array in your application:

```javascript
const articles = [
  {
    id: '1',
    title: 'Global Leaders Convene for Historic Climate Summit in Geneva',
    author: 'Priya Mehta',
    publishedDate: '2026-04-08',
    category: 'World',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  },
  {
    id: '2',
    title: "India's Tech Startups See Record $18 Billion Investment in Q1 2026",
    author: 'Arjun Sharma',
    publishedDate: '2026-04-07',
    category: 'Business',
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
  },
  {
    id: '3',
    title: 'Scientists Discover New Deep-Sea Species Off Coast of Andaman Islands',
    author: 'Ravi Krishnamurthy',
    publishedDate: '2026-04-06',
    category: 'Science',
    imageUrl: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
  },
  {
    id: '4',
    title: 'Mumbai Metro Line 9 Set to Open Ahead of Schedule This June',
    author: 'Sneha Patil',
    publishedDate: '2026-04-05',
    category: 'City',
    imageUrl: 'https://images.unsplash.com/photo-1581262208435-41726149a759?w=800&q=80',
  },
  {
    id: '5',
    title: 'India Wins Test Series Against Australia 3–1 in Historic Comeback',
    author: 'Kiran Bose',
    publishedDate: '2026-04-04',
    category: 'Sports',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
  },
  {
    id: '6',
    title: 'New AI Model Outperforms Doctors in Early Cancer Detection Study',
    author: 'Dr. Ananya Iyer',
    publishedDate: '2026-04-03',
    category: 'Health',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  },
  {
    id: '7',
    title: 'Budget 2026: Middle-Class Tax Relief and Green Energy Subsidies Headline Proposals',
    author: 'Meghna Rao',
    publishedDate: '2026-04-02',
    category: 'Economy',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  },
  {
    id: '8',
    title: "Cannes 2026: Indian Films Dominate with Three Official Selections",
    author: 'Tara Srinivasan',
    publishedDate: '2026-04-01',
    category: 'Culture',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
  },
  {
    id: '9',
    title: 'NATO Expands Eastern Flank with New Rapid-Response Brigade',
    author: 'Aleksandra Nowak',
    publishedDate: '2026-03-31',
    category: 'World',
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
  },
  {
    id: '10',
    title: 'South China Sea Tensions Ease as ASEAN Brokered Talks Resume',
    author: 'Lin Mei Shan',
    publishedDate: '2026-03-29',
    category: 'World',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  },
];
```

#### Components Structure

Create the following component structure:

- **App** (main component managing state)
  - **NewspaperCard** (reusable component for each newspaper)
  - **Cart** (displays cart items at the bottom)

#### Important Notes

- Use **functional components** and **React Hooks**.
- All images should render correctly from the provided URLs.
- The cart must remain fixed or positioned at the bottom of the page, visible after scrolling.
- Button states ("Add to Cart" vs "Added to Cart") must update immediately on user interaction.
- Ensure the application is responsive and works well on both desktop and mobile devices.

### Additional Test-Critical Requirements

- The search input must have a placeholder text containing "Search by title".
- When no newspapers match a search, the exact text **"No newspapers found matching your search."** must be displayed.
- The cart title must display the count in the format: **"Shopping Cart (n)"** where n is the number of items.
- All "Add to Cart" buttons must have the exact text **"Add to Cart"** initially.
- After adding to cart, the button text must change to exactly **"Added to Cart"**.
- Author names must be prefixed with "By" in the newspaper cards and cart items.
- Published dates should be formatted using `toLocaleDateString` for consistent display.

### Test Contract

<details>
<summary>Click to view</summary>

- The page should render all 10 newspapers with their titles, authors, published dates, and categories on initial load
- When a user types "Climate" in the search input, the page should display only newspapers with titles containing "Climate"
- When a user searches for "xyz123nonexistent", the page should display "No newspapers found matching your search."
- When the search input is cleared, the page should display all newspapers again
- When the "Add to Cart" button is clicked for a newspaper, that newspaper should be added to the cart section
- When the "Add to Cart" button is clicked for a newspaper, the button text should change to "Added to Cart"
- When the "Added to Cart" button is clicked again, the newspaper should not be added to the cart a second time
- The cart section should display the title and author of each newspaper added to the cart
- When multiple "Add to Cart" buttons are clicked, all selected newspapers should appear in the cart section
- The cart section should be rendered at the bottom of the page and display the total number of items in the cart

</details>
