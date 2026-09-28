import './index.css';

const NewspaperCard = ({ article, onAddToCart, isInCart }) => {
  const handleClick = () => {
    onAddToCart(article);
  };

  return (
    <article className='newspaper-card'>
      <div className='newspaper-card__image-wrapper'>
        <img
          src={article.imageUrl}
          alt={article.title}
          className='newspaper-card__image'
        />
        <span className='newspaper-card__category'>{article.category}</span>
      </div>
      <div className='newspaper-card__content'>
        <h3 className='newspaper-card__title'>{article.title}</h3>
        <p className='newspaper-card__author'>By {article.author}</p>
        <p className='newspaper-card__date'>{new Date(article.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p className='newspaper-card__summary'>{article.summary}</p>
        <button
          onClick={handleClick}
          disabled={isInCart}
          className={`newspaper-card__button ${isInCart ? 'newspaper-card__button--added' : ''}`}
        >
          {isInCart ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
};

export default NewspaperCard;