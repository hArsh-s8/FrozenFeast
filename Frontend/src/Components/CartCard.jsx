import React from "react";
import './CartCard.css';

const CartCard = ({ image, name, price, description, quantity, tag, removeFromCart, onQuantityChange }) => {

    const decrease = () => {
        if (quantity > 1) {
            onQuantityChange(quantity - 1);
        }
    }

    const increase = () => {
        onQuantityChange(quantity + 1);
    }

    return (
        <div className="cart-card">
            <div className="cart-img-wrapper">
                <img src={image} alt={name} />
                <span className="cart-tag">{tag}</span>
            </div>

            <div className="cart-info">
                <div>
                    <div className="cart-top">
                        <p>{name}</p>
                        <p>₹{price}</p>
                    </div>

                    <p className="cart-desc">{description}</p>

                    <div className="cart-qty">
                        <button onClick={decrease}>-</button>
                        <div className="cart-count">{quantity}</div>
                        <button onClick={increase}>+</button>
                    </div>
                </div>

                <div className="cart-remove">
                    <button onClick={removeFromCart}>Remove</button>
                </div>
            </div>
        </div>

    );

}

export default CartCard;