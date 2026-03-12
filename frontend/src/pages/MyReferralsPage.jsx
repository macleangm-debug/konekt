import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Gift, Copy, Share2, Users, TrendingUp, Award, 
  Loader2, ExternalLink, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { referralApi } from "../lib/referralApi";

export default function MyReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await referralApi.getMyReferrals();
        setData(res.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load referral data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const referralLink = useMemo(() => {
    if (!data?.referral_code) return "";
    return `${window.location.origin}/r/${data.referral_code}`;
  }, [data?.referral_code]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data?.referral_code || "");
      toast.success("Referral code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const shareText = useMemo(() => {
    const message = data?.whatsapp_message || data?.share_message || 
      "Join Konekt with my referral link: {referral_link}";
    return message.replace("{referral_link}", referralLink);
  }, [data, referralLink]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="my-referrals-page">
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-primary">My Referrals</h1>
          <p className="mt-2 text-slate-600">
            Share your code, track referrals, and grow your rewards.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Referral Code</p>
                <p className="text-2xl font-bold font-mono text-primary mt-1">
                  {data?.referral_code || "-"}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {data?.total_referrals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {data?.successful_referrals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-[#D4A843] mt-1">
                  {(data?.total_earned || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#D4A843]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#D4A843]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Share Your Link</h2>
              <p className="text-sm text-muted-foreground">
                Invite friends and earn rewards when they make their first purchase
              </p>
            </div>
          </div>

          {/* Referral Link Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 mb-1">Your Referral Link</p>
                <p className="text-sm font-mono text-slate-700 truncate" data-testid="referral-link">
                  {referralLink || "No referral link available"}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyLink}
                className="flex-shrink-0"
                data-testid="copy-link-btn"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
          </div>

          {/* Referral Code Box */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-primary/70 mb-1">Your Referral Code</p>
                <p className="text-2xl font-bold font-mono text-primary" data-testid="referral-code">
                  {data?.referral_code || "-"}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={copyCode}
                className="border-primary/30 text-primary hover:bg-primary/10"
                data-testid="copy-code-btn"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Code
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
              data-testid="share-whatsapp-btn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
              data-testid="share-facebook-btn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Share on Facebook
            </a>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
              data-testid="share-twitter-btn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </a>

            <a
              href={`mailto:?subject=Join Konekt&body=${encodeURIComponent(shareText)}`}
              className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium transition-all"
              data-testid="share-email-btn"
            >
              <ExternalLink className="w-4 h-4" />
              Share via Email
            </a>
          </div>
        </motion.div>

        {/* Referral Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-primary">Referral Activity</h2>
            <p className="text-sm text-muted-foreground">
              Track who you've referred and your rewards
            </p>
          </div>

          {!data?.referral_transactions?.length ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No referrals yet</h3>
              <p className="text-muted-foreground mt-1">
                Share your link and start earning rewards!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.referral_transactions.map((txn, idx) => (
                <motion.div
                  key={txn.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.status === 'credited' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {txn.status === 'credited' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {txn.referee_email || txn.referred_email || "Referral"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {txn.created_at 
                            ? new Date(txn.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : "-"
                          }
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge className={
                        txn.status === 'credited' 
                          ? 'bg-green-100 text-green-700' 
                          : txn.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }>
                        {txn.status}
                      </Badge>
                      {txn.reward_amount > 0 && (
                        <p className="text-sm font-semibold text-[#D4A843] mt-1">
                          +{txn.reward_amount.toLocaleString()} reward
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-primary to-[#3d5166] rounded-2xl p-6 md:p-8 text-white"
        >
          <h2 className="text-xl font-bold mb-6">How Referrals Work</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Share Your Link", desc: "Send your unique referral link to friends and colleagues" },
              { step: "2", title: "They Sign Up", desc: "When they create an account using your link, they get a discount" },
              { step: "3", title: "You Earn Rewards", desc: "When they make their first purchase, you earn points and credits" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#D4A843] text-slate-900 flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-slate-300 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
