import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Star, ShoppingCart, Minus, Plus, Check,
  Truck, Shield, RefreshCw, Package, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}`);
      const prod = response.data;
      setProduct(prod);
      if (prod.colors?.length > 0) setSelectedColor(prod.colors[0]);
      if (prod.sizes?.length > 0) setSelectedSize(prod.sizes[0]);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize && product?.sizes?.length > 0) {
      toast.error('Please select a size');
      return;
    }
    
    setAddingToCart(true);
    
    const item = {
      product_id: product.id,
      product_name: product.name,
      quantity,
      size: selectedSize || 'One Size',
      color: selectedColor?.name || 'Default',
      print_method: 'Pre-designed',
      logo_url: null,
      logo_position: null,
      unit_price: product.base_price,
      subtotal: product.base_price * quantity,
      customization_data: {
        colorHex: selectedColor?.hex,
        isKonektSeries: true
      }
    };

    setTimeout(() => {
      addItem(item);
      setAddingToCart(false);
      toast.success('Added to cart!', {
        action: {
          label: 'View Cart',
          onClick: () => navigate('/cart')
        }
      });
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background" data-testid="product-detail-page">
      {/* Header */}
      <div className="border-b border-border bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/products')}
            className="flex items-center gap-2"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Products
          </Button>
          
          <Badge className="bg-secondary text-primary">
            <Star className="w-3 h-3 mr-1" /> KonektSeries Exclusive
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-100">
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full aspect-square object-contain p-6"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-primary text-white text-sm px-3 py-1">
                  <Star className="w-4 h-4 mr-1" /> Exclusive Design
                </Badge>
              </div>
            </div>
            
            {/* Product Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Fast Delivery</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Quality Assured</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Easy Returns</p>
              </div>
            </div>
          </motion.div>

          {/* Product Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <Badge variant="outline" className="mb-3">{product.category}</Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
                {product.name}
              </h1>
              <p className="text-muted-foreground text-lg">
                {product.description}
              </p>
            </div>

            {/* Price */}
            {(() => {
              const price = Number(product.customer_price || product.base_price || 0);
              const orig = Number(product.original_price || product.compare_at_price || 0);
              const hasPromo = orig > price && price > 0;
              const off = hasPromo ? Math.round(100 * (orig - price) / orig) : 0;
              const save = hasPromo ? orig - price : 0;
              return (
                <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/10 rounded-2xl" data-testid="detail-price-block">
                  <p className="text-sm text-muted-foreground mb-1">
                    {hasPromo ? "Promo price" : "Price"}
                  </p>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-4xl font-bold text-primary">
                      TZS {price.toLocaleString()}
                    </p>
                    {hasPromo && (
                      <>
                        <span className="text-lg text-muted-foreground line-through" data-testid="detail-price-original">
                          TZS {orig.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold bg-red-600 text-white px-2 py-1 rounded-full" data-testid="detail-price-off-pill">
                          -{off}%
                        </span>
                      </>
                    )}
                  </div>
                  {hasPromo && (
                    <p className="text-sm text-red-600 font-semibold mt-2" data-testid="detail-price-savings">
                      You save TZS {save.toLocaleString()} today
                    </p>
                  )}
                  <p className="text-sm text-secondary mt-2">
                    <Check className="w-4 h-4 inline mr-1" />
                    In Stock • Ready to Ship
                  </p>
                </div>
              );
            })()}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Color: <span className="text-muted-foreground">{selectedColor?.name}</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color.hex}
                      className={`w-12 h-12 rounded-full border-2 transition-all ${
                        selectedColor?.hex === color.hex 
                          ? 'border-primary ring-2 ring-primary/30 scale-110' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => setSelectedColor(color)}
                      title={color.name}
                      data-testid={`color-${color.name.toLowerCase()}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                        selectedSize === size 
                          ? 'border-primary bg-primary text-white' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedSize(size)}
                      data-testid={`size-${size.toLowerCase().replace('/', '-')}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-3 block">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button 
                    className="px-4 py-3 hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    data-testid="qty-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-6 py-3 font-bold text-lg min-w-[60px] text-center" data-testid="qty-display">
                    {quantity}
                  </span>
                  <button 
                    className="px-4 py-3 hover:bg-muted transition-colors"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="qty-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Available'}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  TZS {(product.base_price * quantity).toLocaleString()}
                </span>
              </div>
              
              <Button 
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full btn-gamified text-lg py-6"
                data-testid="add-to-cart-btn"
              >
                {addingToCart ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2" />
                )}
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                <Package className="w-4 h-4 inline mr-1" />
                Ships within 2-3 business days
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
