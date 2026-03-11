import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, 
  Info, ChevronLeft, CreditCard, Wallet, Percent
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const { user, token } = useAuth();
  
  const [step, setStep] = useState('cart'); // cart, delivery, payment
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [depositPercentage, setDepositPercentage] = useState('30');
  const [loading, setLoading] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  const depositAmount = total * (parseInt(depositPercentage) / 100);
  const pointsDiscount = Math.min(pointsToUse * 10, total * 0.1); // 10 TZS per point, max 10% discount

  const handlePlaceOrder = async () => {
    if (!token) {
      toast.error('Please login to place an order');
      navigate('/auth');
      return;
    }

    if (!deliveryAddress || !deliveryPhone) {
      toast.error('Please fill in delivery details');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        print_method: item.print_method,
        logo_url: item.logo_url,
        logo_position: item.logo_position || 'front',
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        customization_data: item.customization_data
      }));

      const response = await axios.post(`${API_URL}/api/orders`, {
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_phone: deliveryPhone,
        notes: notes || null,
        deposit_percentage: parseInt(depositPercentage)
      });

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/orders/${response.data.order.id}`);
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="empty-cart">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some products to get started</p>
          <Button onClick={() => navigate('/products')} className="rounded-full" data-testid="browse-products-btn">
            Browse Products
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8" data-testid="cart-page">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-5xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => step === 'cart' ? navigate('/products') : setStep('cart')}
              data-testid="back-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {step === 'cart' && 'Shopping Cart'}
              {step === 'delivery' && 'Delivery Details'}
              {step === 'payment' && 'Payment'}
            </h1>
          </div>
          <span className="text-muted-foreground">{items.length} items</span>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['cart', 'delivery', 'payment'].map((s, i) => (
            <React.Fragment key={s}>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === s ? 'bg-primary text-primary-foreground' : 
                  ['cart', 'delivery', 'payment'].indexOf(step) > i ? 'bg-secondary text-secondary-foreground' : 
                  'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {step === 'cart' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-brutalist p-4 flex gap-4"
                    data-testid={`cart-item-${item.id}`}
                  >
                    {/* Item Image/Preview */}
                    <div 
                      className="w-24 h-24 rounded flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: item.customization_data?.colorHex || '#f5f5f5' }}
                    >
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{item.product_name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {item.size && <p>Size: {item.size}</p>}
                        {item.color && <p>Color: {item.color}</p>}
                        {item.print_method && <p>Print: {item.print_method}</p>}
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-border rounded">
                          <button 
                            className="p-2 hover:bg-muted"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`decrease-${item.id}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 font-medium">{item.quantity}</span>
                          <button 
                            className="p-2 hover:bg-muted"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`increase-${item.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button 
                          className="p-2 text-destructive hover:bg-destructive/10 rounded"
                          onClick={() => removeItem(item.id)}
                          data-testid={`remove-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className="font-bold">TZS {item.subtotal.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        TZS {item.unit_price.toLocaleString()} each
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {step === 'delivery' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-brutalist p-6 space-y-4"
              >
                <h2 className="font-bold text-lg mb-4">Delivery Information</h2>
                
                <div>
                  <Label>Delivery Address *</Label>
                  <Textarea 
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Full address including city and region"
                    className="mt-1"
                    data-testid="delivery-address"
                  />
                </div>
                
                <div>
                  <Label>Phone Number *</Label>
                  <Input 
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className="mt-1"
                    data-testid="delivery-phone"
                  />
                </div>
                
                <div>
                  <Label>Order Notes (optional)</Label>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special instructions, preferred delivery time, etc."
                    className="mt-1"
                    data-testid="order-notes"
                  />
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Deposit Selection */}
                <div className="card-brutalist p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5" /> Deposit Amount
                  </h2>
                  
                  <RadioGroup value={depositPercentage} onValueChange={setDepositPercentage}>
                    {[
                      { value: '30', label: '30% Deposit', desc: 'Standard option' },
                      { value: '50', label: '50% Deposit', desc: 'Priority processing' },
                      { value: '100', label: '100% Full Payment', desc: 'Get 5% discount' },
                    ].map((option) => (
                      <div 
                        key={option.value}
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${
                          depositPercentage === option.value ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => setDepositPercentage(option.value)}
                        data-testid={`deposit-${option.value}`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="font-medium cursor-pointer">{option.label}</Label>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">TZS {(total * parseInt(option.value) / 100).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Points Redemption */}
                {user && user.points > 0 && (
                  <div className="card-brutalist p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Wallet className="w-5 h-5" /> Use Points
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      You have <span className="font-bold text-secondary">{user.points} points</span>. 
                      10 points = TZS 100 discount.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number"
                        value={pointsToUse}
                        onChange={(e) => setPointsToUse(Math.min(user.points, Math.max(0, parseInt(e.target.value) || 0)))}
                        max={user.points}
                        className="w-32"
                        data-testid="points-input"
                      />
                      <span className="text-sm text-muted-foreground">
                        = TZS {pointsDiscount.toLocaleString()} discount
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Method (Mock) */}
                <div className="card-brutalist p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Payment Method
                  </h2>
                  <div className="bg-muted/50 p-4 rounded-lg text-center">
                    <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Payment integration coming soon. Click "Place Order" to create your order, 
                      and our team will contact you for payment details.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-brutalist p-6 sticky top-24"
            >
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>TZS {total.toLocaleString()}</span>
                </div>
                
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Points Discount</span>
                    <span>-TZS {pointsDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                {step === 'payment' && (
                  <div className="flex justify-between text-primary">
                    <span>Deposit Due ({depositPercentage}%)</span>
                    <span className="font-bold">TZS {depositAmount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>TZS {(total - pointsDiscount).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6">
                {step === 'cart' && (
                  <Button 
                    onClick={() => setStep('delivery')}
                    className="w-full btn-gamified"
                    data-testid="proceed-to-delivery"
                  >
                    Proceed to Delivery <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                
                {step === 'delivery' && (
                  <Button 
                    onClick={() => setStep('payment')}
                    disabled={!deliveryAddress || !deliveryPhone}
                    className="w-full btn-gamified"
                    data-testid="proceed-to-payment"
                  >
                    Proceed to Payment <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                
                {step === 'payment' && (
                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full btn-gamified"
                    data-testid="place-order-btn"
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                Secure checkout • 7-day quality guarantee
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
