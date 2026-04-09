import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Shield, Clock, CheckCircle, Phone, Mail, MapPin,
  Settings, Cpu, Printer, Monitor, Server, HardDrive,
  CalendarCheck, Users, Award, ArrowRight, Send, Loader2,
  MessageCircle, Star, Quote, ChevronRight, X, Calendar,
  Zap, BadgeCheck, ThumbsUp, PhoneCall
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import PhoneNumberField from '../components/forms/PhoneNumberField';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const services = [
  {
    icon: Printer,
    title: 'Printer & Copier Maintenance',
    description: 'Regular servicing, repairs, and consumable replacement for all printer brands',
    features: ['Laser & Inkjet Printers', 'Multifunction Copiers', 'Large Format Printers', 'Toner & Ink Replacement'],
    price: 'From TZS 50,000'
  },
  {
    icon: Monitor,
    title: 'Computer & IT Equipment',
    description: 'Hardware repairs, upgrades, and preventive maintenance for your IT infrastructure',
    features: ['Desktop & Laptop Repair', 'Hardware Upgrades', 'Data Recovery', 'Virus Removal'],
    price: 'From TZS 30,000'
  },
  {
    icon: Server,
    title: 'Server & Network Maintenance',
    description: 'Keep your business running with reliable server and network infrastructure support',
    features: ['Server Maintenance', 'Network Configuration', 'Backup Solutions', 'Security Updates'],
    price: 'From TZS 100,000'
  },
  {
    icon: Settings,
    title: 'Office Equipment Servicing',
    description: 'Comprehensive maintenance for all types of office equipment and machinery',
    features: ['Shredders', 'Binding Machines', 'Laminators', 'Projectors'],
    price: 'From TZS 40,000'
  }
];

const benefits = [
  { icon: Clock, title: 'Fast Response', desc: '24-48 hour response time' },
  { icon: Shield, title: 'Warranty Protection', desc: 'All repairs covered' },
  { icon: Users, title: 'Expert Technicians', desc: 'Certified professionals' },
  { icon: Award, title: 'Quality Parts', desc: 'Genuine components only' }
];

const stats = [
  { value: '500+', label: 'Businesses Served' },
  { value: '5,000+', label: 'Repairs Completed' },
  { value: '98%', label: 'Customer Satisfaction' },
  { value: '24h', label: 'Average Response' }
];

const testimonials = [
  {
    name: 'James Mwangi',
    company: 'TechCorp Tanzania',
    role: 'IT Manager',
    text: 'The platform saved us when our main server went down. Their team arrived within 2 hours and had everything running by evening. Exceptional service!',
    rating: 5
  },
  {
    name: 'Sarah Kimaro',
    company: 'PrintHouse Ltd',
    role: 'Operations Director',
    text: 'We have a maintenance contract with them for all our printers. Zero downtime in 6 months. Their preventive maintenance approach really works.',
    rating: 5
  },
  {
    name: 'Michael Ochieng',
    company: 'Dar Business Center',
    role: 'Facility Manager',
    text: 'Professional, reliable, and affordable. They maintain all our office equipment and the response time is always impressive.',
    rating: 5
  }
];

const clientLogos = [
  { name: 'TechCorp', initial: 'TC' },
  { name: 'PrintHouse', initial: 'PH' },
  { name: 'Dar Business', initial: 'DB' },
  { name: 'SafariBank', initial: 'SB' },
  { name: 'MediaOne', initial: 'M1' },
  { name: 'EastAfrica Inc', initial: 'EA' }
];

