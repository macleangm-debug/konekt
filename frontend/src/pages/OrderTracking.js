import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Check, Clock, Truck, Camera, CreditCard, 
  ChevronLeft, ArrowRight, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Received', icon: Package, description: 'We received your order' },
  { key: 'deposit_paid', label: 'Deposit Paid', icon: CreditCard, description: 'Payment confirmed' },
  { key: 'design_review', label: 'Design Review', icon: Clock, description: 'Reviewing your design' },
  { key: 'approved', label: 'Approved', icon: Check, description: 'Design approved' },
  { key: 'printing', label: 'Printing', icon: Camera, description: 'Production in progress' },
  { key: 'quality_check', label: 'Quality Check', icon: Check, description: 'Inspecting final product' },
  { key: 'ready', label: 'Ready', icon: Package, description: 'Ready for delivery' },
  { key: 'delivered', label: 'Delivered', icon: Truck, description: 'Order delivered' },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDeposit = async () => {
    try {
      await axios.post(`${API_URL}/api/orders/${orderId}/pay-deposit`);
      toast.success('Deposit payment successful!');
      fetchOrder();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error.response?.data?.detail || 'Payment failed');
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const index = STATUS_STEPS.findIndex(s => s.key === order.current_status);
    return index === -1 ? 0 : index;
  };

  const progressPercentage = ((getCurrentStepIndex() + 1) / STATUS_STEPS.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Order not found</h2>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8" data-testid="order-tracking-page">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
              <p className="text-muted-foreground">
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">TZS {order.total_amount.toLocaleString()}</div>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-brutalist p-6 mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Order Progress</h2>
            <span className="text-primary font-bold">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </motion.div>

        {/* Deposit Alert */}
        {!order.deposit_paid && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-brutalist p-6 bg-accent/10 border-accent mb-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Deposit Required
                </h3>
                <p className="text-muted-foreground">
                  Pay your deposit to start production
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">
                  TZS {order.deposit_amount.toLocaleString()}
                </div>
                <Button 
                  onClick={handlePayDeposit}
                  className="mt-2 bg-accent hover:bg-accent/90"
                  data-testid="pay-deposit-btn"
                >
                  Pay Deposit (Mock)
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-brutalist p-6 mb-8"
        >
          <h2 className="font-bold text-lg mb-6">Order Timeline</h2>
          
          <div className="space-y-1">
            {STATUS_STEPS.map((step, index) => {
              const currentIndex = getCurrentStepIndex();
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;
              
              const historyItem = order.status_history?.find(h => h.status === step.key);
              
              return (
                <div 
                  key={step.key}
                  className={`relative flex gap-4 pb-8 last:pb-0 ${
                    isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  data-testid={`status-${step.key}`}
                >
                  {/* Line */}
                  {index < STATUS_STEPS.length - 1 && (
                    <div 
                      className={`absolute left-5 top-10 w-0.5 h-full -ml-px ${
                        isCompleted ? 'bg-secondary' : 'bg-border'
                      }`}
                    />
                  )}
                  
                  {/* Icon */}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? 'bg-primary text-primary-foreground animate-pulse' :
                      isCompleted ? 'bg-secondary text-secondary-foreground' : 
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{step.label}</span>
                      {isCurrent && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    
                    {historyItem && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(historyItem.completed_at).toLocaleString()}
                      </div>
                    )}
                    
                    {historyItem?.image_url && (
                      <img 
                        src={historyItem.image_url} 
                        alt="Production update"
                        className="mt-2 w-32 h-32 object-cover rounded-lg border border-border"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-brutalist p-6 mb-8"
        >
          <h2 className="font-bold text-lg mb-4">Order Items</h2>
          
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
              >
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{item.product_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.size && `Size: ${item.size}`}
                    {item.color && ` • Color: ${item.color}`}
                    {item.print_method && ` • ${item.print_method}`}
                  </p>
                  <p className="text-sm">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold">TZS {item.subtotal.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Delivery Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-brutalist p-6"
        >
          <h2 className="font-bold text-lg mb-4">Delivery Information</h2>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{order.delivery_address}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{order.delivery_phone}</div>
            </div>
            {order.notes && (
              <div className="sm:col-span-2">
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium">{order.notes}</div>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Balance Due</div>
                <div className="text-xl font-bold">
                  TZS {order.balance_due.toLocaleString()}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                order.deposit_paid 
                  ? 'bg-secondary/20 text-secondary-foreground' 
                  : 'bg-accent/20 text-accent'
              }`}>
                {order.deposit_paid ? 'Deposit Paid' : 'Awaiting Payment'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
