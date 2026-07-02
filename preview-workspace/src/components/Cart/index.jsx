import './index.css';

const Cart = ({ cartItems }) => {
  return (
    <div className='cart-container'>
      <h2 className='cart-title'>Shopping Cart ({cartItems.length})</h2>
      {cartItems.length > 0 ? (
        <ul className='cart-list'>
          {cartItems.map((item) => (
            <li key={item.id} className='cart-item'>
              <div className='cart-item-info'>
                <p className='cart-item-title'>{item.title}</p>
                <p className='cart-item-author'>By {item.author}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className='cart-empty'>Your cart is empty. Start adding newspapers!</p>
      )}
    </div>
  );
};

export default Cart;