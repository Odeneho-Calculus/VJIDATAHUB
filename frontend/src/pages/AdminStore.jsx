import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  AlertCircle, Lock, AlertTriangle, Plus, Edit2, Trash2, Eye, EyeOff,
  Settings, Layout, Image as ImageIcon, Globe, Share2,
  MessageSquare, Phone, Mail, Facebook, Instagram, Twitter, ExternalLink,
  Zap, ShieldCheck, Sparkles, Activity, Minus,
  RefreshCw, Save, X, Palette, Smartphone, CreditCard, Search, Filter,
  TrendingUp, Wallet, Send, ChevronRight, Loader2, ShoppingBag, CheckCircle, CheckCircle2, Clock, User
} from 'lucide-react';
import { store as storeAPI, wallet as walletAPI, afa as afaAPI } from '../services/api';
import { checkers as checkersAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import AlertModal from '../components/AlertModal';
// import { useSettings } from '../context/SettingsContext';

/* ── Multi-colour palette ── */
const palette = [
  { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' },   // purple
  { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5', glow: 'rgba(15,110,86,0.15)' },    // teal
  { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' },    // blue
  { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB', glow: 'rgba(180,83,9,0.15)' },     // amber
  { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8', glow: 'rgba(190,24,93,0.15)' },    // pink
  { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5', glow: 'rgba(220,38,38,0.15)' },    // coral/red
  { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF', glow: 'rgba(3,105,161,0.15)' },    // sky
  { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7', glow: 'rgba(77,124,15,0.15)' },    // lime/green
];

const getColor = (index) => palette[index % palette.length];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
    min-height: 100vh;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
    border: 1.5px solid #A7F3D0;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(15,110,86,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .dash-header {
      padding: 24px;
    }
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .dash-icon-box {
    width: 40px;
    height: 40px;
    background: #0F6E56;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(15,110,86,0.25);
  }

  .dash-h2 {
    font-size: 18px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (min-width: 768px) {
    .dash-h2 {
      font-size: 26px;
    }
    .dash-icon-box {
      width: 46px;
      height: 46px;
    }
  }

  .dash-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
    background: #111;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
    background: #fff;
    color: #111;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid #e4e4de;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .dash-table-container::-webkit-scrollbar {
    display: none;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .tab-button {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-radius: 12px;
    transition: all 0.2s;
    border: 1.5px solid #e4e4de;
    background: #fff;
    min-width: 100px;
  }

  .tab-button.active {
    background: #0F6E56;
    border-color: #0F6E56;
    color: #fff;
    box-shadow: 0 4px 12px rgba(15,110,86,0.2);
  }

  .tab-button:not(.active):hover {
    background: #ECFDF5;
    border-color: #A7F3D0;
    color: #0F6E56;
  }
`;

export default function AdminStore() {
  // const { settings } = useSettings();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type, message, title = '') => {
    setAlertConfig({ isOpen: true, type, message, title });
  };

  useEffect(() => {
    fetchStore();
  }, []);

  const navigate = useNavigate();

  const fetchStore = async () => {
    try {
      setLoading(true);
      const data = await storeAPI.getMyStore();
      setStoreData({
        ...data.store,
        accessStatus: data.accessStatus || null,
        adminContact: data.adminContact || null,
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex h-[80vh] items-center justify-center bg-[#f5f5f0]">
          <Loader2 className="w-10 h-10 text-[#0F6E56] animate-spin" />
        </div>
      </AgentLayout>
    );
  }

  const accessStatus = storeData?.accessStatus || {};
  const isAccessible = accessStatus.isAccessible !== false;
  const shouldLockSettings = !isAccessible && activeTab !== 'billing';

  return (
    <AgentLayout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          <div className="dash-header !p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-10 !h-10">
                  <Layout size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="dash-h2 !text-base sm:!text-xl">{storeData?.name || 'My Store'}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase truncate">/{storeData?.slug}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <a
                  href={`/store/${storeData?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="dash-btn-outline !py-1.5 !px-2.5 !text-[11px] sm:!text-sm"
                >
                  <ExternalLink size={14} />
                  <span className="hidden xs:inline">View Store</span>
                </a>
                <button
                  onClick={fetchStore}
                  className="p-1.5 text-slate-400 hover:text-[#0F6E56] transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Access Status Banner */}
          {!isAccessible && (
            <div className="dash-card border-red-200 bg-red-50/30">
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                  <Lock size={24} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-base font-bold text-slate-900">Action Required</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {accessStatus.code === 'AGENT_FEE_UNPAID' && 'Your agent registration fee is pending. Complete payment to start selling and earning commissions.'}
                    {accessStatus.code === 'STORE_TEMP_BANNED' && `Store suspended: ${storeData?.temporaryBanReason || 'Access suspended.'}`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {storeData?.adminContact?.email && (
                      <a href={`mailto:${storeData.adminContact.email}`} className="text-xs font-bold text-slate-500 hover:text-slate-700 underline flex items-center gap-1">
                        <Mail size={12} /> {storeData.adminContact.email}
                      </a>
                    )}
                    {storeData?.adminContact?.phone && (
                      <a href={`tel:${storeData.adminContact.phone}`} className="text-xs font-bold text-slate-500 hover:text-slate-700 underline flex items-center gap-1 ml-2">
                        <Phone size={12} /> {storeData.adminContact.phone}
                      </a>
                    )}
                  </div>
                </div>
                {accessStatus.code === 'AGENT_FEE_UNPAID' && (
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="dash-btn-primary !bg-red-600 hover:!bg-red-700"
                  >
                    Pay Activation Fee
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="dash-card border-rose-200 bg-rose-50 flex items-center gap-3 text-rose-700 py-4">
              <AlertCircle size={20} />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-3 min-w-max">
              {[
                { id: 'general', label: 'Details', icon: Palette },
                { id: 'plans', label: 'Data Plans', icon: Smartphone },
                { id: 'checkers', label: 'Checkers', icon: CreditCard },
                { id: 'afa', label: 'AFA', icon: User },
                { id: 'orders', label: 'Sales', icon: ShoppingBag },
                { id: 'commissions', label: 'Earnings', icon: Share2 },
                { id: 'billing', label: 'Billing', icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <tab.icon size={20} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="relative">
            {activeTab === 'general' && (
              <OverviewTab
                data={storeData}
                loading={loading}
                onRefresh={fetchStore}
                navigate={navigate}
                showAlert={showAlert}
              />
            )}
            {activeTab === 'plans' && (
              <InventoryTab
                plans={storeData.plans || []}
                activeProvider='topza'
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}
            {activeTab === 'checkers' && (
              <CheckerInventoryTab
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}
            {activeTab === 'afa' && (
              <AfaInventoryTab
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersTab />
            )}
            {activeTab === 'commissions' && (
              <CommissionsTab />
            )}
            {activeTab === 'billing' && (
              <BillingTab
                storeData={storeData}
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}

            {shouldLockSettings && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-[#f5f5f0]/60 backdrop-blur-[2px] border-2 border-dashed border-[#e4e4de] flex items-center justify-center p-4">
                <div className="max-w-md w-full dash-card text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Store Locked</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {accessStatus.code === 'AGENT_FEE_UNPAID' && 'Complete activation to unlock store settings and make your public store accessible.'}
                    {accessStatus.code === 'STORE_TEMP_BANNED' && `Store suspended: ${storeData?.temporaryBanReason || 'Access suspended by admin.'}`}
                    {accessStatus.code !== 'AGENT_FEE_UNPAID' && accessStatus.code !== 'STORE_TEMP_BANNED' && 'Store settings are currently locked.'}
                  </p>
                  {accessStatus.code === 'AGENT_FEE_UNPAID' && (
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="dash-btn-primary mx-auto"
                      style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
                    >
                      Go to Activation
                    </button>
                  )}
                </div>
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

// --- TAB COMPONENTS ---

function OverviewTab({ data, onRefresh, showAlert }) {
  const maxFeatures = 3;
  const emptyFeature = { title: '', description: '', icon: '' };

  const featureIconOptions = [
    { value: 'layout', label: 'Layout', icon: Layout },
    { value: 'zap', label: 'Zap', icon: Zap },
    { value: 'shield-check', label: 'Shield Check', icon: ShieldCheck },
    { value: 'globe', label: 'Globe', icon: Globe },
    { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
    { value: 'activity', label: 'Activity', icon: Activity },
    { value: 'smartphone', label: 'Smartphone', icon: Smartphone },
  ];

  const getNormalizedFeatures = (features) => {
    const safeFeatures = Array.isArray(features) ? features : [];
    const normalized = safeFeatures
      .slice(0, maxFeatures)
      .map((feature) => ({
        title: feature?.title || '',
        description: feature?.description || '',
        icon: feature?.icon || '',
      }));

    const configured = normalized.filter((feature) => {
      const hasTitle = typeof feature.title === 'string' && feature.title.trim().length > 0;
      const hasDescription = typeof feature.description === 'string' && feature.description.trim().length > 0;
      const hasIcon = typeof feature.icon === 'string' && feature.icon.trim().length > 0;
      return hasTitle || hasDescription || hasIcon;
    });

    if (configured.length > 0) {
      return configured;
    }

    return [];
  };

  const getSocialLinkValue = (link) => {
    if (!link) return '';
    if (typeof link === 'string') return link;
    if (typeof link?.value === 'string') return link.value;
    return '';
  };

  const normalizeWhatsAppValue = (value = '') => {
    let normalized = value.trim().replace(/\s+/g, '');
    const waPrefixPattern = /^(https?:\/\/)?(www\.)?wa\.me\//i;

    while (waPrefixPattern.test(normalized)) {
      normalized = normalized.replace(waPrefixPattern, '');
    }

    return normalized;
  };

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: data?.name || '',
    slug: data?.slug || '',
    logo: data?.logo || '',
    description: data?.description || '',
    theme: {
      primaryColor: data?.theme?.primaryColor || '#2563eb',
      secondaryColor: data?.theme?.secondaryColor || '#64748b',
      logoHeight: data?.theme?.logoHeight || '40',
    },
    socialLinks: {
      whatsapp: normalizeWhatsAppValue(getSocialLinkValue(data?.socialLinks?.whatsapp)),
      phone: getSocialLinkValue(data?.socialLinks?.phone),
      email: getSocialLinkValue(data?.socialLinks?.email),
      facebook: getSocialLinkValue(data?.socialLinks?.facebook),
      instagram: getSocialLinkValue(data?.socialLinks?.instagram),
      twitter: getSocialLinkValue(data?.socialLinks?.twitter),
    },
    content: {
      heroBadge: data?.content?.heroBadge || '',
      heroTitle: data?.content?.heroTitle || '',
      heroSubtitle: data?.content?.heroSubtitle || '',
      heroImage: data?.content?.heroImage || '',
      features: getNormalizedFeatures(data?.content?.features),
    },
  });

  const sanitizeFeatures = (features = []) => (
    (features || [])
      .slice(0, maxFeatures)
      .map((feature) => ({
        title: (feature?.title || '').trim(),
        description: (feature?.description || '').trim(),
        icon: (feature?.icon || '').trim(),
      }))
      .filter((feature) => feature.title || feature.description || feature.icon)
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const sanitizedFeatures = sanitizeFeatures(formData.content?.features || []);

      const payload = {
        ...formData,
        socialLinks: {
          whatsapp: {
            value: normalizeWhatsAppValue(formData.socialLinks?.whatsapp || ''),
            label: 'WhatsApp',
          },
          phone: {
            value: (formData.socialLinks?.phone || '').trim(),
            label: 'Phone',
          },
          email: {
            value: (formData.socialLinks?.email || '').trim(),
            label: 'Email',
          },
          facebook: {
            value: (formData.socialLinks?.facebook || '').trim(),
            label: 'Facebook',
          },
          instagram: {
            value: (formData.socialLinks?.instagram || '').trim(),
            label: 'Instagram',
          },
          twitter: {
            value: (formData.socialLinks?.twitter || '').trim(),
            label: 'Twitter',
          },
        },
        content: {
          ...formData.content,
          features: sanitizedFeatures,
        },
      };

      await storeAPI.updateMyStore(payload);
      showAlert('success', 'Store settings updated successfully.');
      onRefresh();
    } catch (err) {
      showAlert('error', err.message || 'Failed to update store');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFeature = () => {
    if ((formData.content?.features || []).length >= maxFeatures) return;
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        features: [...(formData.content?.features || []), { ...emptyFeature }],
      },
    });
  };

  const handleRemoveFeature = async (index) => {
    const previousFormData = formData;
    const currentFeatures = formData.content?.features || [];
    const nextFeatures = currentFeatures.filter((_, i) => i !== index);
    const nextFormData = {
      ...formData,
      content: {
        ...formData.content,
        features: nextFeatures,
      },
    };

    setFormData(nextFormData);

    try {
      setIsSaving(true);
      await storeAPI.updateMyStore({
        content: {
          features: sanitizeFeatures(nextFeatures),
        },
      });
      showAlert('success', 'Feature removed successfully.');
    } catch (err) {
      setFormData(previousFormData);
      showAlert('error', err.message || 'Failed to remove feature');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SectionCard title="Store Info" icon={Globe}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Store Display Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
              <InputGroup label="Store Slug (URL)" value={formData.slug} onChange={(v) => setFormData({ ...formData, slug: v.toLowerCase() })} placeholder="my-custom-store" />
              <div className="md:col-span-2">
                <InputGroup label="Slogan / Brief Description" value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} isTextArea />
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-[#e4e4de]">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Palette size={16} /> Branding Colors
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorInput label="Primary Color" value={formData.theme.primaryColor} onChange={(v) => setFormData({ ...formData, theme: { ...formData.theme, primaryColor: v } })} />
                <ColorInput label="Secondary Color" value={formData.theme.secondaryColor} onChange={(v) => setFormData({ ...formData, theme: { ...formData.theme, secondaryColor: v } })} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Homepage Text" icon={Layout}>
            <div className="flex flex-col gap-5">
              <InputGroup label="Featured Badge" value={formData.content.heroBadge} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroBadge: v } })} placeholder="e.g. 🔥 LIMITED OFFER" />
              <InputGroup label="Headline" value={formData.content.heroTitle} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroTitle: v } })} />
              <InputGroup label="Sub-headline" value={formData.content.heroSubtitle} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroSubtitle: v } })} isTextArea />
              <InputGroup label="Hero Image URL" value={formData.content.heroImage} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroImage: v } })} placeholder="https://example.com/hero.jpg" />
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Preview</label>
                <div className="w-full h-40 rounded-xl border-1.5 border-[#e4e4de] bg-[#fafaf7] overflow-hidden flex items-center justify-center">
                  {formData.content.heroImage?.trim() ? (
                    <img src={formData.content.heroImage} alt="Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-slate-400 font-medium">Hero Image Preview</div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Value Props" icon={Sparkles}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-slate-500 font-medium">Add up to {maxFeatures} key features to display.</p>
              <button
                type="button"
                onClick={handleAddFeature}
                disabled={(formData.content?.features || []).length >= maxFeatures}
                className="dash-btn-outline !py-1.5 !px-3 !text-xs"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {formData.content.features.map((feat, idx) => (
                <div key={idx} className="p-4 rounded-xl border-1.5 border-[#e4e4de] bg-[#fff] relative">
                  <button
                    onClick={() => handleRemoveFeature(idx)}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup label="Title" value={feat.title} onChange={(v) => {
                      const next = [...formData.content.features];
                      next[idx].title = v;
                      setFormData({ ...formData, content: { ...formData.content, features: next } });
                    }} />
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Icon</label>
                      <select
                        value={feat.icon || ''}
                        onChange={(e) => {
                          const next = [...formData.content.features];
                          next[idx].icon = e.target.value;
                          setFormData({ ...formData, content: { ...formData.content, features: next } });
                        }}
                        className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm"
                      >
                        <option value="">Default</option>
                        {featureIconOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <InputGroup label="Description" value={feat.description} onChange={(v) => {
                        const next = [...formData.content.features];
                        next[idx].description = v;
                        setFormData({ ...formData, content: { ...formData.content, features: next } });
                      }} placeholder="Short description..." />
                    </div>
                  </div>
                </div>
              ))}
              {formData.content.features.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-[#e4e4de] rounded-xl text-slate-400 text-sm font-medium">
                  No features added yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Assets" icon={ImageIcon}>
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-28 h-28 rounded-2xl bg-[#fafaf7] border-2 border-dashed border-[#e4e4de] flex items-center justify-center overflow-hidden">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
              </div>
              <div className="w-full">
                <InputGroup label="Logo URL" value={formData.logo} onChange={(v) => setFormData({ ...formData, logo: v })} placeholder="https://..." />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-3">Square PNG Recommended</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Socials" icon={Share2}>
            <div className="flex flex-col gap-4">
              <IconInput 
                icon={MessageSquare} 
                label="WhatsApp" 
                value={formData.socialLinks.whatsapp} 
                onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, whatsapp: v.replace(/\D/g, '') } })} 
                prefix="wa.me/" 
              />
              <IconInput 
                icon={Phone} 
                label="Phone" 
                value={formData.socialLinks.phone} 
                onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, phone: v.replace(/\D/g, '') } })} 
              />
              <IconInput icon={Mail} label="Email" value={formData.socialLinks.email} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, email: v } })} />
              <IconInput icon={Facebook} label="Facebook" value={formData.socialLinks.facebook} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: v } })} />
              <IconInput icon={Instagram} label="Instagram" value={formData.socialLinks.instagram} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: v } })} />
            </div>
          </SectionCard>

          <div className="dash-card sticky top-6">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Unsaved Changes</h4>
            <p className="text-xs text-slate-500 mb-6">Review your changes before applying them to your storefront.</p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="dash-btn-primary w-full py-3"
              style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ plans, onRefresh, showAlert }) {
  const [showAdd, setShowAdd] = useState(false);
  const [globalPlans, setGlobalPlans] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [selectedPlanForPrice, setSelectedPlanForPrice] = useState(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState(null);


  useEffect(() => {
    if (showAdd) fetchGlobalPlans();
  }, [showAdd]);

  const fetchGlobalPlans = async () => {
    try {
      setLoadingGlobal(true);
      const res = await storeAPI.getAvailablePlans();
      setGlobalPlans(res.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleRemove = async (planId) => {
    if (!window.confirm('Remove this plan from your storefront?')) return;
    try {
      await storeAPI.removePlan(planId);
      onRefresh();
      showAlert('success', 'Plan removed from storefront.');
    } catch (err) {
      showAlert('error', err.message || 'Failed to remove plan');
    }
  };

  const networks = [...new Set(globalPlans.map(p => p.network))];
  const existingPlanKeys = new Set(
    (plans || []).map((plan) => {
      const existingPlanId = plan?.planId?._id || plan?.planId;
      return `${plan?.planType || 'DataPlan'}:${existingPlanId}`;
    })
  );

  const filteredPlans = globalPlans.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNetwork = networkFilter === 'all' || p.network === networkFilter;
    return matchesSearch && matchesNetwork;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Store Inventory</h2>
          <p className="text-sm text-slate-600 mt-1">Manage data bundles available on your storefront.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="dash-btn-primary"
          style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
        >
          <Plus size={18} />
          Append Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((p) => (
          <InventoryCard
            key={p._id}
            plan={p}
            onEdit={() => setSelectedPlanForEdit(p)}
            onRemove={() => handleRemove(p._id)}
          />
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#e4e4de] rounded-2xl bg-white/50">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Smartphone size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Empty Inventory</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">You haven't added any data plans to your store yet.</p>
            <button onClick={() => setShowAdd(true)} className="dash-btn-outline mx-auto">
              Browse Available Plans
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          title="Add New Plan"
          icon={Plus}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm"
                />
              </div>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm font-bold uppercase"
              >
                <option value="all">Networks</option>
                {networks.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {loadingGlobal ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-[#0F6E56]" size={32} /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredPlans.map((p) => {
                  const isAlreadyAdded = existingPlanKeys.has(`${p.planType || 'DataPlan'}:${p._id}`);
                  return (
                    <div
                      key={p._id}
                      className={`flex items-center justify-between p-4 border-1.5 rounded-xl transition-all ${
                        isAlreadyAdded ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-[#e4e4de] hover:border-[#0F6E56]'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate uppercase">{p.name || p.planName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{p.network}</span>
                          <span className="text-xs font-bold text-[#111]">{formatCurrencyAbbreviated(p.agentPrice || p.sellingPrice)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => !isAlreadyAdded && setSelectedPlanForPrice(p)}
                        disabled={isAlreadyAdded}
                        className={`p-2 rounded-lg transition-colors ${
                          isAlreadyAdded ? 'text-slate-300' : 'text-[#0F6E56] hover:bg-[#0F6E56] hover:text-white'
                        }`}
                      >
                        {isAlreadyAdded ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {selectedPlanForPrice && (
        <PriceModal
          plan={selectedPlanForPrice}
          submitLabel="Add Plan"
          onClose={() => setSelectedPlanForPrice(null)}
          onConfirm={async (price) => {
            const planType = selectedPlanForPrice.planType || 'TopzaOffer';
            await storeAPI.addPlan({ planId: selectedPlanForPrice._id, customPrice: price, planType });
            onRefresh();
            setSelectedPlanForPrice(null);
            setShowAdd(false);
            showAlert('success', 'Plan added to storefront.');
          }}
        />
      )}

      {selectedPlanForEdit && (
        <PriceModal
          plan={{
            ...selectedPlanForEdit,
            name: selectedPlanForEdit.planId?.planName || selectedPlanForEdit.planId?.name,
            sellingPrice: (selectedPlanForEdit.planId?.agentPrice || selectedPlanForEdit.planId?.sellingPrice || 0),
            network: selectedPlanForEdit.network || selectedPlanForEdit.planId?.network || selectedPlanForEdit.planId?.isp,
          }}
          initialPrice={selectedPlanForEdit.customPrice}
          submitLabel="Update Price"
          onClose={() => setSelectedPlanForEdit(null)}
          onConfirm={async (price) => {
            const targetPlanId = selectedPlanForEdit.planId?._id || selectedPlanForEdit.planId || selectedPlanForEdit._id;
            await storeAPI.updatePlan(targetPlanId, {
              customPrice: price,
              planType: selectedPlanForEdit.planType || 'DataPlan',
            });
            onRefresh();
            setSelectedPlanForEdit(null);
            showAlert('success', 'Plan price updated successfully.');
          }}
        />
      )}
    </div>
  );
}

function CheckerInventoryTab({ onRefresh, showAlert }) {
  const [loading, setLoading] = useState(true);
  const [availableCheckers, setAvailableCheckers] = useState([]);
  const [storeCheckers, setStoreCheckers] = useState([]);
  const [selectedCheckerId, setSelectedCheckerId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [availableRes, storeRes] = await Promise.all([
        checkersAPI.getStoreAvailableCheckers(),
        checkersAPI.getStoreCheckers(),
      ]);
      setAvailableCheckers(availableRes?.checkers || []);
      setStoreCheckers(storeRes?.checkerProducts || []);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load store checkers');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addChecker = async () => {
    if (!selectedCheckerId) return;
    try {
      setSaving(true);
      await checkersAPI.addStoreChecker({ checkerId: selectedCheckerId, customPrice: Number(customPrice || 0) });
      showAlert('success', 'Checker added to store');
      setSelectedCheckerId('');
      setCustomPrice('');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to add checker');
    } finally {
      setSaving(false);
    }
  };

  const updateChecker = async (checkerRow, data) => {
    try {
      await checkersAPI.updateStoreChecker(checkerRow._id, data);
      showAlert('success', 'Store checker updated');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to update store checker');
    }
  };

  const removeChecker = async (checkerRow) => {
    if (!window.confirm('Remove this checker from your store?')) return;
    try {
      await checkersAPI.removeStoreChecker(checkerRow._id);
      showAlert('success', 'Checker removed from store');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to remove store checker');
    }
  };

  if (loading) {
    return (
      <div className="dash-card py-20 text-center">
        <Loader2 className="animate-spin mx-auto text-[#0F6E56]" size={32} />
        <p className="mt-4 text-slate-500 font-medium">Loading checkers...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Config Checker" icon={CreditCard}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
            <select
              value={selectedCheckerId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCheckerId(id);
                const ch = availableCheckers.find(r => r._id === id);
                setCustomPrice(ch ? String(ch.basePrice || 0) : '');
              }}
              className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm"
            >
              <option value="">Select a checker</option>
              {availableCheckers.map(ch => (
                <option key={ch._id} value={ch._id}>{ch.displayName}</option>
              ))}
            </select>
          </div>
          <InputGroup label="Price (GHS)" value={customPrice} onChange={setCustomPrice} placeholder="0.00" />
          <button
            onClick={addChecker}
            disabled={saving || !selectedCheckerId}
            className="dash-btn-primary h-[45px]"
            style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Append to Store
          </button>
        </div>
      </SectionCard>

      <div className="dash-table-container">
        <table className="dash-table">
          <thead>
            <tr>
              <th className="dash-th">Checker Name</th>
              <th className="dash-th">Store Price</th>
              <th className="dash-th">Status</th>
              <th className="dash-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {storeCheckers.map((row) => (
              <tr key={row._id}>
                <td className="dash-td">
                  <p className="font-bold text-slate-900">{row.checkerId?.displayName || 'Checker'}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{row.checkerId?.checkerType}</p>
                </td>
                <td className="dash-td font-bold text-slate-900">GHc {Number(row.customPrice || 0).toFixed(2)}</td>
                <td className="dash-td">
                  <span className={`dash-badge ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="dash-td text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        const p = window.prompt('New price:', String(row.customPrice));
                        if (p) updateChecker(row, { customPrice: Number(p) });
                      }}
                      className="p-2 text-slate-400 hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => updateChecker(row, { isActive: !row.isActive })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      {row.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => removeChecker(row)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {storeCheckers.length === 0 && (
              <tr>
                <td colSpan="4" className="dash-td py-20 text-center text-slate-400 font-medium">
                  No checkers configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AfaInventoryTab({ onRefresh, showAlert }) {
  const [loading, setLoading] = useState(true);
  const [availableAfa, setAvailableAfa] = useState([]);
  const [storeAfa, setStoreAfa] = useState([]);
  const [selectedAfaId, setSelectedAfaId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [availableRes, storeRes] = await Promise.all([
        afaAPI.getAvailableAfa(),
        storeAPI.getMyStore(), // getMyStore returns populated afaProducts
      ]);
      setAvailableAfa(availableRes?.products || []);
      setStoreAfa(storeRes?.store?.afaProducts || []);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load store AFA');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAfa = async () => {
    if (!selectedAfaId) return;
    try {
      setSaving(true);
      await afaAPI.addAfaToStore({ afaId: selectedAfaId, customPrice: Number(customPrice || 0) });
      showAlert('success', 'AFA Registration added to store');
      setSelectedAfaId('');
      setCustomPrice('');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to add AFA');
    } finally {
      setSaving(false);
    }
  };

  const updateAfa = async (afaRow, data) => {
    try {
      const id = afaRow.afaId?._id || afaRow.afaId || afaRow._id;
      await afaAPI.updateStoreAfa(id, data);
      showAlert('success', 'Store AFA updated');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to update store AFA');
    }
  };

  const removeAfa = async (afaRow) => {
    if (!window.confirm('Remove this AFA product from your store?')) return;
    try {
      const id = afaRow.afaId?._id || afaRow.afaId || afaRow._id;
      await afaAPI.removeAfaFromStore(id);
      showAlert('success', 'AFA removed from store');
      await refresh();
      onRefresh?.();
    } catch (err) {
      showAlert('error', err.message || 'Failed to remove store AFA');
    }
  };

  if (loading) {
    return (
      <div className="dash-card py-20 text-center">
        <Loader2 className="animate-spin mx-auto text-[#0F6E56]" size={32} />
        <p className="mt-4 text-slate-500 font-medium">Loading AFA...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Config AFA" icon={User}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Service</label>
            <select
              value={selectedAfaId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedAfaId(id);
                const item = availableAfa.find(r => r._id === id);
                setCustomPrice(item ? String(item.agentPrice || 0) : '');
              }}
              className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm"
            >
              <option value="">Select AFA Service</option>
              {availableAfa.map(item => (
                <option key={item._id} value={item._id}>{item.serviceName}</option>
              ))}
            </select>
          </div>
          <InputGroup label="Price (GHS)" value={customPrice} onChange={setCustomPrice} placeholder="0.00" />
          <button
            onClick={addAfa}
            disabled={saving || !selectedAfaId}
            className="dash-btn-primary h-[45px]"
            style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Append to Store
          </button>
        </div>
      </SectionCard>

      <div className="dash-table-container">
        <table className="dash-table">
          <thead>
            <tr>
              <th className="dash-th">Service Name</th>
              <th className="dash-th">Store Price</th>
              <th className="dash-th">Status</th>
              <th className="dash-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {storeAfa.map((row) => (
              <tr key={row._id}>
                <td className="dash-td">
                  <p className="font-bold text-slate-900">{row.afaId?.serviceName || 'AFA Registration'}</p>
                </td>
                <td className="dash-td font-bold text-slate-900">GHc {Number(row.customPrice || 0).toFixed(2)}</td>
                <td className="dash-td">
                  <span className={`dash-badge ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="dash-td text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        const p = window.prompt('New price:', String(row.customPrice));
                        if (p) updateAfa(row, { customPrice: Number(p) });
                      }}
                      className="p-2 text-slate-400 hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => updateAfa(row, { isActive: !row.isActive })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      {row.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => removeAfa(row)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {storeAfa.length === 0 && (
              <tr>
                <td colSpan="4" className="dash-td py-20 text-center text-slate-400 font-medium">
                  No AFA services configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color = '#0F6E56', iconBg = '#ECFDF5', children }) {
  return (
    <div className="dash-card flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-[#e4e4de] pb-4 -mx-6 px-6">
        <h3 className="dash-card-title !mb-0">
          {Icon && (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: iconBg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} strokeWidth={2.5} />
            </div>
          )}
          {title}
        </h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color + '40' }}></div>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color + '20' }}></div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function InputGroup({ label, value = '', onChange, placeholder = '', isTextArea = false }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      {isTextArea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all resize-none text-sm"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm"
        />
      )}
    </div>
  );
}

function IconInput({ icon: Icon, label, value = '', onChange, prefix = '' }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={16} />
          </div>
        )}
        {prefix && (
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${Icon ? 'pl-8' : 'pl-4'} ${prefix ? 'pl-16' : ''} pr-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-lg focus:outline-none focus:border-[#0F6E56] transition-all text-sm`}
        />
      </div>
    </div>
  );
}

function ColorInput({ label, value = '', onChange }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl group transition-all hover:border-slate-300">
      <div className="relative w-10 h-10 shrink-0">
        <input
          type="color"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div 
          className="w-full h-full rounded-lg border border-white shadow-sm transition-transform group-hover:scale-105" 
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-mono font-bold text-slate-900 truncate uppercase">{value}</p>
      </div>
    </div>
  );
}



function InventoryCard({ plan, onEdit, onRemove }) {
  return (
    <div className="dash-card flex flex-col gap-6 !p-5 group transition-all hover:translate-y-[-2px]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] border-1.5 border-[#A7F3D0] flex items-center justify-center text-[#0F6E56] group-hover:bg-[#0F6E56] group-hover:text-white group-hover:border-[#0F6E56] transition-all">
          <Smartphone size={24} />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{plan.planId?.name || plan.planName}</h4>
          <p className="text-[10px] font-bold text-[#0F6E56] uppercase tracking-widest">{plan.network}</p>
        </div>
      </div>

      <div className="flex items-end justify-between pt-6 border-t border-[#f0f0f0]">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Selling Price</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrencyAbbreviated(plan.customPrice)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-lg transition-all" title="Edit">
            <Edit2 size={16} />
          </button>
          <button onClick={onRemove} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await storeAPI.getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="dash-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sales History</h3>
            <p className="text-sm text-slate-500 mt-1">Track all orders coming through your storefront.</p>
          </div>
          <div className="dash-icon-box !w-10 !h-10">
            <ShoppingBag size={20} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="dash-card py-20 text-center"><Loader2 className="animate-spin mx-auto text-[#0F6E56]" size={32} /></div>
      ) : (
        <div className="dash-table-container">
          <table className="dash-table">
            <thead>
              <tr>
                <th className="dash-th">Order ID</th>
                <th className="dash-th">Product</th>
                <th className="dash-th">Amount</th>
                <th className="dash-th">Status</th>
                <th className="dash-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td className="dash-td">
                    <p className="font-bold text-slate-900">#{order.orderNumber}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="dash-td">
                    <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{order.planName}</p>
                    <p className="text-[10px] font-black text-[#0F6E56] uppercase">{order.network}</p>
                  </td>
                  <td className="dash-td font-black text-slate-900">{formatCurrencyAbbreviated(order.amount)}</td>
                  <td className="dash-td">
                    <span className={`dash-badge ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="dash-td text-right">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDetails(true);
                      }}
                      className="p-2 text-slate-400 hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="dash-td py-20 text-center text-slate-400 font-medium">No sales recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showOrderDetails && selectedOrder && (
        <Modal
          isOpen={showOrderDetails}
          onClose={() => setShowOrderDetails(false)}
          title="Order Details"
          icon={ShoppingBag}
        >
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-[#f0f0f0] pb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Order Ref</p>
                <p className="font-bold text-lg text-slate-900">#{selectedOrder.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className={`dash-badge ${getStatusStyle(selectedOrder.status)} !px-3 !py-1`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0]">
                <p className="text-[10px] font-bold text-[#0F6E56] uppercase tracking-widest mb-1">Product</p>
                <p className="font-bold text-slate-900 text-sm truncate">{selectedOrder.planName}</p>
                <p className="text-[10px] font-black text-[#0F6E56] uppercase mt-1">{selectedOrder.network}</p>
              </div>
              <div className="p-4 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE]">
                <p className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest mb-1">Amount Paid</p>
                <p className="font-black text-slate-900 text-lg">{formatCurrencyAbbreviated(selectedOrder.amount)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Beneficiary</span>
                <span className="text-sm font-bold text-slate-900">{selectedOrder.phoneNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Date</span>
                <span className="text-sm font-bold text-slate-900">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setShowOrderDetails(false)}
              className="dash-btn-primary w-full py-4 mt-2"
              style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CommissionsTab() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await storeAPI.getCommissionSummary();
      setData(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="dash-stat-grid">
        <StatsCard
          title="Total Earned"
          value={data?.totalEarned || 0}
          icon={TrendingUp}
          color={getColor(0)}
        />
        <StatsCard
          title="Withdrawable"
          value={data?.availableForWithdrawal || 0}
          icon={Wallet}
          color={getColor(1)}
        />
        <StatsCard
          title="Pending"
          value={data?.pendingWithdrawal || 0}
          icon={Clock}
          color={getColor(2)}
        />
        <StatsCard
          title="Total Paid Out"
          value={data?.totalWithdrawn || 0}
          icon={CheckCircle}
          color={getColor(3)}
        />
      </div>

      <SectionCard title="Payout Details" icon={CreditCard}>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#ECFDF5] border-1.5 border-[#A7F3D0] rounded-xl p-5">
              <p className="text-[10px] font-bold text-[#0F6E56] uppercase tracking-widest mb-2">Available Balance</p>
              <p className="text-2xl font-black text-[#111]">{formatCurrencyAbbreviated(data?.availableForWithdrawal || 0)}</p>
            </div>
            <div className="bg-[#F5F3FF] border-1.5 border-[#DDD6FE] rounded-xl p-5">
              <p className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest mb-2">Aggregate Payouts</p>
              <p className="text-2xl font-black text-[#111]">{formatCurrencyAbbreviated(data?.totalWithdrawn || 0)}</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-600">Your earnings are automatically aggregated from every sale processed through your storefront link.</p>
          
          <button
            onClick={() => navigate('/agent/commissions')}
            disabled={loading}
            className="dash-btn-primary !w-max !px-8"
            style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
          >
            Manage Settlements
            <ChevronRight size={16} />
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function BillingTab({ storeData, onRefresh, showAlert }) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [feeStatus, setFeeStatus] = useState(storeData?.owner?.agentFeeStatus || 'pending');
  const [registrationFee, setRegistrationFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [walletBalance, setWalletBalance] = useState(0);
  const paystackRef = useRef(null);

  useEffect(() => {
    const fetchFeeStatus = async () => {
      try {
        const [response, walletRes] = await Promise.all([
          storeAPI.getAgentFeeStatus(),
          walletAPI.getBalance(),
        ]);
        const statusData = response?.feeStatus || {};
        if (statusData?.status) {
          setFeeStatus(statusData.status);
        }
        setRegistrationFee(Number(statusData?.registrationFee || 0));
        setWalletBalance(Number(walletRes?.balance || 0));
      } catch (err) {
        console.error('Failed to fetch agent fee status:', err);
      }
    };

    fetchFeeStatus();
  }, []);

  const handlePay = async () => {
    try {
      setIsInitializing(true);
      const res = await storeAPI.initializeAgentFeePayment({ paymentMethod });
      const accessCode = res?.data?.accessCode;
      const reference = res?.data?.reference;

      if (accessCode && reference) {
        if (!window.PaystackPop) {
          showAlert('error', 'Paystack library not loaded. Please refresh and try again.');
          setIsInitializing(false);
          return;
        }

        const paystack = new window.PaystackPop();
        paystackRef.current = paystack;

        paystack.resumeTransaction(accessCode, {
          onSuccess: async () => {
            try {
              const verification = await storeAPI.verifyAgentFeePayment({ reference });
              if (verification?.success) {
                const nextStatus = verification?.feePayment?.status || 'paid';
                setFeeStatus(nextStatus);
                showAlert('success', 'Activation fee payment verified successfully.');
                onRefresh();
              } else {
                showAlert('error', verification?.message || 'Payment verification failed.');
              }
            } catch (verifyErr) {
              showAlert('error', verifyErr.message || 'Failed to verify payment.');
            } finally {
              setIsInitializing(false);
            }
          },
          onCancel: () => {
            showAlert('info', 'Payment was cancelled.');
            setIsInitializing(false);
          },
          onError: (paystackError) => {
            showAlert('error', paystackError?.message || 'Payment error occurred.');
            setIsInitializing(false);
          },
        });
      } else {
        const refreshedStatus = res?.feePayment?.status === 'paid' ? 'paid' : feeStatus;
        setFeeStatus(refreshedStatus);
        if (refreshedStatus === 'paid') {
          showAlert('success', 'Store activated successfully via wallet.');
          onRefresh();
        } else {
          showAlert('info', res?.message || 'Payment initiated.');
        }
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to initialize payment');
    } finally {
      if (paymentMethod !== 'paystack') {
        setIsInitializing(false);
      }
    }
  };

  const isActive = ['paid', 'protocol'].includes(feeStatus);

  return (
    <SectionCard title="Agent Activation" icon={ShieldCheck}>
      <div className="flex flex-col items-center text-center gap-6 max-w-xl mx-auto py-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
          isActive ? 'bg-[#ECFDF5] text-[#0F6E56]' : 'bg-[#0F6E56] text-white'
        }`}>
          {isActive ? <CheckCircle size={32} /> : <Zap size={32} />}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            {isActive ? 'Account Fully Activated' : 'Unlock Your Public Storefront'}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isActive 
              ? 'Congratulations! Your agent account is active. You can now customize your store and start earning commissions from sales.' 
              : `To start selling data bundles and earning commissions, you need to pay a one-time activation fee of ${formatCurrencyAbbreviated(registrationFee)}.`}
          </p>
        </div>

        {!isActive && (
          <div className="w-full flex flex-col gap-6 mt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#ECFDF5] border-1.5 border-[#A7F3D0] rounded-xl">
                <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    paymentMethod === 'wallet' ? 'bg-[#0F6E56] text-white shadow-md' : 'text-[#0F6E56] hover:text-[#065F46]'
                  }`}
                >
                  Wallet {paymentMethod === 'wallet' && `(${formatCurrencyAbbreviated(walletBalance)})`}
                </button>
                <button
                  onClick={() => setPaymentMethod('paystack')}
                  className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    paymentMethod === 'paystack' ? 'bg-[#0F6E56] text-white shadow-md' : 'text-[#0F6E56] hover:text-[#065F46]'
                  }`}
                >
                  Online Card
                </button>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={isInitializing || (paymentMethod === 'wallet' && walletBalance < registrationFee)}
              className="dash-btn-primary !py-4 !rounded-xl !text-sm"
              style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}
            >
              {isInitializing ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
              {paymentMethod === 'wallet' ? 'Confirm Wallet Payment' : 'Pay with Paystack'}
            </button>
            
            {paymentMethod === 'wallet' && walletBalance < registrationFee && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight">Insufficient balance. Please top up your wallet first.</p>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// --- MICRO UTILS ---

function StatsCard({ title, value, icon: Icon, color = getColor(1) }) {
  return (
    <div className="dash-stat-card" style={{
      '--stat-color': color.main + '66',
      '--stat-glow': color.glow,
      '--stat-bg': color.soft,
      '--stat-border': color.main + '33',
    }}>
      <div className="flex items-center justify-between mb-1">
        <span className="dash-stat-label" style={{ color: color.main }}>{title}</span>
        {Icon && (
          <div style={{ width: 28, height: 28, borderRadius: 6, background: color.soft, color: color.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className="dash-stat-value">{formatCurrencyAbbreviated(Number(value || 0))}</div>
    </div>
  );
}

function Modal({ title, onClose, children, icon: HeaderIcon }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111]/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#fff] border-1.5 border-[#e4e4de] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#e4e4de] flex items-center justify-between bg-[#fafaf7] flex-shrink-0">
          <div className="flex items-center gap-3">
            {HeaderIcon && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HeaderIcon size={16} strokeWidth={2.5} />
              </div>
            )}
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-[#0F6E56] hover:bg-[#ECFDF5] rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function PriceModal({ plan, onClose, onConfirm, initialPrice, submitLabel = 'Add Plan' }) {
  const [price, setPrice] = useState(
    (initialPrice !== undefined && initialPrice !== null
      ? initialPrice
      : (plan.sellingPrice + 1)).toString()
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < plan.sellingPrice) {
      setError(`Minimum price is GH₵${plan.sellingPrice}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(numPrice);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111]/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white border-1.5 border-[#e4e4de] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-8 flex flex-col gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-[#ECFDF5] border-1.5 border-[#A7F3D0] rounded-xl flex items-center justify-center mx-auto text-[#0F6E56] mb-4">
              <CreditCard size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Configure Price</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">{plan.name} • {plan.network}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Cost</label>
                <span className="text-xs font-bold text-[#111]">{formatCurrencyAbbreviated(plan.sellingPrice)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">GHS</span>
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setError(''); }}
                  className="w-full pl-14 pr-4 py-4 bg-[#fafaf7] border-2 border-[#e4e4de] rounded-xl text-[#111] font-black text-xl focus:outline-none focus:border-[#0F6E56] transition-all"
                  placeholder="0.00"
                />
              </div>
              {error && <p className="text-[10px] font-bold text-red-500 uppercase px-1">{error}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className="dash-btn-outline !py-3">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="dash-btn-primary !py-3" style={{ background: '#0F6E56', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}>
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
