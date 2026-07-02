const Cart = ({ cartItems }) => {
  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className='cart-container'>
      <h2 className='cart-title'>Shopping Cart</h2>
      <div className='cart-items'>
        {cartItems.map((item) => (
          <div key={item.id} className='cart-item'>
            <p className='cart-item-title'>{item.title}</p>
            <p className='cart-item-author'>By {item.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cart;