const NewspaperCard = ({ article, onAddToCart, isInCart }) => {
  return (
    <div className='newspaper-card'>
      <img src={article.imageUrl} alt={article.title} className='newspaper-image' />
      <div className='newspaper-details'>
        <h2 className='newspaper-title'>{article.title}</h2>
        <p className='newspaper-author'>By {article.author}</p>
        <p className='newspaper-date'>{article.publishedDate}</p>
        <p className='newspaper-category'>{article.category}</p>
        <button
          onClick={() => onAddToCart(article)}
          disabled={isInCart}
          className={isInCart ? 'btn-added' : 'btn-add'}
        >
          {isInCart ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default NewspaperCard;