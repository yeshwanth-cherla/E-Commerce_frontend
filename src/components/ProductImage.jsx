import React, { useState } from 'react';
import { Icon } from './Icon';

export const ProductImage = ({
  src,
  alt = 'Product image',
  className = '',
  style = {},
}) => {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <span
        className={`image-fallback ${className}`}
        role="img"
        aria-label={`${alt} image unavailable`}
        style={style}
      >
        <Icon name="box" size={26} />
        <small>Image unavailable</small>
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export default ProductImage;
