import './index.css';

const NewspaperCard = ({ article, onAddToCart, isInCart }) => {
  const { title, author, publishedDate, category, imageUrl } = article;

  return (
    <div className='newspaper-card'>
      <img src={imageUrl} alt={title} className='newspaper-image' />
      <div className='newspaper-content'>
        <span className='newspaper-category'>{category}</span>
        <h2 className='newspaper-title'>{title}</h2>
        <p className='newspaper-author'>By {author}</p>
        <p className='newspaper-date'>{new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <button
          onClick={() => onAddToCart(article)}
          className={`add-to-cart-btn ${isInCart ? 'added' : ''}`}
        >
          {isInCart ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default NewspaperCard;