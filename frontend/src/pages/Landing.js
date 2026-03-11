import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shirt, Coffee, BookOpen, Flag, Sparkles, Users, TrendingUp, 
  Award, ChevronRight, Star, Zap, Gift, ArrowRight, Shield, Clock, CheckCircle, 
  Monitor, Printer, Package, Megaphone, Crown, ShoppingBag, Wrench, Play, Upload
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import Featured3DCarousel from '../components/Featured3DCarousel';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Three main pillars
const mainPillars = [
  {
    icon: Megaphone,
    name: 'Promotional Materials',
    desc: 'Custom branded merchandise for events, marketing campaigns, and corporate identity',
    color: 'bg-primary',
    link: '/products?branch=Promotional Materials',
    subcategories: [
      { icon: Shirt, name: 'Apparel', desc: 'T-shirts, Polos, Hoodies, Caps' },
      { icon: Coffee, name: 'Drinkware', desc: 'Mugs, Bottles, Tumblers' },
      { icon: BookOpen, name: 'Stationery', desc: 'Notebooks, Pens, Folders' },
      { icon: Flag, name: 'Signage', desc: 'Banners, Posters, Stickers' },
    ]
  },
  {
    icon: Monitor,
    name: 'Office Equipment',
    desc: 'Professional office supplies and tech accessories for the modern workplace',
    color: 'bg-blue-600',
    link: '/products?branch=Office Equipment',
    subcategories: [
      { icon: Monitor, name: 'Tech Accessories', desc: 'Mouse, USB Hubs, Cables' },
      { icon: Package, name: 'Desk Organizers', desc: 'Trays, Holders, Storage' },
      { icon: Printer, name: 'Office Supplies', desc: 'Printers, Scanners, Equipment' },
    ]
  },
  {
    icon: Wrench,
    name: 'Service & Maintenance',
    desc: 'Professional equipment repair, maintenance, and consultation services',
    color: 'bg-secondary',
    link: '/services/maintenance',
    subcategories: [
      { icon: Printer, name: 'Printer Service', desc: 'Repair & Maintenance' },
      { icon: Monitor, name: 'Equipment Repair', desc: 'Tech Support & Fixes' },
      { icon: Users, name: 'Consultation', desc: 'Expert Advice' },
    ]
  }
];

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: 'Choose Your Product',
    desc: 'Browse our catalog and select from T-shirts, caps, mugs, and more',
    icon: Shirt,
    color: 'bg-primary'
  },
  {
    step: 2,
    title: 'Upload Your Logo',
    desc: 'Add your company logo or design - we support PNG, JPG, and SVG',
    icon: Sparkles,
    color: 'bg-secondary'
  },
  {
    step: 3,
    title: 'Customize & Preview',
    desc: 'Position your logo, choose colors, and see a live preview',
    icon: Award,
    color: 'bg-blue-600'
  },
  {
    step: 4,
    title: 'Place Your Order',
    desc: 'Review, pay deposit, and track your order to delivery',
    icon: Package,
    color: 'bg-green-600'
  }
];

const features = [
  { icon: Sparkles, title: 'AI Design Assistant', desc: 'Get instant help choosing products and creating designs' },
  { icon: Shield, title: 'Quality Guaranteed', desc: 'Premium materials with professional standards' },
  { icon: TrendingUp, title: 'Live Order Tracking', desc: 'Track your order from design to delivery' },
  { icon: Gift, title: 'Rewards Program', desc: 'Earn points on every order and referral' },
];

const stats = [
  { value: '5,000+', label: 'Orders Completed' },
  { value: '500+', label: 'Business Clients' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '24h', label: 'Support Response' },
];

