import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Crown, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Featured3DCarousel() {
  const [products, setProducts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    if (isAutoPlaying && products.length > 0) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % products.length);
      }, 4000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isAutoPlaying, products.length]);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      // Get a mix of products from different branches
      const allProducts = response.data.products || [];
      const featured = allProducts.slice(0, 7);
      setProducts(featured);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % products.length);
  };

  const getCardStyle = (index) => {
    const diff = index - activeIndex;
    const total = products.length;
    
    // Handle wraparound
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;
    
    const absIndex = Math.abs(normalizedDiff);
    
    // 3D transforms based on position
    const rotateY = normalizedDiff * 45;
    const translateX = normalizedDiff * 280;
    const translateZ = -absIndex * 150;
    const scale = absIndex === 0 ? 1 : Math.max(0.6, 1 - absIndex * 0.15);
    const opacity = absIndex <= 2 ? 1 : 0;
    const zIndex = 10 - absIndex;
    
    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
    };
  };

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 via-primary to-slate-900 overflow-hidden" data-testid="featured-carousel">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/80 text-sm mb-4">
            <Sparkles className="w-4 h-4 text-secondary" />
            Featured Collection
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Explore Our Best
          </h2>
          <p className="text-white/60 max-w-lg mx-auto">
            Discover our most popular products across all branches
          </p>
        </motion.div>

        {/* 3D Carousel */}
        <div className="relative h-[500px] perspective-1000">
          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
            data-testid="carousel-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
            data-testid="carousel-next"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Cards Container */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {products.map((product, index) => {
              const isActive = index === activeIndex;
              const isKonektSeries = product.branch === 'KonektSeries' || product.is_customizable === false;
              const productLink = isKonektSeries ? `/product/${product.id}` : `/customize/${product.id}`;
              
              return (
                <motion.div
                  key={product.id}
                  className="absolute w-[320px] cursor-pointer"
                  style={getCardStyle(index)}
                  animate={getCardStyle(index)}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  onClick={() => {
                    if (isActive) return;
                    setIsAutoPlaying(false);
                    setActiveIndex(index);
                  }}
                >
                  <Link 
                    to={isActive ? productLink : '#'}
                    onClick={(e) => !isActive && e.preventDefault()}
                    className="block"
                  >
                    <div className={`
                      relative rounded-3xl overflow-hidden bg-white shadow-2xl
                      transition-all duration-500
                      ${isActive ? 'ring-4 ring-secondary/50 shadow-secondary/20' : ''}
                    `}>
                      {/* Glow effect for active card */}
                      {isActive && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-yellow-400 to-secondary rounded-3xl opacity-30 blur-xl animate-pulse" />
                      )}
                      
                      {/* Product Image */}
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className={`
                            w-full h-full object-cover transition-transform duration-700
                            ${isActive ? 'scale-110' : 'scale-100'}
                          `}
                        />
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Branch Badge */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <Badge className={`
                            ${isKonektSeries ? 'bg-secondary text-primary' : 'bg-primary text-white'}
                            shadow-lg
                          `}>
                            {isKonektSeries && <Crown className="w-3 h-3 mr-1" />}
                            {product.branch || product.category}
                          </Badge>
                          {product.category && product.branch && (
                            <Badge variant="outline" className="bg-white/90 text-xs shadow">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price Tag */}
                        <div className="absolute top-4 right-4">
                          <div className="bg-white px-3 py-1.5 rounded-full shadow-lg">
                            <span className="text-sm font-bold text-primary">
                              TZS {product.base_price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-lg"
                          >
                            <Star className="w-5 h-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="relative p-6 bg-white">
                        <h3 className="font-bold text-lg text-primary line-clamp-1 mb-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {product.description}
                        </p>
                        
                        {/* Colors */}
                        {product.colors && product.colors.length > 0 && (
                          <div className="flex items-center gap-1 mb-4">
                            {product.colors.slice(0, 4).map((color, idx) => (
                              <div 
                                key={idx}
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                            {product.colors.length > 4 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{product.colors.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* CTA */}
                        <div className={`
                          flex items-center gap-2 text-sm font-medium
                          ${isActive ? 'text-secondary' : 'text-muted-foreground'}
                          transition-colors
                        `}>
                          {isKonektSeries ? (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              Buy Now
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Customize
                            </>
                          )}
                          {isActive && (
                            <ChevronRight className="w-4 h-4 animate-bounce-x" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Reflection effect */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 mt-8">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAutoPlaying(false);
                setActiveIndex(index);
              }}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${index === activeIndex 
                  ? 'bg-secondary w-8' 
                  : 'bg-white/30 hover:bg-white/50'}
              `}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Link to="/products">
            <Button 
              className="bg-white text-primary hover:bg-white/90 rounded-full px-8 h-12 text-lg font-medium shadow-xl"
              data-testid="view-all-products-btn"
            >
              View All Products
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* CSS for 3D perspective and animations */}
      <style>{`
        .perspective-1000 {
          perspective: 1500px;
        }
        
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
