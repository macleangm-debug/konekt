import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    const hasShown = sessionStorage.getItem('exitPopupShown');
    if (hasShown) {
      setDismissed(true);
      return;
    }

    const handleMouseLeave = (e) => {
      // Only trigger when mouse leaves from the top
      if (e.clientY <= 0 && !dismissed && !show) {
        setShow(true);
        sessionStorage.setItem('exitPopupShown', 'true');
      }
    };

    // Also show after 30 seconds of inactivity
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (!dismissed && !show && !sessionStorage.getItem('exitPopupShown')) {
          setShow(true);
          sessionStorage.setItem('exitPopupShown', 'true');
        }
      }, 45000); // 45 seconds
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keypress', resetTimer);
    resetTimer();

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousemove', resetTimer);
      document.removeEventListener('keypress', resetTimer);
      clearTimeout(inactivityTimer);
    };
  }, [dismissed, show]);

  const handleClose = () => {
    setShow(false);
    setDismissed(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    // In production, this would save to database/email service
    setSubmitted(true);
    toast.success('Thanks! Check your email for your discount code.');
    setTimeout(() => {
      setShow(false);
    }, 3000);
  };

  if (dismissed && !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Gift className="w-10 h-10 text-primary" />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">Wait! Don't Leave Empty-Handed</h2>
              <p className="text-white/80">Get an exclusive discount on your first order</p>
            </div>
            
            {/* Body */}
            <div className="p-8">
              {!submitted ? (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary font-bold text-3xl px-6 py-3 rounded-2xl">
                      <Sparkles className="w-6 h-6" />
                      10% OFF
                    </div>
                    <p className="text-muted-foreground mt-3">
                      Enter your email to receive your exclusive discount code
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        data-testid="exit-popup-email"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-secondary text-primary hover:bg-secondary/90 rounded-full"
                      data-testid="exit-popup-submit"
                    >
                      Get My Discount
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                  
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    No spam, just great offers. Unsubscribe anytime.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">You're All Set!</h3>
                  <p className="text-muted-foreground">
                    Check your email for your exclusive 10% discount code.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
