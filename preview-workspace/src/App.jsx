import { useState } from 'react';
import NewspaperCard from './components/NewspaperCard';
import Cart from './components/Cart';
import './App.css';

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
    title: 'India\'s Tech Startups See Record $18 Billion Investment in Q1 2026',
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
    title: 'Cannes 2026: Indian Films Dominate with Three Official Selections',
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

const App = () => {
  const [searchInput, setSearchInput] = useState('');
  const [cartItems, setCartItems] = useState([]);

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleAddToCart = (article) => {
    const isAlreadyInCart = cartItems.some((item) => item.id === article.id);
    if (!isAlreadyInCart) {
      setCartItems([...cartItems, { id: article.id, title: article.title, author: article.author }]);
    }
  };

  const isInCart = (id) => cartItems.some((item) => item.id === id);

  return (
    <div className='app-container'>
      <header className='app-header'>
        <h1 className='app-title'>Newspaper E-commerce</h1>
        <input
          type='search'
          placeholder='Search by title...'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className='search-input'
        />
      </header>
      <main className='newspapers-container'>
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <NewspaperCard
              key={article.id}
              article={article}
              onAddToCart={handleAddToCart}
              isInCart={isInCart(article.id)}
            />
          ))
        ) : (
          <p className='no-results'>No newspapers found matching your search.</p>
        )}
      </main>
      <Cart cartItems={cartItems} />
    </div>
  );
};

export default App;