import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  AlertCircle, Lock, AlertTriangle, Plus, Edit2, Trash2, Eye, EyeOff,
  Settings, Layout, Image as ImageIcon, Globe, Share2,
  MessageSquare, Phone, Mail, Facebook, Instagram, Twitter, ExternalLink,
  Zap, ShieldCheck, Sparkles, Activity, Minus,
  RefreshCw, Save, X, Palette, Smartphone, CreditCard, Search, Filter,
  TrendingUp, Wallet, Send
} from 'lucide-react';
import { store as storeAPI, dataplans as globalPlansAPI, wallet as walletAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import AlertModal from '../components/AlertModal';
import { useSettings } from '../context/SettingsContext';

export default function AdminStore() {
  const { settings } = useSettings();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [savingStore, setSavingStore] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type, message, title = '') => {
    setAlertConfig({ isOpen: true, type, message, title });
  };

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
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            <p className="text-slate-600 font-medium">Loading your store...</p>
          </div>
        </div>
      </AgentLayout>
    );
  }

  const accessStatus = storeData?.accessStatus || {};
  const isAccessible = accessStatus.isAccessible !== false;
  const shouldLockSettings = !isAccessible && activeTab !== 'billing';

  return (
    <AgentLayout>
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/60 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary-600 min-w-0">
                <Layout size={16} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">My Store</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/store/${storeData?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-primary-400 hover:text-primary-600 transition-all font-medium text-sm shadow-sm whitespace-nowrap"
                >
                  <ExternalLink size={16} />
                  View Store
                </a>
                <button
                  onClick={fetchStore}
                  className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2 flex-wrap">
              {storeData?.name || 'My Store'}
              <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {storeData?.slug}
              </span>
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Access Status Banner */}
          {!isAccessible && (
            <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-[1px] shadow-lg shadow-red-200">
              <div className="bg-white rounded-[15px] p-5 flex flex-col md:flex-row items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 animate-pulse">
                  <Lock size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-slate-900">Action Required</h3>
                  <p className="text-slate-600 mt-1">
                    {accessStatus.code === 'AGENT_FEE_UNPAID' && 'Your agent registration fee is pending. Complete payment to start selling and earning commissions.'}
                    {accessStatus.code === 'STORE_TEMP_BANNED' && `Store suspended: ${storeData?.temporaryBanReason || 'Access suspended.'}`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {/* Always show admin contact if available */}
                    {storeData?.adminContact?.email && (
                      <a
                        href={`mailto:${storeData.adminContact.email}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Mail size={12} />
                        {storeData.adminContact.email}
                      </a>
                    )}
                    {storeData?.adminContact?.phone && (
                      <a
                        href={`tel:${storeData.adminContact.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Phone size={12} />
                        {storeData.adminContact.phone}
                      </a>
                    )}
                  </div>
                </div>
                {accessStatus.code === 'AGENT_FEE_UNPAID' && (
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all transform hover:scale-105"
                  >
                    Pay Activation Fee
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
              <AlertCircle size={20} />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Navigation Grid */}
          <style>{`
            .store-tabs-scroll::-webkit-scrollbar { display: none; }
            .store-tabs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          <div className="mb-8 w-full max-w-full overflow-hidden">
            <div className="w-full overflow-x-auto overflow-y-hidden store-tabs-scroll overscroll-x-contain">
              <div className="inline-flex items-stretch gap-2 whitespace-nowrap pb-1 pr-1">
                {[
                  { id: 'general', label: 'Store Details', icon: Palette },
                  { id: 'plans', label: 'Data Plans', icon: Smartphone },
                  { id: 'orders', label: 'Sales', icon: CreditCard },
                  { id: 'commissions', label: 'Earnings', icon: Share2 },
                  { id: 'billing', label: 'Setup Fee', icon: Settings },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 min-w-[124px] sm:min-w-[132px] flex flex-col items-center justify-center px-3 py-2.5 rounded-xl transition-all border ${activeTab === tab.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'
                      }`}
                  >
                    <tab.icon size={20} className="mb-1.5" />
                    <span className="text-[11px] font-bold uppercase tracking-tight whitespace-nowrap">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                storeId={storeData._id}
                activeProvider={settings?.vtuProvider || 'xpresdata'}
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersTab storeId={storeData._id} />
            )}
            {activeTab === 'commissions' && (
              <CommissionsTab storeId={storeData._id} />
            )}
            {activeTab === 'billing' && (
              <BillingTab
                storeData={storeData}
                onRefresh={fetchStore}
                showAlert={showAlert}
              />
            )}

            {shouldLockSettings && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-white/60 backdrop-blur-[2px] border border-slate-200 flex items-center justify-center p-4 sm:p-6">
                <div className="max-w-lg w-full bg-white/90 border border-slate-200 rounded-2xl shadow-lg p-5 sm:p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Lock size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Store Locked</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {accessStatus.code === 'AGENT_FEE_UNPAID' && 'Complete activation to unlock store settings and make your public store accessible.'}
                    {accessStatus.code === 'STORE_TEMP_BANNED' && `Store suspended: ${storeData?.temporaryBanReason || 'Access suspended by admin.'}`}
                    {accessStatus.code !== 'AGENT_FEE_UNPAID' && accessStatus.code !== 'STORE_TEMP_BANNED' && 'Store settings are currently locked.'}
                  </p>
                  {accessStatus.code === 'AGENT_FEE_UNPAID' && (
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all"
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

function OverviewTab({ data, loading, onRefresh, navigate, showAlert }) {
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

    if (currentFeatures.length <= 1) {
      return;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Basic Info & Colors */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Store Info" icon={Globe}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Store Display Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
              <InputGroup label="Store Slug (URL)" value={formData.slug} onChange={(v) => setFormData({ ...formData, slug: v.toLowerCase() })} placeholder="my-custom-store" />
              <div className="md:col-span-2">
                <InputGroup label="Slogan / Brief Description" value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} />
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Palette size={16} /> Colors & Branding
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput label="Main Color" value={formData.theme.primaryColor} onChange={(v) => setFormData({ ...formData, theme: { ...formData.theme, primaryColor: v } })} />
                <ColorInput label="Secondary Color" value={formData.theme.secondaryColor} onChange={(v) => setFormData({ ...formData, theme: { ...formData.theme, secondaryColor: v } })} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Homepage Text" icon={Layout}>
            <div className="space-y-4">
              <InputGroup label="Featured Badge (e.g. 🔥 LIMITED OFFER)" value={formData.content.heroBadge} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroBadge: v } })} />
              <InputGroup label="Headline" value={formData.content.heroTitle} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroTitle: v } })} />
              <InputGroup label="Sub-headline" value={formData.content.heroSubtitle} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroSubtitle: v } })} isTextArea />
              <InputGroup label="Hero Background Image URL" value={formData.content.heroImage} onChange={(v) => setFormData({ ...formData, content: { ...formData.content, heroImage: v } })} placeholder="https://example.com/hero-image.jpg" />
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Hero Image Preview</label>
                <div className="w-full h-40 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {formData.content.heroImage?.trim() ? (
                    <img
                      src={formData.content.heroImage}
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.add('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${formData.content.heroImage?.trim() ? 'hidden' : ''} text-xs text-slate-400 font-medium`}>
                    Paste an image URL to preview hero background
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Store Features" icon={Smartphone}>
            <div className="flex items-center justify-end mb-4">
              <button
                type="button"
                onClick={handleAddFeature}
                disabled={(formData.content?.features || []).length >= maxFeatures}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-bold border border-primary-100 hover:bg-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add Feature
              </button>
            </div>
            <div className="space-y-3">
              {formData.content.features.map((feat, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-start">
                    <div className="md:col-span-4">
                      <InputGroup label="Title" value={feat.title} onChange={(v) => {
                        const next = [...formData.content.features];
                        next[idx].title = v;
                        setFormData({ ...formData, content: { ...formData.content, features: next } });
                      }} />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Icon</label>
                      <div className="relative">
                        <select
                          value={feat.icon || ''}
                          onChange={(e) => {
                            const next = [...formData.content.features];
                            next[idx].icon = e.target.value;
                            setFormData({ ...formData, content: { ...formData.content, features: next } });
                          }}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-900"
                        >
                          <option value="">Default Icon</option>
                          {featureIconOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <InputGroup label="Desc" value={feat.description} onChange={(v) => {
                        const next = [...formData.content.features];
                        next[idx].description = v;
                        setFormData({ ...formData, content: { ...formData.content, features: next } });
                      }} placeholder="Short feature description" />
                    </div>

                    <div className="md:col-span-12 md:flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
                      >
                        <Minus size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Assets & Sidebar */}
        <div className="space-y-6">
          <SectionCard title="Branding Assets" icon={ImageIcon}>
            <div className="space-y-4 text-center">
              <div className="w-32 h-32 mx-auto rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-400"><ImageIcon size={40} /></div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  placeholder="Paste Logo URL"
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recommended: Square Transparent PNG</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Social Links" icon={Share2}>
            <div className="space-y-3">
              <IconInput icon={MessageSquare} label="Whatsapp" value={formData.socialLinks.whatsapp} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, whatsapp: v } })} prefix="https://wa.me/" />
              <IconInput icon={Phone} label="Phone" value={formData.socialLinks.phone} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, phone: v } })} />
              <IconInput icon={Mail} label="Email" value={formData.socialLinks.email} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, email: v } })} />
              <IconInput icon={Facebook} label="Facebook" value={formData.socialLinks.facebook} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: v } })} />
              <IconInput icon={Instagram} label="Instagram" value={formData.socialLinks.instagram} onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: v } })} />
            </div>
          </SectionCard>

          {/* Quick Actions Sticky Bottom Mobile */}
          <div className="bg-white p-6 rounded-2xl border border-primary-100 shadow-xl shadow-primary-50 sticky top-28">
            <p className="text-sm font-medium text-slate-600 mb-4">You have unsaved changes in your branding settings.</p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all disabled:opacity-50"
            >
              {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <Save size={20} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ plans, storeId, activeProvider = 'xpresdata', onRefresh, showAlert }) {
  const [showAdd, setShowAdd] = useState(false);
  const [globalPlans, setGlobalPlans] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [selectedPlanForPrice, setSelectedPlanForPrice] = useState(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState(null);
  const normalizedProvider = String(activeProvider || 'xpresdata').toLowerCase();
  const activePlanType = normalizedProvider === 'digimall'
    ? 'DigimallOffer'
    : (normalizedProvider === 'topza' ? 'TopzaOffer' : 'XpresDataOffer');

  const normalizePlanType = (type) => {
    const value = String(type || '').toLowerCase();
    if (!value || value === 'dataplan') return 'xpresdataoffer';
    return value;
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 min-w-0">Manage Data Plans</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 ml-auto shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-primary-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-primary-700 shadow-md shadow-primary-100 transition-all"
        >
          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="sm:hidden">Add Plan</span>
          <span className="hidden sm:inline">Append New Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map(plan => (
          <PlanCard
            key={plan._id}
            plan={plan}
            isActiveForCurrentVtu={
              normalizePlanType(plan?.planType) === String(activePlanType).toLowerCase()
            }
            onRemove={() => handleRemove(plan._id)}
            onEdit={() => setSelectedPlanForEdit(plan)}
          />
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Smartphone size={64} className="opacity-20" />
            <p className="font-medium">No plans in your catalogue. Click the button above to add some!</p>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Select Plan to Add" onClose={() => setShowAdd(false)}>
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search plan name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
              <div className="w-full md:w-48 relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-sm font-medium appearance-none"
                >
                  <option value="all">All Networks</option>
                  {networks.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingGlobal ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading plans...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredPlans.map(p => (
                  (() => {
                    const planType = p.planType || 'XpresDataOffer';
                    const planKey = `${planType}:${p._id}`;
                    const isAlreadyAdded = existingPlanKeys.has(planKey);

                    return (
                      <div
                        key={p._id}
                        className={`group flex items-center justify-between p-4 border rounded-2xl transition-all shadow-sm ${isAlreadyAdded
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-100 hover:border-primary-100 hover:bg-primary-50/10'
                          }`}
                      >
                        <div className="space-y-1">
                          <h4 className={`font-bold uppercase tracking-tight ${isAlreadyAdded ? 'text-slate-400' : 'text-slate-900 group-hover:text-primary-700 transition-colors'}`}>
                            {p.name || p.planName}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${isAlreadyAdded ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                              {p.network}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">•</span>
                            <span className={`text-xs font-bold tracking-tight ${isAlreadyAdded ? 'text-slate-400' : 'text-slate-500'}`}>
                              BASE: {formatCurrencyAbbreviated(p.agentPrice || p.sellingPrice)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => !isAlreadyAdded && setSelectedPlanForPrice(p)}
                          disabled={isAlreadyAdded}
                          className={`p-3 rounded-xl transition-all shadow-sm ${isAlreadyAdded
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-slate-50 text-primary-600 hover:bg-primary-600 hover:text-white group-hover:shadow-md'
                            }`}
                          title={isAlreadyAdded ? 'Already added to storefront' : 'Add this plan'}
                        >
                          {isAlreadyAdded ? <span className="text-[10px] font-bold uppercase tracking-wider">Added</span> : <Plus size={20} />}
                        </button>
                      </div>
                    );
                  })()
                ))}

                {filteredPlans.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Search className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">No matching plans found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
      {selectedPlanForPrice && (
        <PriceModal
          plan={selectedPlanForPrice}
          submitLabel="Add Plan"
          loadingLabel="Adding..."
          onClose={() => setSelectedPlanForPrice(null)}
          onConfirm={async (price) => {
            const planType = selectedPlanForPrice.planType || 'XpresDataOffer';
            await storeAPI.addPlan({
              planId: selectedPlanForPrice._id,
              customPrice: price,
              planType
            });
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
            sellingPrice: selectedPlanForEdit.planType === 'XpresDataOffer'
              ? (selectedPlanForEdit.planId?.agentPrice || selectedPlanForEdit.planId?.sellingPrice || 0)
              : selectedPlanForEdit.planType === 'DigimallOffer'
              ? (selectedPlanForEdit.planId?.agentPrice || selectedPlanForEdit.planId?.sellingPrice || 0)
              : selectedPlanForEdit.planType === 'TopzaOffer'
              ? (selectedPlanForEdit.planId?.agentPrice || selectedPlanForEdit.planId?.sellingPrice || 0)
              : (selectedPlanForEdit.planId?.sellingPrice || 0),
            network: selectedPlanForEdit.network || selectedPlanForEdit.planId?.network || selectedPlanForEdit.planId?.isp,
          }}
          initialPrice={selectedPlanForEdit.customPrice}
          submitLabel="Update Price"
          loadingLabel="Updating..."
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

// --- UTILITY COMPONENTS ---

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          {Icon && <Icon size={18} className="text-primary-500" />}
          {title}
        </h3>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function InputGroup({ label, value = '', onChange, placeholder = '', isTextArea = false }) {
  const safeValue = value || '';
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      {isTextArea ? (
        <textarea
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none text-slate-900"
        />
      ) : (
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-900"
        />
      )}
    </div>
  );
}

function ColorInput({ label, value = '', onChange }) {
  const safeValue = value || '';
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <input
        type="color"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
      />
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
        <p className="text-xs font-mono text-slate-900">{safeValue}</p>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, label, value = '', onChange, prefix = '' }) {
  const displayValue = (typeof value === 'string' ? value : '').replace(prefix, '');

  return (
    <div className="flex items-center gap-3 p-1 pl-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
      <Icon size={16} className="text-slate-400" />
      <div className="flex-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter -mb-1">{label}</p>
        <div className="flex items-center">
          <span className="text-xs text-slate-400 font-mono">{prefix}</span>
          <input
            type="text"
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full py-1 text-sm bg-transparent focus:outline-none text-slate-900"
            placeholder="..."
          />
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, onRemove, onEdit, isActiveForCurrentVtu = true }) {
  return (
    <div className={`group p-5 lg:p-6 rounded-3xl border shadow-sm transition-all overflow-hidden h-full ${isActiveForCurrentVtu
      ? 'bg-white border-slate-200/80 hover:shadow-xl hover:shadow-primary-100/50'
      : 'bg-slate-50 border-slate-200 opacity-70'
      }`}>
      <div className="flex items-start gap-4 mb-4 min-w-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all ${isActiveForCurrentVtu
          ? 'bg-slate-50 text-primary-600 group-hover:bg-primary-50 group-hover:scale-110'
          : 'bg-slate-100 text-slate-400'
          }`}>
          <Smartphone size={24} />
        </div>
        <div className="min-w-0">
          <h4 className={`font-bold leading-tight break-words ${isActiveForCurrentVtu ? 'text-slate-900' : 'text-slate-500'}`}>
            {plan.planId?.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isActiveForCurrentVtu ? 'text-primary-500' : 'text-slate-400'}`}>
              {plan.network}
            </p>
          </div>
        </div>
      </div>

      <div className={`flex items-end justify-between pt-4 mt-auto ${isActiveForCurrentVtu ? 'border-t border-slate-50' : 'border-t border-slate-200'}`}>
        <div>
          <p className="text-[10px] text-slate-400 font-medium">Selling Price</p>
          <p className={`text-2xl font-black tracking-tight ${isActiveForCurrentVtu ? 'text-slate-900' : 'text-slate-500'}`}>
            {formatCurrencyAbbreviated(plan.customPrice)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] text-slate-400 font-medium">Network Base</p>
          <p className="text-xs font-bold text-slate-500 line-through">
            {formatCurrencyAbbreviated((plan.planType === 'XpresDataOffer' || plan.planType === 'DigimallOffer' || plan.planType === 'TopzaOffer') ? (plan.planId?.agentPrice || plan.planId?.sellingPrice) : plan.planId?.sellingPrice || 0)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={onEdit}
              disabled={!isActiveForCurrentVtu}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${isActiveForCurrentVtu
                ? 'text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                }`}
              title={isActiveForCurrentVtu ? 'Edit plan price' : 'Provider is currently inactive'}
            >
              <Edit2 size={12} />
              Edit
            </button>
            <button
              onClick={onRemove}
              disabled={!isActiveForCurrentVtu}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${isActiveForCurrentVtu
                ? 'text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                }`}
              title={isActiveForCurrentVtu ? 'Remove from storefront' : 'Provider is currently inactive'}
            >
              <X size={12} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ storeId }) {
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Order History</h3>
            <p className="text-sm text-slate-500">Live feed of orders through your storefront</p>
          </div>
          <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
            <CreditCard size={24} />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-400 font-medium">Loading orders...</div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Order ID</th>
                  <th className="pb-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Plan</th>
                  <th className="pb-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Amount</th>
                  <th className="pb-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Status</th>
                  <th className="pb-4 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(order => (
                  <tr key={order._id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">#{order.orderNumber}</p>
                      <p className="text-[10px] text-slate-600 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-slate-700">{order.planName}</p>
                      <p className="text-[10px] font-bold text-primary-500 uppercase tracking-tighter">{order.network}</p>
                    </td>
                    <td className="py-4 whitespace-nowrap">
                      <p className="font-black text-slate-900">{formatCurrencyAbbreviated(order.amount)}</p>
                    </td>
                    <td className="py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="View Order"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-12 text-center text-slate-400">No orders recorded yet.</div>
            )}
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <Modal
            isOpen={showOrderDetails}
            onClose={() => setShowOrderDetails(false)}
            title="Order Information"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Ref</p>
                  <p className="font-mono text-sm font-bold text-slate-900">#{selectedOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700' :
                    selectedOrder.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan</p>
                  <p className="font-bold text-slate-900">{selectedOrder.planName}</p>
                  <p className="text-[10px] font-bold text-primary-500 uppercase">{selectedOrder.network}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                  <p className="font-bold text-slate-900">{formatCurrencyAbbreviated(selectedOrder.amount)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-[11px]">
                  <span className="font-bold text-slate-500 uppercase">Customer Number</span>
                  <span className="font-bold text-slate-900">{selectedOrder.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-[11px]">
                  <span className="font-bold text-slate-500 uppercase">Order Date</span>
                  <span className="font-bold text-slate-900">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setShowOrderDetails(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function CommissionsTab({ storeId }) {
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatsCard
          title="Total Earnings"
          value={data?.totalEarned || 0}
          color="primary"
          icon={TrendingUp}
        />
        <StatsCard
          title="Withdrawable"
          value={data?.availableForWithdrawal || 0}
          color="success"
          icon={Wallet}
        />
        <StatsCard
          title="Pending Withdrawal"
          value={data?.pendingWithdrawal || 0}
          color="amber"
          icon={Send}
        />
      </div>

      <SectionCard title="Payout Summary" icon={CreditCard}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Withdrawn</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(data?.totalWithdrawn || 0)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(data?.availableForWithdrawal || 0)}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">Aggregate of all commissions processed to your bank or wallet.</p>

        <button
          onClick={() => navigate('/agent/commissions')}
          disabled={loading}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Request Settlement
        </button>
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
        if (typeof res?.balance === 'number') {
          setWalletBalance(res.balance);
        }
        showAlert('success', res?.message || 'Activation completed successfully.');
        onRefresh();
        setIsInitializing(false);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to initialize payment');
      setIsInitializing(false);
    }
  };

  return (
    <SectionCard title="Account Activation" icon={Settings}>
      <div className="max-w-2xl mx-auto py-10 text-center">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${feeStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
          }`}>
          {feeStatus === 'paid' ? <Layout size={40} /> : <Lock size={40} />}
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-2">
          {['paid', 'protocol'].includes(feeStatus) ? 'Active Agency Account' : 'Account Activation Required'}
        </h3>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {['paid', 'protocol'].includes(feeStatus)
            ? 'Your store is active. You can now sell and manage your data bundles.'
            : 'To activate your store and start selling, a one-time activation fee is required.'}
        </p>

        {!['paid', 'protocol'].includes(feeStatus) && (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 max-w-sm mx-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Activation Cost</span>
            <div className="text-4xl font-black text-slate-900">{formatCurrencyAbbreviated(registrationFee || 0)}</div>
            <div className="mt-3 text-xs font-semibold text-slate-600">
              Wallet Balance: {formatCurrencyAbbreviated(walletBalance || 0)}
            </div>
          </div>
        )}

        {!['paid', 'protocol'].includes(feeStatus) && (
          <div className="max-w-sm mx-auto mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition ${paymentMethod === 'wallet'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Wallet
              </button>
              <button
                onClick={() => setPaymentMethod('paystack')}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition ${paymentMethod === 'paystack'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Paystack
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={
            isInitializing ||
            ['paid', 'protocol'].includes(feeStatus) ||
            (paymentMethod === 'wallet' && Number(walletBalance || 0) < Number(registrationFee || 0))
          }
          className={`px-10 py-4 rounded-2xl font-black transition-all shadow-lg ${['paid', 'protocol'].includes(feeStatus)
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
            }`}
        >
          {isInitializing
            ? paymentMethod === 'wallet'
              ? 'Processing Wallet Payment...'
              : 'Connecting to Payment Gateway...'
            : ['paid', 'protocol'].includes(feeStatus)
              ? 'Account Active'
              : paymentMethod === 'wallet'
                ? 'Pay with Wallet'
                : 'Pay with Paystack'}
        </button>
      </div>
    </SectionCard>
  );
}

// --- MICRO UTILS ---

function StatsCard({ title, value, color, icon: Icon }) {
  const colors = {
    primary: {
      card: 'border-blue-200/70',
      iconWrap: 'bg-blue-100 text-blue-600',
    },
    success: {
      card: 'border-emerald-200/70',
      iconWrap: 'bg-emerald-100 text-emerald-600',
    },
    amber: {
      card: 'border-amber-200/70',
      iconWrap: 'bg-amber-100 text-amber-600',
    },
  };
  const tone = colors[color] || colors.primary;

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${tone.card} shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${tone.iconWrap} flex items-center justify-center`}>
          {Icon ? <Icon size={18} /> : <Activity size={18} />}
        </div>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 mb-1">{title}</p>
      <div className="text-xl sm:text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(Number(value || 0))}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[calc(100vh-140px)]">
        <div className="px-6 py-4 sm:px-10 sm:py-8 border-b border-slate-50 flex items-center justify-between bg-white flex-shrink-0">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"><X size={24} /></button>
        </div>
        <div className="p-6 sm:p-10 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function PriceModal({ plan, onClose, onConfirm, initialPrice, submitLabel = 'Add Plan', loadingLabel = 'Processing...' }) {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto text-primary-600 mb-2 transition-transform hover:scale-110">
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">Set Selling Price</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{plan.name} • {plan.network}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Base Cost</label>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{formatCurrencyAbbreviated(plan.sellingPrice)}</span>
              </div>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">GH₵</div>
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-16 pr-8 py-5 sm:py-6 bg-slate-50 border-2 border-slate-100 rounded-[24px] text-slate-900 font-black text-lg sm:text-xl focus:outline-none focus:border-primary-500 focus:bg-white transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-top-1">
                  <AlertCircle size={14} />
                  <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-4 sm:py-5 bg-slate-50 text-slate-500 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-4 sm:py-5 bg-primary-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
              >
                {isSubmitting ? loadingLabel : submitLabel}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-2 opacity-20">
            <Lock size={10} />
            <p className="text-[8px] font-black uppercase tracking-[0.2em]">Secure Node Configuration</p>
          </div>
        </div>
      </div>
    </div>
  );
}

