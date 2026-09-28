import { useState } from 'react';
import './App.css';
import articles from './product';
import NewspaperCard from './components/NewspaperCard';
import SearchBar from './components/SearchBar';
import CartSidebar from './components/CartSidebar';

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleAddToCart = (article) => {
    if (!cartItems.find(item => item.id === article.id)) {
      setCartItems(prev => [...prev, { id: article.id, title: article.title, author: article.author }]);
    }
  };

  const isInCart = (id) => {
    return cartItems.some(item => item.id === id);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='app'>
      <header className='app-header'>
        <h1 className='app-header__title'>Newspaper E-commerce</h1>
        <p className='app-header__subtitle'>Browse and add newspapers to your reading cart</p>
      </header>
      <SearchBar onSearch={handleSearch} searchQuery={searchQuery} />
      <div className='app-main'>
        <div className='newspapers-container'>
          {filteredArticles.length === 0 ? (
            <div className='empty-state'>
              <p className='empty-state__text'>No newspapers found matching your search.</p>
            </div>
          ) : (
            <div className='newspapers-grid'>
              {filteredArticles.map(article => (
                <NewspaperCard
                  key={article.id}
                  article={article}
                  onAddToCart={handleAddToCart}
                  isInCart={isInCart(article.id)}
                />
              ))}
            </div>
          )}
        </div>
        <CartSidebar cartItems={cartItems} />
      </div>
    </div>
  );
};

export default App;