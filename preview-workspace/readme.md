## Newspaper E-commerce — Single Page Application
In this project, let's build a **Newspaper E-commerce Application** that allows users to browse newspaper articles, search by title, and add them to a reading cart.
**Refer to the below video.**
<video width="320" height="240" controls>
<source src="" type="video/mp4">
  Your browser does not support the video tag.
</video>

<br/>
### Design Files
<details>
<summary>Click to view</summary>
<br/>

- Home Route (`/`)

</details>
### Set Up Instructions
<details>
<summary>Click to view</summary>
<br/>

- Download dependencies by running `npm install`
- Start up the app using `npm run dev`

</details>
### Completion Instructions
<details>
<summary>Functionality to be added</summary>
<br/>

The app must have the following functionalities:

**Data Source & Pre-filled Code**

- The application uses a local JSON file `src/products.js` containing 10 newspaper article objects as the data source (pre-filled code — do not remove)
- Each article object contains: `id`, `title`, `summary`, `content`, `author`, `publishedDate`, `category`, `imageUrl`, and `section`
- The articles array must be imported directly: `import articles from './products.js'`
- The 10 articles in the data source are:
  1. "Global Leaders Convene for Historic Climate Summit in Geneva" — By Priya Mehta — World — 2026-04-08
  2. "India's Tech Startups See Record $18 Billion Investment in Q1 2026" — By Arjun Sharma — Business — 2026-04-07
  3. "Scientists Discover New Deep-Sea Species Off Coast of Andaman Islands" — By Ravi Krishnamurthy — Science — 2026-04-06
  4. "Mumbai Metro Line 9 Set to Open Ahead of Schedule This June" — By Sneha Patil — City — 2026-04-05
  5. "India Wins Test Series Against Australia 3–1 in Historic Comeback" — By Kiran Bose — Sports — 2026-04-04
  6. "New AI Model Outperforms Doctors in Early Cancer Detection Study" — By Dr. Ananya Iyer — Health — 2026-04-03
  7. "Budget 2026: Middle-Class Tax Relief and Green Energy Subsidies Headline Proposals" — By Meghna Rao — Economy — 2026-04-02
  8. "Cannes 2026: Indian Films Dominate with Three Official Selections" — By Tara Srinivasan — Culture — 2026-04-01
  9. "NATO Expands Eastern Flank with New Rapid-Response Brigade" — By Aleksandra Nowak — World — 2026-03-31
  10. "South China Sea Tensions Ease as ASEAN Brokered Talks Resume" — By Lin Mei Shan — World — 2026-03-29

**Page Layout & Structure**

- The page must display a header section containing:
  - Main heading: `<h1>` with text **"Newspaper E-commerce"**
  - Subtitle: **"Browse and add newspapers to your reading cart"**
- Below the header, render a search section with:
  - Label: **"SEARCH NEWSPAPERS"**
  - Input field with placeholder: **"Search by title..."**
  - Clear button (×) that appears only when the search input has a non-empty value
- The main content area must use a split layout:
  - **Left side (75% width on desktop):** newspapers grid displaying all article cards
  - **Right side (25% width on desktop):** cart sidebar with heading "Reading Cart", count badge, and list of added newspapers
- The cart sidebar must have sticky position (`position: sticky; top: 0;`) so it stays visible when scrolling
- The cart sidebar must have minimum width of 340px on desktop and full width on mobile
- On mobile/tablet viewports (below 1024px), the layout should stack vertically with cart sidebar appearing below the grid

**Newspaper Cards**

- All 10 newspaper articles must be rendered as cards in the grid by default (before any search filtering)
- Each newspaper article must be rendered as a card using `<article>` semantic element displaying:
  - **Article image** with `alt` attribute matching the article title exactly
  - **Category badge** positioned absolutely over the top-right corner of the image showing the exact category text ("World", "Business", "Science", "City", "Sports", "Health", "Economy", "Culture")
  - **Article title** as an `<h3>` heading (limited to 2 lines with ellipsis)
  - **Author name** prefixed with "By" — format: **"By [Author Name]"** (e.g. "By Priya Mehta", "By Arjun Sharma")
  - **Published date** formatted as "Month Day, Year" using `new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`
  - **Summary text** (limited to 3 lines with ellipsis)
  - **"Add to Cart" button** at the bottom of the card