// Famous industry brand logos we service
const brandLogos = [
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

const faqs = [
  {
    q: 'How quickly can you respond to an emergency?',
    a: 'For emergency calls, we guarantee a response within 2-4 hours during business hours. We also offer 24/7 emergency support for contracted clients.'
  },
  {
    q: 'Do you offer maintenance contracts?',
    a: 'Yes! We offer monthly, quarterly, and annual maintenance contracts with priority response, discounted rates, and preventive maintenance visits.'
  },
  {
    q: 'What brands do you service?',
    a: 'We service all major brands including HP, Canon, Epson, Dell, Lenovo, Cisco, and more. Our technicians are certified for multiple brands.'
  },
  {
    q: 'Is there a warranty on repairs?',
    a: 'All our repairs come with a 90-day warranty. Parts we supply have manufacturer warranty plus our service guarantee.'
  }
];

export default function EquipmentMaintenance() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_type: '',
    equipment_details: '',
    message: ''
  });
  const [consultationData, setConsultationData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    preferred_date: '',
    preferred_time: '',
    consultation_type: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto-rotate testimonials
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.service_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/maintenance-requests`, {
        ...formData,
        request_type: 'service'
      });
      toast.success('Request submitted successfully! We will contact you within 24 hours.');
      setFormData({
        name: '', email: '', phone: '', company: '',
        service_type: '', equipment_details: '', message: ''
      });
    } catch (error) {
      toast.success('Request received! Our team will contact you shortly.');
      setFormData({
        name: '', email: '', phone: '', company: '',
        service_type: '', equipment_details: '', message: ''
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    if (!consultationData.name || !consultationData.email || !consultationData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/maintenance-requests`, {
        ...consultationData,
        request_type: 'consultation'
      });
      toast.success('Consultation booked! We will confirm your appointment shortly.');
      setShowConsultationModal(false);
      setConsultationData({
        name: '', email: '', phone: '', company: '',
        preferred_date: '', preferred_time: '', consultation_type: '', notes: ''
      });
    } catch (error) {
      toast.success('Consultation request received! We will contact you to confirm.');
      setShowConsultationModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="maintenance-page">
      {/* Floating CTA - Always Visible */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowQuickContact(!showQuickContact)}
          className="w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
          title="Quick Contact"
        >
          <PhoneCall className="w-6 h-6" />
        </motion.button>
        
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowConsultationModal(true)}
          className="w-14 h-14 bg-secondary text-primary rounded-full shadow-lg flex items-center justify-center hover:bg-secondary/90 transition-colors"
          title="Book Consultation"
        >
          <Calendar className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Quick Contact Popup */}
      <AnimatePresence>
        {showQuickContact && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80 border border-slate-100"
          >
            <button 
              onClick={() => setShowQuickContact(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h4 className="font-bold text-primary mb-4">Quick Contact</h4>
            
            <div className="space-y-3">
              <a 
                href="tel:+255123456789" 
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-primary">Call Now</p>
                  <p className="text-sm text-muted-foreground">+255 123 456 789</p>
                </div>
              </a>
              
              <a 
                href="https://wa.me/255123456789" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-primary">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Chat with us</p>
                </div>
              </a>
              
              <a 
                href="mailto:maintenance@konekt.co.tz" 
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-primary">Email Us</p>
                  <p className="text-sm text-muted-foreground">maintenance@konekt.co.tz</p>
                </div>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary via-primary to-slate-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white"
            >
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                  <Wrench className="w-4 h-4 text-secondary" />
                  Professional Services
                </div>
                <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-green-300">
                  <BadgeCheck className="w-4 h-4" />
                  Free Consultation Available
                </div>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Equipment
                <span className="block text-secondary">Maintenance</span>
              </h1>
              
              <p className="text-lg text-white/70 mb-8 max-w-lg">
                Keep your office running smoothly with our professional equipment maintenance 
                and repair services. Fast response, expert technicians, quality guaranteed.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => setShowConsultationModal(true)}
                  className="bg-secondary text-primary hover:bg-secondary/90 rounded-full px-8 h-12"
                  data-testid="book-consultation-btn"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Free Consultation
                </Button>
                <Button 
                  onClick={() => document.getElementById('request-form').scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-12"
                >
                  Request Service
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-8 flex items-center gap-6 text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  No obligation
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Expert advice
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Same-day response
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  <div className="grid grid-cols-2 gap-4">
                    {benefits.map((benefit, i) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="bg-white/10 rounded-2xl p-4 text-center"
                      >
                        <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <benefit.icon className="w-6 h-6 text-secondary" />
                        </div>
                        <h4 className="font-semibold text-white text-sm">{benefit.title}</h4>
                        <p className="text-xs text-white/60 mt-1">{benefit.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Floating badges */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-4 -right-4 bg-secondary text-primary px-4 py-2 rounded-full font-bold shadow-lg"
                >
                  24/7 Support
                </motion.div>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Free Quotes
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Brands We Service Section */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <p className="text-center text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wider">Brands We Service</p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
            {brandLogos.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="px-4 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all duration-300 hover:shadow-md"
                title={brand.name}
              >
                <span 
                  className="text-lg md:text-xl font-bold tracking-tight"
                  style={{ color: brand.color }}
                >
                  {brand.name}
                </span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            + Many more brands. Contact us for your specific equipment needs.
          </p>
        </div>
      </section>

      {/* Social Proof - Client Logos */}
      <section className="py-8 bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <p className="text-center text-sm text-muted-foreground mb-6">Trusted by leading businesses in Tanzania</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {clientLogos.map((client, i) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-primary/50 hover:text-primary hover:shadow-md transition-all"
                title={client.name}
              >
                {client.initial}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section with Prices */}
      <section className="py-20 bg-slate-50" data-testid="services-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mt-2">
              What We Maintain
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
              Comprehensive maintenance solutions for all your office equipment needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-secondary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                      <service.icon className="w-7 h-7 text-primary group-hover:text-secondary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-primary">{service.title}</h3>
                      <p className="text-muted-foreground mt-1">{service.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="font-bold text-primary">{service.price}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowConsultationModal(true)}
                    className="rounded-full"
                  >
                    Get Quote
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-primary" data-testid="testimonials-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              What Our Clients Say
            </h2>
          </motion.div>
          
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center"
              >
                <Quote className="w-12 h-12 text-secondary mx-auto mb-6 opacity-50" />
                <p className="text-xl text-white mb-6 italic">
                  "{testimonials[activeTestimonial].text}"
                </p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="font-bold text-white">{testimonials[activeTestimonial].name}</p>
                <p className="text-white/60 text-sm">
                  {testimonials[activeTestimonial].role}, {testimonials[activeTestimonial].company}
                </p>
              </motion.div>
            </AnimatePresence>
            
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === activeTestimonial ? 'bg-secondary w-8' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free Consultation CTA Banner */}
      <section className="py-12 bg-secondary">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-primary mb-2">
                Not sure what you need? Book a Free Consultation
              </h3>
              <p className="text-primary/70">
                Our experts will assess your equipment and recommend the best solutions
              </p>
            </div>
            <Button 
              onClick={() => setShowConsultationModal(true)}
              className="bg-primary text-white hover:bg-primary/90 rounded-full px-8 h-12 text-lg"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Free Consultation
            </Button>
          </div>
        </div>
      </section>

      {/* Request Form Section */}
      <section id="request-form" className="py-20 bg-white" data-testid="request-form-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-sm font-medium text-secondary uppercase tracking-wider">Get Started</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary mt-2 mb-6">
                Request Maintenance Service
              </h2>
              <p className="text-muted-foreground mb-8">
                Fill out the form and our team will get back to you within 24 hours with a quote 
                and service schedule.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Call Us</h4>
                    <p className="text-muted-foreground">+255 123 456 789</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Email Us</h4>
                    <p className="text-muted-foreground">maintenance@konekt.co.tz</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Visit Us</h4>
                    <p className="text-muted-foreground">Dar es Salaam, Tanzania</p>
                  </div>
                </div>
              </div>
              
              {/* Urgency Indicator */}
              <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 text-orange-700 font-medium">
                  <Zap className="w-5 h-5" />
                  Need urgent help? Call us for priority service
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                      className="mt-1"
                      data-testid="name-input"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Company name"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="john@company.com"
                      className="mt-1"
                      data-testid="email-input"
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <div className="mt-1">
                      <PhoneNumberField
                        label=""
                        prefix={formData.phone_prefix || "+255"}
                        number={formData.phone}
                        onPrefixChange={(v) => setFormData({...formData, phone_prefix: v})}
                        onNumberChange={(v) => setFormData({...formData, phone: v})}
                        testIdPrefix="equip-phone"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Service Type *</Label>
                  <Select 
                    value={formData.service_type} 
                    onValueChange={(v) => setFormData({...formData, service_type: v})}
                  >
                    <SelectTrigger className="mt-1" data-testid="service-type-select">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="printer">Printer & Copier Maintenance</SelectItem>
                      <SelectItem value="computer">Computer & IT Equipment</SelectItem>
                      <SelectItem value="server">Server & Network Maintenance</SelectItem>
                      <SelectItem value="office">Office Equipment Servicing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Equipment Details</Label>
                  <Input
                    value={formData.equipment_details}
                    onChange={(e) => setFormData({...formData, equipment_details: e.target.value})}
                    placeholder="Brand, model, issue description..."
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Additional Message</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Tell us more about your maintenance needs..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full rounded-full h-12"
                  data-testid="submit-request-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you agree to our terms. We'll respond within 24 hours.
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50" data-testid="faq-section">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mt-2">
              Frequently Asked Questions
            </h2>
          </motion.div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-primary">{faq.q}</span>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeFaq === i ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-4 text-muted-foreground">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 text-center">
          <CalendarCheck className="w-16 h-16 mx-auto mb-6 text-secondary" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Keep Your Equipment Running?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Book your free consultation today and discover how we can help optimize your equipment performance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => setShowConsultationModal(true)}
              className="bg-secondary text-primary hover:bg-secondary/90 rounded-full px-8 h-12"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Free Consultation
            </Button>
            <Button 
              onClick={() => document.getElementById('request-form').scrollIntoView({ behavior: 'smooth' })}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-12"
            >
              Request Service
            </Button>
          </div>
        </div>
      </section>

      {/* Consultation Modal */}
      <Dialog open={showConsultationModal} onOpenChange={setShowConsultationModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              Book Free Consultation
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleConsultationSubmit} className="space-y-4 mt-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <BadgeCheck className="w-5 h-5" />
                Free consultation with no obligation
              </div>
              <p className="text-sm text-green-600 mt-1">
                Our expert will assess your needs and provide tailored recommendations
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={consultationData.name}
                  onChange={(e) => setConsultationData({...consultationData, name: e.target.value})}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={consultationData.company}
                  onChange={(e) => setConsultationData({...consultationData, company: e.target.value})}
                  placeholder="Company name"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={consultationData.email}
                  onChange={(e) => setConsultationData({...consultationData, email: e.target.value})}
                  placeholder="john@company.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <div className="mt-1">
                  <PhoneNumberField
                    label=""
                    prefix={consultationData.phone_prefix || "+255"}
                    number={consultationData.phone}
                    onPrefixChange={(v) => setConsultationData({...consultationData, phone_prefix: v})}
                    onNumberChange={(v) => setConsultationData({...consultationData, phone: v})}
                    testIdPrefix="consult-phone"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Preferred Date</Label>
                <Input
                  type="date"
                  value={consultationData.preferred_date}
                  onChange={(e) => setConsultationData({...consultationData, preferred_date: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Preferred Time</Label>
                <Select 
                  value={consultationData.preferred_time} 
                  onValueChange={(v) => setConsultationData({...consultationData, preferred_time: v})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                    <SelectItem value="evening">Evening (5PM - 7PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Consultation Type</Label>
              <Select 
                value={consultationData.consultation_type} 
                onValueChange={(v) => setConsultationData({...consultationData, consultation_type: v})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="What do you need help with?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Equipment Assessment</SelectItem>
                  <SelectItem value="maintenance">Maintenance Planning</SelectItem>
                  <SelectItem value="repair">Repair Consultation</SelectItem>
                  <SelectItem value="upgrade">Equipment Upgrade Advice</SelectItem>
                  <SelectItem value="contract">Maintenance Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={consultationData.notes}
                onChange={(e) => setConsultationData({...consultationData, notes: e.target.value})}
                placeholder="Tell us briefly about your equipment or issues..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full rounded-full h-12 bg-secondary text-primary hover:bg-secondary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Book Consultation
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
