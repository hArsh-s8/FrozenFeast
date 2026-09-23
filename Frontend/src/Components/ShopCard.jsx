import React from 'react';
import './ShopCard.css';

const ShopCard = ({ shopName, shopImageUrl, location, rating, onSelectShop, isSelected }) => {
  // Generate star icons based on rating (1-5 scale)
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <>
        {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="star full">★</span>)}
        {hasHalfStar && <span className="star half">☆</span>} {/* Approximate half-star */}
        {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="star empty">☆</span>)}
      </>
    );
  };

  return (
    <div
      className={`shop-container${isSelected ? ' shop-container--selected' : ''}`}
      onClick={onSelectShop}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectShop?.()}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="shop-image-wrapper">
        <img 
          className="shop-img" 
          src={shopImageUrl} 
          alt={`${shopName} location image`}
          loading="lazy" // Lazy load for performance
        />
      </div>
      <div className="shop-info">
        <h2 className="shop-name">{shopName}</h2>
        <p className="shop-location">{location}</p>
        <div className="shop-rating" aria-label={`Rating: ${rating} out of 5 stars`}>
          {renderStars(rating)}
          <span className="rating-text">({rating}/5)</span>
        </div>
      </div>
    </div>
  );
};

export default ShopCard;