- The cards must be displayed in a responsive grid:
  - **Desktop:** 3-4 columns using `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
  - **Tablet:** 2 columns
  - **Mobile:** 1 column
- Each card must have hover effects: slight upward translation (`transform: translateY(-4px)`) and enhanced box shadow

**Search Functionality**

- When the user types in the search input, the newspapers grid must update **in real-time** to display only articles whose **titles** contain the search query
- The search must be **case-insensitive** — filter using `article.title.toLowerCase().includes(searchQuery.toLowerCase())`
- The search input must be a **controlled component** managed by React state — `value={searchQuery}` and `onChange={(e) => setSearchQuery(e.target.value)}`
- The search input value must update on every keystroke
- When the search input has a non-empty value, a **clear button (×)** must appear on the right side with `aria-label="Clear search"`
- Clicking the clear button must:
  - Set the search query to an empty string
  - Restore all 10 newspapers to the grid
  - Hide the clear button
- If no newspapers match the search query, display: **"No newspapers found matching your search."**
- Search filtering must work correctly for queries like:
  - "climate", "india", "metro", "sea", "2026", "AI", "tech", "scientists", "series", "cancer", "budget", "energy", "cannes", "films", "nato", "flank", "asean", "tensions" → displays matching newspapers
  - "xyz123" → displays 0 results (empty state message)
  - "CLIMATE", "MuMbAi" (mixed case) → case-insensitive matching works

**Add to Cart Functionality**

- Each newspaper card must have an **"Add to Cart"** button (initial state)
- When the button is clicked:
  - Button text changes from **"Add to Cart"** to **"Added to Cart"**
  - Button becomes **disabled** (add `disabled` attribute)
  - Newspaper's `id`, `title`, and `author` added to cart state: `setCartItems(prev => [...prev, { id: article.id, title: article.title, author: article.author }])`
  - Cart count badge increments by 1
  - Cart sidebar displays the new item immediately
- The same newspaper must **not be added more than once** — check: `const isInCart = cartItems.some(item => item.id === article.id)`
- If `isInCart` is true, render button with text "Added to Cart" and `disabled` attribute
- Button state must persist across search filtering
- Cart state managed using **React `useState` hook** (NOT Context API, NOT localStorage)
- When newspapers are added, count badge displays the correct count: "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"

**Cart Sidebar**

- Cart sidebar rendered as `<aside>` semantic element with `role="complementary"`
- Sidebar displays header section with:
  - `<h2>` heading: **"Reading Cart"**
  - Count badge displaying exact number as **string**: "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
- Count badge always visible (even when 0) positioned next to or inside heading
- When cart is **empty** (`cartItems.length === 0`), display:
  - **"Your cart is empty"**
  - **"Add newspapers to start reading"**
- When cart contains newspapers, empty state not visible in DOM
- Display vertical list of cart items showing:
  - Newspaper **title** as `<h4>` (limited to 2 lines with ellipsis)
  - **Author name**: **"By [Author Name]"**
- Each cart item has light background, border, padding, border-radius, hover effect
- Sidebar **scrollable** when list exceeds height (`max-height` and `overflow-y: auto`)
- Items displayed in order added

**State Management & Component Architecture**

- Use React **`useState`** in `App` component to manage:
  - `searchQuery` (string) — current search input value
  - `cartItems` (array) — newspapers added to cart: `[{ id, title, author }, ...]`
- **Do NOT use React Context API**
- **Do NOT persist cart in localStorage**
- Pass state values and handlers via **props** to child components
- `App` component should:
  - Import: `import articles from './products.js'`
  - Filter articles: `const filteredArticles = articles.filter(article => article.title.toLowerCase().includes(searchQuery.toLowerCase()))`
  - Define `handleAddToCart(article)` to add to `cartItems`
  - Pass filtered articles, cart items, and handlers to components via props
- Organize components in `src/components` directory

</details>
### Important Note
<details>
<summary>Click to view</summary>
<br/>

**The following instructions are required for the tests to pass**

- The pre-filled `src/products.js` file contains the articles array — **do not remove or modify this file**
- Import the articles array: `import articles from './products.js'`
- The main heading must be exactly **"Newspaper E-commerce"**
- The subtitle must be exactly **"Browse and add newspapers to your reading cart"**
- The search label must be exactly **"SEARCH NEWSPAPERS"**
- The search input placeholder must be exactly **"Search by title..."**
- The cart heading must be exactly **"Reading Cart"**
- The cart empty state main message must be exactly **"Your cart is empty"**
- The cart empty state hint must be exactly **"Add newspapers to start reading"**
- The no results message must be exactly **"No newspapers found matching your search."**
- Each cart item author must be prefixed with "By" — format: **"By [Author Name]"**
- Each newspaper card author must be prefixed with "By" — format: **"By [Author Name]"**
- The "Add to Cart" button text must be exactly **"Add to Cart"**
- After adding, button text must change to exactly **"Added to Cart"**
- The "Added to Cart" button must have the `disabled` attribute set to `true`
- The cart count badge must display the count as a **string**: **"0"**, **"1"**, **"2"**, **"3"**, **"4"**, **"5"**, **"6"**, **"7"**, **"8"**, **"9"**, **"10"**
- The cart count badge must be visible at all times (even when the count is "0")
- Each newspaper card image must have an `alt` attribute matching the article title exactly
- Category badges must display exact category text: "World", "Business", "Science", "City", "Sports", "Health", "Economy", "Culture"
- Use `<article>` semantic element for newspaper cards
- Use `<aside role="complementary">` for the cart sidebar
- Search must be case-insensitive using `.toLowerCase()` on both query and title
- The clear button (×) must have `aria-label="Clear search"`
- Clicking clear button must set search query to empty string and restore all newspapers
- Do NOT use React Context API — manage state via `useState` and props
- Do NOT persist cart state in localStorage
- Published dates must be formatted using `new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`
- All 10 newspapers must be rendered by default before any search filtering
- Cart items must preserve the order they were added
- Button state ("Added to Cart" + disabled) must persist across search filter changes

</details>
### Additional Test-Critical Requirements
<details>
<summary>Click to view</summary>
<br/>

Use these exact UI texts/behaviors to avoid test failures:

**Exact Text Matching (case-sensitive)**

- Main heading: **"Newspaper E-commerce"**
- Subtitle: **"Browse and add newspapers to your reading cart"**
- Search label: **"SEARCH NEWSPAPERS"**
- Search placeholder: **"Search by title..."**
- Cart heading: **"Reading Cart"**
- Empty cart main: **"Your cart is empty"**
- Empty cart hint: **"Add newspapers to start reading"**
- No results: **"No newspapers found matching your search."**
- Button initial: **"Add to Cart"**
- Button after add: **"Added to Cart"**

**Article Titles (must match exactly)**

1. **"Global Leaders Convene for Historic Climate Summit in Geneva"**
2. **"India's Tech Startups See Record $18 Billion Investment in Q1 2026"**
3. **"Scientists Discover New Deep-Sea Species Off Coast of Andaman Islands"**
4. **"Mumbai Metro Line 9 Set to Open Ahead of Schedule This June"**
5. **"India Wins Test Series Against Australia 3–1 in Historic Comeback"**
6. **"New AI Model Outperforms Doctors in Early Cancer Detection Study"**
7. **"Budget 2026: Middle-Class Tax Relief and Green Energy Subsidies Headline Proposals"**
8. **"Cannes 2026: Indian Films Dominate with Three Official Selections"**
9. **"NATO Expands Eastern Flank with New Rapid-Response Brigade"**
10. **"South China Sea Tensions Ease as ASEAN Brokered Talks Resume"**

**Author Names (must be prefixed with "By ")**

1. **"By Priya Mehta"**
2. **"By Arjun Sharma"**
3. **"By Ravi Krishnamurthy"**
4. **"By Sneha Patil"**
5. **"By Kiran Bose"**
6. **"By Dr. Ananya Iyer"**
7. **"By Meghna Rao"**
8. **"By Tara Srinivasan"**
9. **"By Aleksandra Nowak"**
10. **"By Lin Mei Shan"**

**Category Badges (exact text)**

- **"World"**, **"Business"**, **"Science"**, **"City"**, **"Sports"**, **"Health"**, **"Economy"**, **"Culture"**

**Cart Count Badge Values (must be strings, not numbers)**

- Initial count: **"0"**
- After 1st add: **"1"**
- After 2nd add: **"2"**
- After 3rd add: **"3"**
- After 4th add: **"4"**
- After 5th add: **"5"**
- After 6th add: **"6"**
- After 7th add: **"7"**
- After 8th add: **"8"**
- After 9th add: **"9"**
- After 10th add: **"10"**

**Search Query Test Cases**

- "climate" → 1 result
- "india" (lowercase) → 2 results
- "CLIMATE" (uppercase) → 1 result (case-insensitive)
- "MuMbAi" (mixed case) → 1 result (case-insensitive)
- "metro" → 1 result
- "sea" → 2 results
- "2026" → 4 results
- "AI" → 1 result
- "tech" → 1 result
- "scientists" → 1 result
- "series" → 1 result
- "cancer" → 1 result
- "budget" → 1 result
- "energy" → 1 result
- "cannes" → 1 result
- "films" → 1 result
- "nato" → 1 result
- "flank" → 1 result
- "asean" → 1 result
- "tensions" → 1 result
- "xyz123" → 0 results (show "No newspapers found matching your search.")

**Accessibility & Semantic HTML**

- Newspaper cards: `<article>` element
- Cart sidebar: `<aside role="complementary">`
- Clear search button: `aria-label="Clear search"`
- Image alt text: must match article title exactly
- Main heading: `<h1>`
- Cart heading: `<h2>`
- Card title: `<h3>`
- Cart item title: `<h4>`

**Component Behavior**

- Search input is a controlled component: `value={searchQuery}` and `onChange` handler
- Clear button only visible when `searchQuery.length > 0`
- Clicking "Added to Cart" button has no effect (disabled)
- Button state persists: if added from search results, then search cleared, button still shows "Added to Cart"
- Cart sidebar has `position: sticky; top: 0;`
- Grid layout: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- Empty state visible only when `cartItems.length === 0`
- Empty state hidden when `cartItems.length > 0`
- Cart items scrollable: `max-height` + `overflow-y: auto`
- Published date format: "April 8, 2026" (use `toLocaleDateString` with options)

**State Management Requirements**

- `useState` for `searchQuery` (string)
- `useState` for `cartItems` (array of objects: `[{ id, title, author }]`)
- Do NOT use Context API
- Do NOT use localStorage
- Pass state and handlers via props
- Filter articles on every render: `articles.filter(article => article.title.toLowerCase().includes(searchQuery.toLowerCase()))`
- Check if in cart: `cartItems.some(item => item.id === article.id)`
- Add to cart: `setCartItems(prev => [...prev, { id: article.id, title: article.title, author: article.author }])`

**Grid & Layout Behavior**

- Desktop: 75% newspapers grid + 25% cart sidebar
- Mobile/tablet (< 1024px): stacked vertically
- Cart sidebar min-width: 340px on desktop
- Responsive grid: 3-4 columns desktop, 2 tablet, 1 mobile
- Card hover: `transform: translateY(-4px)` + shadow

**Console & Errors**

- Application must render without console errors
- No React key warnings (use `article.id` as key)
- No unhandled promise rejections
- No undefined/null reference errors

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

- Exact visible text required: "0"
- Exact visible text required: "1"
- Exact visible text required: "2"
- Exact visible text required: "3"
- Exact visible text required: "10"
- Exact visible text required: "4"
- Exact visible text required: "5"
- Exact visible text required: "6"
- Exact visible text required: "7"
- Exact visible text required: "8"
- Exact visible text required: "9"

</details>
### Test Contract

<details>
<summary>Click to view</summary>

- The page should render the main heading "Newspaper E-commerce"
- The page should render the subtitle text "Browse and add newspapers to your reading cart"
- The page should render the search input with placeholder "Search by title..."
- The page should render the search label "SEARCH NEWSPAPERS"
- The page should render the cart sidebar with heading "Reading Cart"
- The cart sidebar should initially display "Your cart is empty"
- The cart sidebar should display the count badge showing "0" initially
- The page should render all 10 newspaper articles from the data source
- The first newspaper card should display the title "Global Leaders Convene for Historic Climate Summit in Geneva"
- The first newspaper card should display the author "By Priya Mehta"
- The first newspaper card should display the category badge "World"
- The second newspaper card should display the title "India\'s Tech Startups See Record $18 Billion Investment in Q1 2026"
- The second newspaper card should display the author "By Arjun Sharma"
- The second newspaper card should display the category badge "Business"
- The third newspaper card should display the title "Scientists Discover New Deep-Sea Species Off Coast of Andaman Islands"
- The third newspaper card should display the author "By Ravi Krishnamurthy"
- The third newspaper card should display the category badge "Science"
- The fourth newspaper card should display the title "Mumbai Metro Line 9 Set to Open Ahead of Schedule This June"
- The fourth newspaper card should display the author "By Sneha Patil"
- The fourth newspaper card should display the category badge "City"
- The fifth newspaper card should display the title "India Wins Test Series Against Australia 3–1 in Historic Comeback"
- The fifth newspaper card should display the author "By Kiran Bose"
- The fifth newspaper card should display the category badge "Sports"
- The sixth newspaper card should display the title "New AI Model Outperforms Doctors in Early Cancer Detection Study"
- The sixth newspaper card should display the author "By Dr. Ananya Iyer"
- The sixth newspaper card should display the category badge "Health"
- The seventh newspaper card should display the title "Budget 2026: Middle-Class Tax Relief and Green Energy Subsidies Headline Proposals"
- The seventh newspaper card should display the author "By Meghna Rao"
- The seventh newspaper card should display the category badge "Economy"
- The eighth newspaper card should display the title "Cannes 2026: Indian Films Dominate with Three Official Selections"
- The eighth newspaper card should display the author "By Tara Srinivasan"
- The eighth newspaper card should display the category badge "Culture"
- The ninth newspaper card should display the title "NATO Expands Eastern Flank with New Rapid-Response Brigade"
- The ninth newspaper card should display the author "By Aleksandra Nowak"
- The tenth newspaper card should display the title "South China Sea Tensions Ease as ASEAN Brokered Talks Resume"
- The tenth newspaper card should display the author "By Lin Mei Shan"
- Each newspaper card should render an "Add to Cart" button initially
- When the first newspaper\'s "Add to Cart" button is clicked, the button text should change to "Added to Cart"
- When the first newspaper is added to cart, the cart count badge should update to "1"
- When the first newspaper is added to cart, the cart should display the newspaper title
- When the first newspaper is added to cart, the cart should display the author "By Priya Mehta"
- When two newspapers are added to cart, the cart count badge should display "2"
- When two newspapers are added to cart, both titles should appear in the cart sidebar
- When the same newspaper\'s "Added to Cart" button is clicked again, the cart count should remain the same
- The "Added to Cart" button should be disabled after adding the newspaper
- When the search input receives the text "climate", the page should display only newspapers with "climate" in the title
- When the search input receives the text "india", the page should display only newspapers with "india" in the title
- When the search input receives the text "metro", the page should display only the newspaper with "metro" in the title
- When the search input receives the text "xyz123", the page should display "No newspapers found matching your search."
- When the search input is cleared after searching, all newspapers should be displayed again
- The search functionality should be case-insensitive for the query "CLIMATE"
- The search functionality should be case-insensitive for the query "MuMbAi"
- When the clear button is clicked in the search bar, the search input should be cleared
- When the clear button is clicked, all newspapers should be displayed again
- When three newspapers are added to cart, the cart count badge should display "3"
- When all 10 newspapers are added to cart, the cart count badge should display "10"
- When all 10 newspapers are added to cart, all 10 titles should appear in the cart sidebar
- The cart sidebar empty state should display the hint text "Add newspapers to start reading"
- When a newspaper is added to cart, the empty state message should no longer be visible
- Each newspaper card should display an image with the correct alt text matching the title
- Each newspaper card should display the published date in readable format
- When searching for "sea", the page should display newspapers with "sea" in the title
- When searching for "2026", the page should display newspapers with "2026" in the title
- When searching for "AI", the page should display the newspaper with "AI" in the title
- The search input should update its value as the user types
- When a newspaper from search results is added to cart, it should appear in the cart sidebar
- When a newspaper is added to cart from search results and search is cleared, the button should remain "Added to Cart"
- The newspaper cards should render in a grid layout
- Each newspaper card should display the summary text
- When the fourth newspaper is added to cart, the button text should change to "Added to Cart"
- When the fifth newspaper is added to cart, the cart should display the title "India Wins Test Series Against Australia 3–1 in Historic Comeback"
- When the sixth newspaper is added to cart, the cart should display the author "By Dr. Ananya Iyer"
- When the seventh newspaper is added to cart, the cart count should update correctly
- When the eighth newspaper is added to cart, the cart should display the title "Cannes 2026: Indian Films Dominate with Three Official Selections"
- When the ninth newspaper is added to cart, the cart should display the author "By Aleksandra Nowak"
- When the tenth newspaper is added to cart, the button text should change to "Added to Cart"
- When searching for "budget", the page should display only the newspaper with "budget" in the title
- When searching for "cannes", the page should display only the newspaper with "cannes" in the title
- When searching for "nato", the page should display only the newspaper with "nato" in the title
- When searching for "asean", the page should display only the newspaper with "asean" in the title
- When four newspapers are added to cart, the cart count badge should display "4"
- When five newspapers are added to cart, the cart count badge should display "5"
- When six newspapers are added to cart, the cart count badge should display "6"
- When seven newspapers are added to cart, the cart count badge should display "7"
- When eight newspapers are added to cart, the cart count badge should display "8"
- When nine newspapers are added to cart, the cart count badge should display "9"
- When searching for "tech", the page should display the newspaper with "tech" in the title
- When searching for "scientists", the page should display the newspaper with "scientists" in the title
- When searching for "series", the page should display the newspaper with "series" in the title
- When searching for "cancer", the page should display the newspaper with "cancer" in the title
- The cart sidebar should have a sticky position when scrolling
- When searching for "energy", the page should display the newspaper with "energy" in the title
- When searching for "films", the page should display the newspaper with "films" in the title
- When searching for "flank", the page should display the newspaper with "flank" in the title
- When searching for "tensions", the page should display the newspaper with "tensions" in the title
- When the second newspaper is added to cart, the button should be disabled
- When the third newspaper is added to cart, the cart should display the title "Scientists Discover New Deep-Sea Species Off Coast of Andaman Islands"
- Each newspaper card should display the category badge with correct styling
- The application should render without any console errors
- When all newspapers are added to cart, the empty state message should not be visible

</details>
### Resources

<details>
<summary>Colors</summary>
<br/>

**Primary / Brand Color**

- <div style="background-color: #1a1a1a; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#1a1a1a</div>

**Background Colors**

- <div style="background-color: #f5f5f5; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#f5f5f5</div>
- <div style="background-color: #f9f9f9; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#f9f9f9</div>
- <div style="background-color: #fff; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#fff</div>
- <div style="background-color: #fafafa; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#fafafa</div>

**Border Colors**

- <div style="background-color: #e0e0e0; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#e0e0e0</div>
- <div style="background-color: #f0f0f0; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#f0f0f0</div>
- <div style="background-color: #e5e5e5; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#e5e5e5</div>
- <div style="background-color: #ddd; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#ddd</div>
- <div style="background-color: #eee; width: 150px; padding: 10px; color: black; border: 1px solid #e5e7eb; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#eee</div>

**Text Colors**

- <div style="background-color: #667eea; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#667eea</div>
- <div style="background-color: #764ba2; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#764ba2</div>
- <div style="background-color: #333; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#333</div>
- <div style="background-color: #666; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#666</div>
- <div style="background-color: #999; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#999</div>
- <div style="background-color: #4caf50; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#4caf50</div>
- <div style="background-color: #555; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#555</div>
- <div style="background-color: #888; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#888</div>
- <div style="background-color: #777; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#777</div>

**Accent / Status Colors**

- <div style="background-color: #16a34a; width: 150px; padding: 10px; color: white;  box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\#16a34a</div>

</details>

<details>
<summary>Font-families</summary>

```
Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif
```

</details>

<details>
<summary>Image URLs</summary>

| Usage | URL |
|-------|-----|
| Newspaper / product image | https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1581262208435-41726149a759?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80 |
| Newspaper / product image | https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80 |


</details>

> ### _Things to Keep in Mind_
>
> - All components you implement should go in the `src/components` directory.
> - Don't change the component folder names as those are the files being imported into the tests.
