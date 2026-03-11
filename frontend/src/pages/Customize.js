import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Transformer, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { motion } from 'framer-motion';
import { 
  Upload, Move, RotateCcw, Trash2, ZoomIn, ZoomOut, Type, 
  Sparkles, ShoppingCart, Save, ChevronLeft, Info, Loader2,
  Palette, Maximize2, Shirt
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Product Image Component
const ProductImage = ({ src }) => {
  const [image] = useImage(src, 'anonymous');
  return image ? <KonvaImage image={image} width={400} height={400} /> : null;
};

// Logo Image Component
const LogoImage = ({ src, isSelected, onSelect, onChange, shapeProps }) => {
  const [image] = useImage(src, 'anonymous');
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  if (!image) return null;

  return (
    <>
      <KonvaImage
        image={image}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

export default function Customize() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, token } = useAuth();
  const stageRef = useRef();
  const fileInputRef = useRef();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedPrintMethod, setSelectedPrintMethod] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [logoPosition, setLogoPosition] = useState('front');
  
  // Canvas state
  const [logo, setLogo] = useState(null);
  const [logoProps, setLogoProps] = useState({ x: 150, y: 150, width: 100, height: 100, rotation: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [textElements, setTextElements] = useState([]);
  const [newText, setNewText] = useState('');
  
  // Quote state
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  // AI Logo state
  const [showLogoGenerator, setShowLogoGenerator] = useState(false);
  const [logoPrompt, setLogoPrompt] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [generatingLogo, setGeneratingLogo] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (product && selectedPrintMethod && quantity >= product.min_quantity) {
      calculateQuote();
    }
  }, [product, selectedPrintMethod, quantity]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}`);
      const prod = response.data;
      setProduct(prod);
      if (prod.colors?.length > 0) setSelectedColor(prod.colors[0]);
      if (prod.sizes?.length > 0) setSelectedSize(prod.sizes[0]);
      if (prod.print_methods?.length > 0) setSelectedPrintMethod(prod.print_methods[0]);
      setQuantity(prod.min_quantity || 10);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const calculateQuote = async () => {
    if (!product || !selectedPrintMethod) return;
    setQuoteLoading(true);
    try {
      const productType = product.name.toLowerCase().includes('polo') ? 'polo' :
                         product.name.toLowerCase().includes('hoodie') ? 'hoodie' :
                         product.name.toLowerCase().includes('cap') ? 'cap' :
                         product.name.toLowerCase().includes('mug') ? 'mug' :
                         product.name.toLowerCase().includes('notebook') ? 'notebook' :
                         product.name.toLowerCase().includes('banner') ? 'banner' : 't-shirt';
      
      const response = await axios.post(`${API_URL}/api/quote/calculate`, {
        product_type: productType,
        print_method: selectedPrintMethod.toLowerCase().replace(' ', '_'),
        quantity
      });
      setQuote(response.data);
    } catch (error) {
      console.error('Failed to calculate quote:', error);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogo(reader.result);
        setLogoProps({ x: 150, y: 150, width: 100, height: 100, rotation: 0 });
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAILogo = async () => {
    if (!businessName || !logoPrompt) {
      toast.error('Please enter business name and style description');
      return;
    }
    
    setGeneratingLogo(true);
    try {
      const response = await axios.post(`${API_URL}/api/logo/generate`, {
        prompt: logoPrompt,
        business_name: businessName,
        industry: industry || null
      });
      
      const base64Image = `data:image/png;base64,${response.data.image_base64}`;
      setLogo(base64Image);
      setLogoProps({ x: 150, y: 150, width: 100, height: 100, rotation: 0 });
      setShowLogoGenerator(false);
      toast.success('Logo generated! You can now position it on the product.');
    } catch (error) {
      console.error('Logo generation failed:', error);
      toast.error('Failed to generate logo. Please try again.');
    } finally {
      setGeneratingLogo(false);
    }
  };

  const addTextElement = () => {
    if (!newText.trim()) return;
    const id = `text-${Date.now()}`;
    setTextElements([...textElements, {
      id,
      text: newText,
      x: 150,
      y: 250,
      fontSize: 20,
      fill: '#000000',
      rotation: 0
    }]);
    setNewText('');
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (selectedId === 'logo') {
      setLogo(null);
      setSelectedId(null);
    } else if (selectedId) {
      setTextElements(textElements.filter(t => t.id !== selectedId));
      setSelectedId(null);
    }
  };

  const resetCanvas = () => {
    setLogo(null);
    setLogoProps({ x: 150, y: 150, width: 100, height: 100, rotation: 0 });
    setTextElements([]);
    setSelectedId(null);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (!selectedPrintMethod) {
      toast.error('Please select a print method');
      return;
    }
    if (quantity < (product?.min_quantity || 1)) {
      toast.error(`Minimum quantity is ${product?.min_quantity || 1}`);
      return;
    }

    const item = {
      product_id: product.id,
      product_name: product.name,
      quantity,
      size: selectedSize,
      color: selectedColor?.name,
      print_method: selectedPrintMethod,
      logo_url: logo,
      logo_position: logoPosition,
      unit_price: quote?.unit_price || product.base_price,
      subtotal: quote?.total || product.base_price * quantity,
      customization_data: {
        logoProps,
        textElements,
        colorHex: selectedColor?.hex
      }
    };

    addItem(item);
    toast.success('Added to cart!', {
      action: {
        label: 'View Cart',
        onClick: () => navigate('/cart')
      }
    });
  };

  const saveDraft = async () => {
    if (!token) {
      toast.error('Please login to save drafts');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/drafts`, {
        name: `${product.name} - ${new Date().toLocaleDateString()}`,
        product_id: product.id,
        customization_data: {
          selectedColor,
          selectedSize,
          selectedPrintMethod,
          quantity,
          logoPosition,
          logo,
          logoProps,
          textElements
        }
      });
      toast.success('Draft saved!');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    }
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
    <div className="min-h-screen bg-background" data-testid="customize-page">
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
            Back
          </Button>
          
          <h1 className="font-bold text-lg">{product.name}</h1>
          
          <div className="flex items-center gap-2">
            {token && (
              <Button variant="outline" size="sm" onClick={saveDraft} data-testid="save-draft-btn">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Canvas Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Canvas Tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-logo-btn"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload Logo
                </Button>
                
                <Dialog open={showLogoGenerator} onOpenChange={setShowLogoGenerator}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="generate-logo-btn">
                      <Sparkles className="w-4 h-4 mr-2" /> AI Generate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate Logo with AI</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Business Name *</Label>
                        <Input 
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g., TechCorp"
                          data-testid="business-name-input"
                        />
                      </div>
                      <div>
                        <Label>Industry (optional)</Label>
                        <Input 
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="e.g., Technology, Food, Education"
                          data-testid="industry-input"
                        />
                      </div>
                      <div>
                        <Label>Style Description *</Label>
                        <Input 
                          value={logoPrompt}
                          onChange={(e) => setLogoPrompt(e.target.value)}
                          placeholder="e.g., Modern, minimalist, blue colors"
                          data-testid="logo-prompt-input"
                        />
                      </div>
                      <Button 
                        onClick={generateAILogo}
                        disabled={generatingLogo}
                        className="w-full"
                        data-testid="generate-btn"
                      >
                        {generatingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating (up to 1 min)...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Logo
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex items-center gap-1">
                {selectedId && (
                  <Button variant="ghost" size="icon" onClick={removeSelected} data-testid="remove-btn">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={resetCanvas} data-testid="reset-btn">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div 
              className="canvas-container bg-gray-50 flex items-center justify-center"
              style={{ minHeight: 400, backgroundColor: selectedColor?.hex || '#f9fafb' }}
            >
              <Stage
                ref={stageRef}
                width={400}
                height={400}
                onClick={(e) => {
                  if (e.target === e.target.getStage()) {
                    setSelectedId(null);
                  }
                }}
              >
                <Layer>
                  {/* Product placeholder area */}
                  {logo && (
                    <LogoImage
                      src={logo}
                      isSelected={selectedId === 'logo'}
                      onSelect={() => setSelectedId('logo')}
                      onChange={setLogoProps}
                      shapeProps={logoProps}
                    />
                  )}
                  
                  {textElements.map((text, i) => (
                    <KonvaText
                      key={text.id}
                      {...text}
                      draggable
                      onClick={() => setSelectedId(text.id)}
                      onTap={() => setSelectedId(text.id)}
                      onDragEnd={(e) => {
                        const newTexts = textElements.slice();
                        newTexts[i] = { ...text, x: e.target.x(), y: e.target.y() };
                        setTextElements(newTexts);
                      }}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>

            {/* Add Text */}
            <div className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add custom text..."
                onKeyPress={(e) => e.key === 'Enter' && addTextElement()}
                data-testid="text-input"
              />
              <Button onClick={addTextElement} variant="outline" data-testid="add-text-btn">
                <Type className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>

            {/* Logo Position */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Logo Position</Label>
              <div className="flex gap-2">
                {['front', 'back', 'left-sleeve', 'right-sleeve'].map((pos) => (
                  <Button
                    key={pos}
                    variant={logoPosition === pos ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogoPosition(pos)}
                    className="capitalize"
                    data-testid={`position-${pos}`}
                  >
                    {pos.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Options Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Tabs defaultValue="options" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="options">Product Options</TabsTrigger>
                <TabsTrigger value="quote">Quote</TabsTrigger>
              </TabsList>
              
              <TabsContent value="options" className="space-y-6 pt-4">
                {/* Color Selection */}
                {product.colors && product.colors.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Color
                      {selectedColor && <span className="text-muted-foreground">({selectedColor.name})</span>}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color.hex}
                          className={`color-swatch ${selectedColor?.hex === color.hex ? 'selected' : ''}`}
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
                    <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Maximize2 className="w-4 h-4" /> Size
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                          onClick={() => setSelectedSize(size)}
                          data-testid={`size-${size.toLowerCase()}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Print Method */}
                <div>
                  <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Shirt className="w-4 h-4" /> Print Method
                  </Label>
                  <div className="grid gap-3">
                    {product.print_methods?.map((method) => (
                      <button
                        key={method}
                        className={`print-method-card text-left ${selectedPrintMethod === method ? 'selected' : ''}`}
                        onClick={() => setSelectedPrintMethod(method)}
                        data-testid={`print-${method.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="font-medium">{method}</div>
                        <div className="text-sm text-muted-foreground">
                          {method === 'Screen Print' && 'Best for bulk orders, vibrant colors'}
                          {method === 'DTG' && 'Best for detailed designs, photos'}
                          {method === 'Embroidery' && 'Premium look, durable, best for logos'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <Label className="text-sm font-medium mb-3">
                    Quantity (Min: {product.min_quantity})
                  </Label>
                  <div className="quantity-input">
                    <button 
                      onClick={() => setQuantity(Math.max(product.min_quantity, quantity - 10))}
                      data-testid="qty-decrease"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(product.min_quantity, parseInt(e.target.value) || product.min_quantity))}
                      min={product.min_quantity}
                      data-testid="qty-input"
                    />
                    <button 
                      onClick={() => setQuantity(quantity + 10)}
                      data-testid="qty-increase"
                    >
                      +
                    </button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="quote" className="pt-4">
                {quoteLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : quote ? (
                  <div className="quote-result space-y-4" data-testid="quote-result">
                    {quote.best_value && (
                      <div className="best-value">
                        <Sparkles className="w-4 h-4" /> Best Value!
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Unit Price</div>
                        <div className="font-bold">TZS {quote.unit_price?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Quantity</div>
                        <div className="font-bold">{quote.quantity}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Subtotal</div>
                        <div className="font-bold">TZS {quote.subtotal?.toLocaleString()}</div>
                      </div>
                      {quote.discount_rate > 0 && (
                        <div>
                          <div className="text-muted-foreground">Discount ({(quote.discount_rate * 100).toFixed(0)}%)</div>
                          <div className="font-bold text-secondary">-TZS {quote.discount_amount?.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-primary/30 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg">Total</span>
                        <span className="text-2xl font-bold text-primary">TZS {quote.total?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Order more to unlock bigger discounts!
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select options to see quote
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Add to Cart */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Button 
                onClick={handleAddToCart}
                className="w-full btn-gamified text-lg py-6"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Your customization will be saved with your order
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
