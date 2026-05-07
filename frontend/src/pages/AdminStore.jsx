import React, { useState, useEffect } from 'react';
import {
  AlertCircle, Lock, Layout, RefreshCw, Save, X, Palette, Smartphone, CreditCard, Search, Share2, Settings, Mail, Phone, ExternalLink, Zap, ShieldCheck, Sparkles, Activity
} from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import AlertModal from '../components/AlertModal';

export default function AdminStore() {
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const data = await storeAPI.getMyStore();
      setStoreData({
        ...data.store,
        accessStatus: data.accessStatus || null,
        adminContact: data.adminContact || null,
      });
    } catch {
      // Error handled by loading state or silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AgentLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(17,17,17,0.1)', borderTopColor: '#111', borderRadius: '50%', animation: 'str-spin 0.8s linear infinite' }}></div>
          <style>{`@keyframes str-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AgentLayout>
    );
  }

  const accessStatus = storeData?.accessStatus || {};
  const isAccessible = accessStatus.isAccessible !== false;

  return (
    <AgentLayout>
      <div className="str-page-wrapper">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
          
          .str-page-wrapper {
            font-family: 'DM Sans', sans-serif;
            background-color: #f5f5f0;
            min-height: 100vh;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .str-main-card {
            background: #fff;
            border: 1.5px solid #e4e4de;
            border-radius: 14px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.10);
            width: 100%;
            max-width: 900px;
            padding: 24px;
            margin-bottom: 24px;
          }

          .str-heading-section {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
          }

          .str-icon-box {
            width: 46px;
            height: 46px;
            background: #111;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f0a500;
            flex-shrink: 0;
          }

          .str-h2 {
            font-size: 26px;
            font-weight: 800;
            color: #111;
            margin: 0;
            letter-spacing: -0.02em;
          }

          .str-tabs {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 32px;
          }

          @media (min-width: 640px) {
            .str-tabs {
              grid-template-columns: repeat(6, 1fr);
            }
          }

          .str-tab-btn {
            background: #fafaf7;
            border: 1.5px solid #e4e4de;
            border-radius: 10px;
            padding: 12px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .str-tab-btn.active {
            background: #111;
            color: #fff;
            border-color: #111;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .str-tab-btn span {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .str-input-group {
            margin-bottom: 20px;
          }

          .str-label {
            font-size: 12.5px;
            font-weight: 700;
            color: #333;
            letter-spacing: 0.02em;
            display: block;
            margin-bottom: 6px;
          }

          .str-input {
            background: #fafaf7;
            border: 1.5px solid #e0e0d8;
            border-radius: 7px;
            padding: 11px 14px;
            font-size: 14px;
            width: 100%;
            color: #111;
            transition: all 0.2s;
          }

          .str-input:focus {
            border-color: #111;
            box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
            background: #fff;
            outline: none;
          }

          .str-btn-primary {
            background: #111;
            color: #fff;
            border-radius: 7px;
            padding: 13px 20px;
            font-size: 14px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .str-btn-primary:hover {
            background: #222;
          }

          .str-banner {
            background: #fff5f5;
            border: 1.5px solid #fecaca;
            color: #b91c1c;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
        `}</style>

        {!isAccessible && (
          <div className="str-banner">
            <Lock size={24} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Store Locked</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                {accessStatus.code === 'AGENT_FEE_UNPAID' ? 'Please complete your activation fee to start selling.' : 'Your store has been suspended by an administrator.'}
              </div>
            </div>
            {accessStatus.code === 'AGENT_FEE_UNPAID' && (
              <button className="str-btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setActiveTab('billing')}>Pay Now</button>
            )}
          </div>
        )}

        <div className="str-main-card">
          <div className="str-heading-section">
            <div className="str-icon-box">
              <Layout size={24} />
            </div>
            <div>
              <h2 className="str-h2">{storeData?.name || 'My Store'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>{storeData?.slug}</span>
                <a href={`/store/${storeData?.slug}`} target="_blank" rel="noreferrer" style={{ color: '#111', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Visit <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          <div className="str-tabs">
            {[
              { id: 'general', label: 'General', icon: Palette },
              { id: 'plans', label: 'Plans', icon: Smartphone },
              { id: 'checkers', label: 'Checkers', icon: CreditCard },
              { id: 'orders', label: 'Sales', icon: Activity },
              { id: 'commissions', label: 'Earnings', icon: Zap },
              { id: 'billing', label: 'Billing', icon: Settings },
            ].map(tab => (
              <div
                key={tab.id}
                className={`str-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </div>
            ))}
          </div>

          <div style={{ minHeight: '300px' }}>
            {activeTab === 'general' && (
              <div style={{ animation: 'fade-in 0.3s' }}>
                <div className="str-input-group">
                  <label className="str-label">Store Name</label>
                  <input className="str-input" defaultValue={storeData?.name} placeholder="Enter store name" />
                </div>
                <div className="str-input-group">
                  <label className="str-label">Store Description</label>
                  <textarea className="str-input" rows="3" defaultValue={storeData?.description} placeholder="Tell customers about your store" />
                </div>
                <button className="str-btn-primary"><Save size={18} /> Save Settings</button>
              </div>
            )}
            
            {activeTab !== 'general' && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#666' }}>
                <p style={{ fontWeight: '700', marginBottom: '8px' }}>Section: {activeTab.toUpperCase()}</p>
                <p style={{ fontSize: '13px' }}>Configure your store's {activeTab} settings and data.</p>
              </div>
            )}
          </div>
        </div>

        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
        />
      </div>
    </AgentLayout>
  );
}
