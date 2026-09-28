const NewspaperCard = ({ article, onAddToCart, isInCart }) => {
  return (
    <div className='newspaper-card'>
      <img src={article.imageUrl} alt={article.title} className='newspaper-card__image' />
      <div className='newspaper-card__content'>
        <h3 className='newspaper-card__title'>{article.title}</h3>
        <p className='newspaper-card__author'>By {article.author}</p>
        <p className='newspaper-card__date'>{new Date(article.publishedDate).toLocaleDateString()}</p>
        <p className='newspaper-card__category'>{article.category}</p>
        <button
          className={`newspaper-card__button ${isInCart ? 'newspaper-card__button--added' : ''}`}
          onClick={() => onAddToCart(article)}
          disabled={isInCart}
        >
          {isInCart ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default NewspaperCard;