import { Link } from 'react-router-dom'
import { formatPKR } from '../lib/api'

/*
  On the Home page and Collections page the card links to the category page.
  On category pages an onOpen function is passed, and the card opens the detail popup instead.
*/
export default function ProductCard({ product, variant = 'md', delay = 0, onOpen }) {
    const content = (
        <>
            <div className="product-card__media">
                <img
                    className="product-card__img"
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    draggable="false"
                    style={{ objectPosition: product.objectPosition || 'center' }}
                />
                <span className="product-card__view">View piece</span>
            </div>
            <div className="product-card__body">
                <span className="product-card__cat">
                    {product.metal.replace('-', ' ')}
                    {product.karat ? ` · ${product.karat}K` : ''}
                </span>
                <h3 className="product-card__name">{product.name}</h3>
                <span className="product-card__price">{formatPKR(product.price)}</span>
            </div>
        </>
    )

    const className = `product-card product-card--${variant} reveal`
    const style = { '--d': `${delay}ms` }

    if (onOpen) {
        return (
            <button type="button" className={className} style={style} onClick={() => onOpen(product)}>
                {content}
            </button>
        )
    }

    return (
        <Link to={`/${product.category}`} className={className} style={style}>
            {content}
        </Link>
    )
}