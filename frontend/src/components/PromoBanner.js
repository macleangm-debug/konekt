import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Tag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PromoBanner() {
  const [offer, setOffer] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    fetchActiveOffer();
  }, []);

  useEffect(() => {
    if (!offer) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(offer.end_date);
      const now = new Date();
      const diff = endDate - now;

      if (diff <= 0) {
        setOffer(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [offer]);

  const fetchActiveOffer = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/offers/active`);
      const offers = response.data.offers || [];
      if (offers.length > 0) {
        setOffer(offers[0]); // Show first active offer
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    }
  };

  if (!offer || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-secondary via-yellow-400 to-secondary text-primary overflow-hidden"
        data-testid="promo-banner"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Offer Info */}
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              <span className="font-bold">{offer.title}</span>
              {offer.code && (
                <span className="bg-primary text-white px-2 py-0.5 rounded text-sm font-mono">
                  {offer.code}
                </span>
              )}
            </div>
            
            {/* Countdown */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Ends in:</span>
              <div className="flex gap-1">
                {timeLeft.days > 0 && (
                  <span className="bg-primary/20 px-2 py-0.5 rounded font-bold">
                    {timeLeft.days}d
                  </span>
                )}
                <span className="bg-primary/20 px-2 py-0.5 rounded font-bold">
                  {timeLeft.hours}h
                </span>
                <span className="bg-primary/20 px-2 py-0.5 rounded font-bold">
                  {timeLeft.minutes}m
                </span>
              </div>
            </div>
            
            {/* CTA */}
            <Link 
              to="/products"
              className="flex items-center gap-1 bg-primary text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Shop Now <ArrowRight className="w-4 h-4" />
            </Link>
            
            {/* Close Button */}
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-primary/20 rounded-full transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