const trustBadges = [
  { icon: Shield, label: 'Quality Assured' },
  { icon: Clock, label: 'On-Time Delivery' },
  { icon: CheckCircle, label: 'Verified Supplier' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Hero Section - Catchy Branding Focus */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-secondary rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-16 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content - 7 columns */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-8"
            >
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-3">
                {trustBadges.map((badge, i) => (
                  <motion.div 
                    key={badge.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="trust-badge"
                  >
                    <badge.icon className="w-4 h-4 text-primary" />
                    <span>{badge.label}</span>
                  </motion.div>
                ))}
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-primary">
                  Brand Your Business
                  <span className="block text-secondary">In Minutes</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                  Upload your logo, customize your products, and order <strong>branded merchandise</strong> — 
                  T-shirts, caps, mugs, and more. It's that simple.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  data-testid="get-started-btn"
                  onClick={() => navigate('/products?branch=Promotional Materials')}
                  className="btn-primary-pill text-lg h-14 px-10"
                >
                  <Shirt className="mr-2 w-5 h-5" />
                  Start Designing
                </Button>
                <Button 
                  data-testid="view-catalog-btn"
                  variant="outline" 
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="h-14 px-10 text-lg rounded-full border-2 border-primary/20 hover:bg-primary/5"
                >
                  <Play className="mr-2 w-5 h-5" />
                  See How It Works
                </Button>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-slate-200">
                {stats.map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <div className="text-2xl lg:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Right - Visual Process Preview - 5 columns */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 hidden lg:block"
            >
              <div className="relative">
                {/* Main Visual Card - Shows branding process */}
                <div className="card-modern p-6 bg-white">
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 bg-secondary/10 text-secondary text-sm font-medium px-4 py-2 rounded-full">
                      <Sparkles className="w-4 h-4" />
                      Live Customization
                    </span>
                  </div>
                  
                  {/* T-shirt Preview */}
                  <div className="relative bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl p-8 mb-4">
                    <img 
                      src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400" 
                      alt="Customizable T-shirt" 
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    {/* Logo placeholder overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-dashed border-secondary rounded-lg flex items-center justify-center bg-white/80">
                      <Upload className="w-8 h-8 text-secondary" />
                    </div>
                  </div>
                  
                  {/* Mini steps */}
                  <div className="flex items-center justify-between">
                    {[
                      { icon: Shirt, label: 'Pick' },
                      { icon: Upload, label: 'Upload' },
                      { icon: Sparkles, label: 'Design' },
                      { icon: Package, label: 'Order' }
                    ].map((step, i) => (
                      <div key={step.label} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 0 ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs mt-1 text-muted-foreground">{step.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/products?branch=Promotional Materials')}
                    className="w-full mt-4 rounded-full bg-secondary text-primary hover:bg-secondary/90"
                  >
                    Try It Now — Free Preview
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                {/* Floating Badge */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-4 -right-4 stat-card flex items-center gap-3"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold">No Min Order</div>
                    <div className="text-xs text-muted-foreground">Start from 1 piece</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Visual Process */}
      <section id="how-it-works" className="py-20 bg-white" data-testid="how-it-works">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-primary">
              From Logo to Delivery in 4 Steps
            </h2>
            <p className="text-muted-foreground mt-4">
              Brand your products in minutes — no design skills needed
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent" />
                )}
                
                <div className="text-center">
                  <div className={`w-20 h-20 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg relative`}>
                    <item.icon className="w-10 h-10 text-white" />
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold text-primary shadow">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              onClick={() => navigate('/products?branch=Promotional Materials')}
              className="btn-primary-pill text-lg h-14 px-10"
            >
              Start Your Design Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* 3D Featured Products Carousel - FIRST */}
      <Featured3DCarousel />

      {/* Quick Product Grid - Show products immediately */}
      <section className="py-16 bg-white" data-testid="quick-products-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-end justify-between gap-4 mb-10"
          >
            <div>
              <span className="text-sm font-medium text-secondary uppercase tracking-wider">Shop Now</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary gold-accent pb-2">
                Popular Products
              </h2>
            </div>
            <Button 
              onClick={() => navigate('/products')}
              variant="outline"
              className="rounded-full"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.slice(0, 10).map((product, i) => {
              const isKonektSeries = product.branch === 'KonektSeries' || !product.is_customizable;
              const productLink = isKonektSeries ? `/product/${product.id}` : `/customize/${product.id}`;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link 
                    to={productLink}
                    className="group block bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Branch badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          product.branch === 'KonektSeries' 
                            ? 'bg-secondary text-primary' 
                            : product.branch === 'Office Equipment'
                              ? 'bg-blue-500 text-white'
                              : 'bg-primary text-white'
                        }`}>
                          {product.branch === 'KonektSeries' && <Crown className="w-3 h-3 inline mr-1" />}
                          {product.branch || product.category}
                        </span>
                      </div>
                      {/* Quick action on hover */}
                      <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-medium flex items-center gap-2">
                          {isKonektSeries ? (
                            <><ShoppingBag className="w-4 h-4" /> Buy Now</>
                          ) : (
                            <><Sparkles className="w-4 h-4" /> Customize</>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-primary line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-secondary">
                          TZS {product.base_price.toLocaleString()}
                        </span>
                        {product.colors && product.colors.length > 0 && (
                          <div className="flex -space-x-1">
                            {product.colors.slice(0, 3).map((color, idx) => (
                              <div 
                                key={idx}
                                className="w-4 h-4 rounded-full border border-white"
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-20 bg-white" data-testid="pillars-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-12"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-primary gold-accent pb-4">
              Three Pillars of Business Success
            </h2>
            <p className="text-muted-foreground mt-4">
              From branded merchandise to office essentials and maintenance services — we've got your business covered
            </p>
          </motion.div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {mainPillars.map((pillar, i) => (
              <motion.div
                key={pillar.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card-modern p-6 bg-white"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className={`w-14 h-14 ${pillar.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <pillar.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-primary">{pillar.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pillar.desc}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-5">
                  {pillar.subcategories.map((sub) => (
                    <Link
                      key={sub.name}
                      to={pillar.name === 'Service & Maintenance' ? '/services/maintenance' : `/products?branch=${encodeURIComponent(pillar.name)}&category=${encodeURIComponent(sub.name)}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                      data-testid={`subcategory-${sub.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <sub.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-primary truncate">{sub.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{sub.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
                
                <Button 
                  onClick={() => navigate(pillar.link)}
                  className="w-full rounded-full"
                  variant={i === 0 ? 'default' : 'outline'}
                >
                  {pillar.name === 'Service & Maintenance' ? 'Book Service' : `Browse ${pillar.name.split(' ')[0]}`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50" data-testid="features-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">Why Konekt</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-primary">
              Professional Service, Personal Touch
            </h2>
            <p className="text-muted-foreground mt-4">
              We combine cutting-edge technology with dedicated support to deliver exceptional results
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* KonektSeries Showcase */}
      <section className="py-20 bg-white" data-testid="konektseries-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-secondary/10 px-4 py-2 rounded-full text-secondary text-sm mb-4">
              <Crown className="w-4 h-4" />
              Exclusive Brand
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary">
              KonektSeries
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
              Our signature clothing line — premium streetwear with the Konekt touch. Ready to wear, no customization needed.
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.filter(p => p.branch === 'KonektSeries' || p.is_customizable === false).slice(0, 4).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link 
                  to={`/product/${product.id}`}
                  className="group block bg-slate-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
                  data-testid={`konekt-series-${product.id}`}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Exclusive
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-full">
                        Buy Now — TZS {product.base_price.toLocaleString()}
                      </Button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-secondary font-medium uppercase tracking-wider mb-1">
                      {product.category}
                    </div>
                    <h3 className="font-bold text-primary">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{product.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Button 
              onClick={() => navigate('/products?branch=KonektSeries')}
              className="rounded-full bg-secondary text-primary hover:bg-secondary/90 px-8"
            >
              <Crown className="w-4 h-4 mr-2" />
              Explore KonektSeries
            </Button>
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="py-20 bg-slate-50" data-testid="referral-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-modern p-8 md:p-12 bg-gradient-navy text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-4">
                  <Gift className="w-4 h-4" />
                  Rewards Program
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Invite Friends, Earn Rewards
                </h2>
                <p className="text-white/70 max-w-md">
                  Get 200 points for every friend who places an order. 
                  Your friend gets 150 points too!
                </p>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)' }}>
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">200</div>
                    <div className="text-sm text-white/70">Points per referral</div>
                  </div>
                </div>
                
                {user ? (
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="btn-gamified"
                    data-testid="share-code-btn"
                  >
                    Share Your Code
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="btn-gamified"
                    data-testid="join-now-btn"
                  >
                    Join Now
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Elevate Your Business?</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            From promotional materials to office equipment — get everything your business needs with Konekt.
          </p>
          <Button 
            onClick={() => navigate('/products')}
            className="btn-gamified text-lg h-14 px-10"
            data-testid="footer-cta-btn"
          >
            Start Your Order
            <Zap className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
