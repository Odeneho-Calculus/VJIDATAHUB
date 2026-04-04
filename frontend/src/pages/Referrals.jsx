import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { 
  Users, 
  Gift, 
  TrendingUp, 
  Copy, 
  Check, 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Share2
} from 'lucide-react';
import { user as userAPI } from '../services/api';
import UserLayout from '../components/UserLayout';

export default function Referrals() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('my-referrals');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, leaderboardRes] = await Promise.all([
        userAPI.getReferralStats(),
        userAPI.getReferralLeaderboard()
      ]);

      if (statsRes.success) {
        setStats(statsRes.data.stats);
        setReferrals(statsRes.data.referrals);
      }
      if (leaderboardRes.success) {
        setLeaderboard(leaderboardRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="text-green-500 w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="text-blue-500 w-4 h-4" />;
      case 'rejected': return <XCircle className="text-red-500 w-4 h-4" />;
      default: return <Clock className="text-yellow-500 w-4 h-4" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Referral Program</h1>
              <p className="text-sm text-slate-500 mt-1">Invite friends and earn rewards for every successful referral</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
              >
                {copied ? <Check size={18} /> : <Share2 size={18} />}
                {copied ? 'Copied Link!' : 'Copy Referral Link'}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Users size={20} />
                </div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Total Referrals</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalReferrals || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                  <Clock size={20} />
                </div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Pending</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.pendingReferrals || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <Gift size={20} />
                </div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Paid Rewards</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.paidReferrals || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <TrendingUp size={20} />
                </div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Total Earnings</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(stats?.totalEarnings || 0)}</p>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('my-referrals')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                  activeTab === 'my-referrals' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                My Referrals
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                  activeTab === 'leaderboard' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Leaderboard
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-slate-500">Loading data...</p>
                </div>
              ) : activeTab === 'my-referrals' ? (
                <div className="space-y-4">
                  {referrals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium">No referrals yet</p>
                      <p className="text-sm text-slate-500 mt-1">Share your link to start earning!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 font-bold">User</th>
                            <th className="px-6 py-4 font-bold">Date Joined</th>
                            <th className="px-6 py-4 font-bold">Reward</th>
                            <th className="px-6 py-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {referrals.map((ref) => (
                            <tr key={ref._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900">{ref.referredUser?.name}</div>
                                <div className="text-xs text-slate-400">{ref.referredUser?.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                {new Date(ref.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">
                                GHS {formatCurrencyAbbreviated(ref.amount)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(ref.status)}`}>
                                  {getStatusIcon(ref.status)}
                                  {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-500 font-medium">No ranking data available</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 max-w-2xl mx-auto">
                      {leaderboard.map((user, index) => (
                        <div key={user._id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-amber-100 text-amber-600' : 
                            index === 1 ? 'bg-slate-200 text-slate-600' :
                            index === 2 ? 'bg-orange-100 text-orange-600' :
                            'bg-white text-slate-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">Top Referrer</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{formatCurrencyAbbreviated(user.referralEarnings)}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Earnings</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
            <h2 className="text-xl font-bold mb-6">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">1</div>
                <h3 className="font-bold">Share your link</h3>
                <p className="text-sm text-blue-100">Copy your unique referral link and share it with your friends via social media or email.</p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">2</div>
                <h3 className="font-bold">They join VJI DATA HUB </h3>
                <p className="text-sm text-blue-100">Your friend creates an account using your link and starts using our platform.</p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">3</div>
                <h3 className="font-bold">Get rewarded</h3>
                <p className="text-sm text-blue-100">Once their account is verified, you receive your referral reward directly in your wallet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
