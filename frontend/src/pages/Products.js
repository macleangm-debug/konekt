import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronRight, Shirt, Coffee, BookOpen, Flag, Monitor, X, Star, ShoppingBag, Crown, Briefcase, Wrench } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Famous industry brand logos
const equipmentBrandLogos = [
  { name: 'HP', color: '#0096D6' },
  { name: 'DELL', color: '#007DB8' },
  { name: 'ZEBRA', color: '#000000' },
  { name: 'Canon', color: '#C4161C' },
  { name: 'EPSON', color: '#003399' },
  { name: 'Lenovo', color: '#E2231A' },
  { name: 'Brother', color: '#005BAC' },
  { name: 'XEROX', color: '#C8102E' },
  { name: 'RICOH', color: '#C8102E' },
  { name: 'KYOCERA', color: '#C8102E' }
];

const branchConfig = {
  'Promotional Materials': { icon: Shirt, color: 'bg-primary' },
  'Office Equipment': { icon: Briefcase, color: 'bg-blue-600' },
  'KonektSeries': { icon: Crown, color: 'bg-secondary' }
};

const categoryIcons = {
  'Apparel': Shirt,
  'Drinkware': Coffee,
  'Stationery': BookOpen,
  'Signage': Flag,
  'Tech Accessories': Monitor,
  'Desk Organizers': Briefcase,
  'Caps': Crown,
  'Hats': Crown,
  'Shorts': Shirt,
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get('branch') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [branchStructure, setBranchStructure] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchBranchStructure();
  }, [selectedBranch, selectedCategory, searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch) params.append('branch', selectedBranch);
      if (selectedCategory) params.append('category', selectedCategory);
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_URL}/api/products?${params.toString()}`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStructure = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/branches/structure`);
      setBranchStructure(response.data.branches || []);
    } catch (error) {
      console.error('Failed to fetch branch structure:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
    fetchProducts();
  };

  const handleBranchChange = (branch) => {
    const newBranch = branch === selectedBranch ? '' : branch;
    setSelectedBranch(newBranch);
    setSelectedCategory(''); // Reset category when branch changes
    const params = new URLSearchParams();
    if (newBranch) params.set('branch', newBranch);
    if (search) params.set('search', search);
    setSearchParams(params);
  };

  const handleCategoryChange = (category) => {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    const params = new URLSearchParams(searchParams);
    if (newCategory) {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedBranch('');
    setSelectedCategory('');
    setSearch('');
    setSearchParams({});
  };

  // Get categories for selected branch
  const currentBranchCategories = selectedBranch 
    ? branchStructure.find(b => b.branch === selectedBranch)?.categories || []
    : [];

  return (
    <div className="min-h-screen bg-background py-8" data-testid="products-page">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {selectedBranch || 'Product Catalog'}
          </h1>
          <p className="text-muted-foreground">
            {selectedBranch === 'KonektSeries' 
              ? 'Our exclusive branded clothing line - ready to wear'
              : selectedBranch 
                ? `Browse our ${selectedBranch.toLowerCase()} collection`
                : 'Choose from our wide range of products'}
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12"
                data-testid="search-input"
              />
            </div>
            <Button type="submit" className="h-12 px-6" data-testid="search-btn">
              Search
            </Button>
          </form>

          {/* Branch Filters (Main Categories) */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" /> Branch:
            </span>
            {Object.entries(branchConfig).map(([branch, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={branch}
                  variant={selectedBranch === branch ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBranchChange(branch)}
                  className={`rounded-full ${selectedBranch === branch && branch === 'KonektSeries' ? 'bg-secondary hover:bg-secondary/90' : ''}`}
                  data-testid={`filter-${branch.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {branch}
                </Button>
              );
            })}
            
            {(selectedBranch || selectedCategory || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
                data-testid="clear-filters-btn"
              >
                <X className="w-4 h-4 mr-1" /> Clear All
              </Button>
            )}
          </div>

          {/* Sub-Category Filters (when branch is selected) */}
          {selectedBranch && currentBranchCategories.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap gap-2 items-center pl-4 border-l-2 border-primary/20"
            >
              <span className="text-sm text-muted-foreground">Category:</span>
              {currentBranchCategories.map((category) => {
                const Icon = categoryIcons[category] || Shirt;
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleCategoryChange(category)}
                    className="rounded-full"
                    data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </Button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Active Filters Display */}
        {(selectedBranch || selectedCategory || search) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {selectedBranch && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Branch: {selectedBranch}
                <button onClick={() => handleBranchChange('')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Category: {selectedCategory}
                <button onClick={() => handleCategoryChange('')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: "{search}"
                <button onClick={() => { setSearch(''); handleSearch({ preventDefault: () => {} }); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Office Equipment Brand Logos */}
        {selectedBranch === 'Office Equipment' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-slate-50 rounded-2xl"
          >
            <p className="text-center text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              We Supply & Service Leading Brands
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
              {equipmentBrandLogos.map((brand, i) => (
                <motion.div
                  key={brand.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-3 py-1.5 bg-white rounded-lg hover:shadow-md transition-all duration-300"
                  title={brand.name}
                >
                  <span 
                    className="text-sm md:text-base font-bold tracking-tight"
                    style={{ color: brand.color }}
                  >
                    {brand.name}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link 
                to="/services/maintenance"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors"
              >
                <Wrench className="w-4 h-4" />
                Need equipment servicing? Check our maintenance services
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card-modern p-4">
                <div className="skeleton h-48 mb-4" />
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-6 w-full mb-2" />
                <div className="skeleton h-4 w-32" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button onClick={clearFilters} variant="outline" className="rounded-full">
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, i) => {
              const isKonektSeries = product.branch === 'KonektSeries' || product.is_customizable === false;
              const productLink = isKonektSeries 
                ? `/product/${product.id}` 
                : `/customize/${product.id}`;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link 
                    to={productLink}
                    className="product-card block"
                    data-testid={`product-${product.id}`}
                  >
                    {/* Product Image */}
                    <div className="relative overflow-hidden bg-white">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-56 object-contain p-3 transition-transform duration-500 product-image"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <Badge className={`${isKonektSeries ? 'bg-secondary text-primary' : 'bg-primary/90 text-white'} hover:bg-primary`}>
                          {product.branch || product.category}
                        </Badge>
                        {product.category && product.branch && (
                          <Badge variant="outline" className="bg-white/90 text-xs">
                            {product.category}
                          </Badge>
                        )}
                        {isKonektSeries && (
                          <Badge className="bg-primary text-white">
                            <Star className="w-3 h-3 mr-1" /> Exclusive
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 bg-white px-2 py-1 text-xs font-bold rounded-full shadow-md text-primary">
                        {isKonektSeries ? '' : 'From '}TZS {(product.base_price || 0).toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                      
                      {/* Colors Preview */}
                      {product.colors && product.colors.length > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          {product.colors.slice(0, 5).map((color, idx) => (
                            <div 
                              key={idx}
                              className="w-5 h-5 rounded-full border border-border"
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                          {product.colors.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{product.colors.length - 5}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Print Methods - only for customizable */}
                      {!isKonektSeries && product.print_methods?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.print_methods?.map((method) => (
                            <span key={method} className="text-xs bg-muted px-2 py-1 rounded">
                              {method}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Min Quantity or Ready to Buy */}
                      <div className="text-xs text-muted-foreground">
                        {isKonektSeries 
                          ? <span className="text-secondary font-medium">Ready to buy • In Stock</span>
                          : `Min. order: ${product.min_quantity} units`
                        }
                      </div>
                      
                      {/* CTA */}
                      <div className="mt-4 flex items-center text-secondary font-medium text-sm">
                        {isKonektSeries ? (
                          <>
                            <ShoppingBag className="w-4 h-4 mr-1" /> Buy Now
                          </>
                        ) : (
                          <>
                            Customize Now <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
