import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Sparkles, Globe, AlertCircle, Copy, Check, FileText, Key,
  HelpCircle, Zap, ChevronDown, Loader, Download, Moon, Sun,
  ShieldCheck, CreditCard, Award, Package, Users, BarChart2,
  MessageSquare, Clock, Lock, Heart, Target, Cpu, Database,
  Layers, Star, Smartphone, TrendingUp, Tag, Bell, RefreshCw,
  CheckCircle, ShoppingBag, UserCheck, Search, Leaf, Building2,
} from 'lucide-react';
import {
  fetchBrochure,
  fetchAvailableModels,
  detectProvider,
  isValidUrl,
  getProviderLabel,
} from './api/brochure';
import './App.css';

// ─── Icon keyword map (Turkish + English, emoji-free) ────────────────────────

const ICON_MAP = [
  { keys: ['güvenl', 'security', 'safe', 'koruma', 'protect'],             Icon: ShieldCheck   },
  { keys: ['ödeme', 'payment', 'fatura', 'invoice', 'kart', 'card'],       Icon: CreditCard    },
  { keys: ['hız', 'hızlı', 'fast', 'anında', 'instant', 'speed'],         Icon: Zap           },
  { keys: ['dünya', 'global', 'world', 'uluslararası', 'international'],   Icon: Globe         },
  { keys: ['kalite', 'quality', 'premium', 'mükemmel', 'excellence'],      Icon: Award         },
  { keys: ['kargo', 'teslimat', 'delivery', 'shipping', 'paket'],          Icon: Package       },
  { keys: ['müşteri', 'customer', 'destek', 'support', 'kullanıcı'],       Icon: Users         },
  { keys: ['analiz', 'rapor', 'data', 'veri', 'istatistik', 'analytics'],  Icon: BarChart2     },
  { keys: ['iletişim', 'mesaj', 'chat', 'message', 'konuş'],               Icon: MessageSquare },
  { keys: ['zaman', 'süre', 'time', 'saat', 'dakika', 'saatler'],          Icon: Clock         },
  { keys: ['kilit', 'şifre', 'lock', 'password', 'gizlilik', 'privacy'],   Icon: Lock          },
  { keys: ['sağlık', 'health', 'wellness', 'doğal', 'natural', 'organik'], Icon: Leaf          },
  { keys: ['sevgi', 'kalp', 'heart', 'mutlu', 'happy'],                    Icon: Heart         },
  { keys: ['hedef', 'goal', 'target', 'amaç', 'strateji', 'strategy'],    Icon: Target        },
  { keys: ['teknoloji', 'yapay', 'dijital', 'digital', 'yazılım', 'ai'],   Icon: Cpu           },
  { keys: ['veritabanı', 'database', 'depo', 'storage', 'bulut', 'cloud'], Icon: Database      },
  { keys: ['platform', 'çözüm', 'solution', 'katman', 'layer'],            Icon: Layers        },
  { keys: ['yıldız', 'star', 'favori', 'popüler', 'top'],                  Icon: Star          },
  { keys: ['telefon', 'phone', 'mobil', 'mobile'],                         Icon: Smartphone    },
  { keys: ['büyüme', 'growth', 'artış', 'increase', 'gelir', 'revenue'],   Icon: TrendingUp    },
  { keys: ['ekip', 'team', 'çalışan', 'personel', 'staff'],                Icon: UserCheck     },
  { keys: ['ürün', 'koleksiyon', 'catalog', 'mağaza', 'store'],            Icon: ShoppingBag   },
  { keys: ['fiyat', 'price', 'ücret', 'maliyet', 'cost', 'indirim'],       Icon: Tag           },
  { keys: ['bildirim', 'notification', 'uyarı', 'alert'],                  Icon: Bell          },
  { keys: ['güncelle', 'update', 'yenile', 'refresh'],                     Icon: RefreshCw     },
  { keys: ['arama', 'search', 'bul', 'keşfet', 'discover'],                Icon: Search        },
  { keys: ['şirket', 'kurum', 'company', 'corporate', 'business'],         Icon: Building2     },
];

function getIconForText(text = '') {
  const lower = text.toLowerCase();
  for (const { keys, Icon } of ICON_MAP) {
    if (keys.some((k) => lower.includes(k))) return Icon;
  }
  return CheckCircle;
}

function extractText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return '';
}

// ─── Custom ReactMarkdown renderers ─────────────────────────────────────────

function makeComponents() {
  return {
    li({ children }) {
      const text  = extractText(children);
      const Icon  = getIconForText(text);
      return (
        <li>
          <Icon size={14} className="li-icon" aria-hidden="true" />
          <span>{children}</span>
        </li>
      );
    },
  };
}

const MD_COMPONENTS = makeComponents();

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function BrochureSkeleton() {
  return (
    <div className="loading-state">
      <div className="loading-label">
        <span className="spinner-sm" />
        <span>İçerik analiz ediliyor ve broşür hazırlanıyor…</span>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line title" />
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-90"  />
        <div className="skeleton-line w-80"  />
        <div className="skeleton-divider" />
        <div className="skeleton-line w-40" style={{ height: 20, marginBottom: 16 }} />
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-90"  />
        <div className="skeleton-line w-65"  />
        <div className="skeleton-divider" />
        <div className="skeleton-line w-40" style={{ height: 20, marginBottom: 16 }} />
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-80"  />
      </div>
    </div>
  );
}

// ─── API Key Help Tooltip ─────────────────────────────────────────────────────

function ApiKeyHelp() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div className="api-help-wrapper" ref={ref}>
      <button
        className="api-help-trigger"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget)) setOpen(false); }}
        aria-expanded={open}
        type="button"
        id="api-help-btn"
      >
        <HelpCircle size={12} />
        Nasıl API Key alabilirim?
      </button>

      {open && (
        <div className="api-help-popover" role="tooltip">
          <p className="popover-title">Ücretsiz API Key kaynakları</p>
          <ul className="popover-list">
            <li>
              <span className="provider-chip gemini">Gemini</span>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>
              <span className="hint">— AIza… ile başlar</span>
            </li>
            <li>
              <span className="provider-chip groq">Groq</span>
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq Console</a>
              <span className="hint">— gsk_ ile başlar</span>
            </li>
            <li>
              <span className="provider-chip openai">OpenAI</span>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI Platform</a>
              <span className="hint">— sk- ile başlar</span>
            </li>
          </ul>
          <p className="popover-note">Key girince modeller <strong>otomatik</strong> yüklenir.</p>
        </div>
      )}
    </div>
  );
}

// ─── Dynamic Model Selector ───────────────────────────────────────────────────

function ModelSelector({ models, value, onChange, loading, error, disabled }) {
  if (loading) return (
    <div className="model-select-wrapper">
      <div className="model-loading-pill"><Loader size={13} className="spin-icon" />Modeller yükleniyor…</div>
    </div>
  );
  if (error) return (
    <div className="model-select-wrapper">
      <div className="model-error-pill">Model listesi alınamadı</div>
    </div>
  );
  if (models.length === 0) return (
    <div className="model-select-wrapper">
      <div className="model-empty-pill">API Key girin → modeller yüklenir</div>
    </div>
  );
  return (
    <div className="model-select-wrapper">
      <ChevronDown size={14} className="model-select-icon" />
      <select id="model-select" className="model-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {models.map((m) => <option key={m.modelId} value={m.modelId}>{m.label}</option>)}
      </select>
    </div>
  );
}

// ─── Result Badge ─────────────────────────────────────────────────────────────

function ResultBadge({ provider, modelLabel }) {
  if (!provider) return null;
  return (
    <span className={`detected-badge ${provider}`}>
      <Zap size={11} />
      {modelLabel || getProviderLabel(provider)}
    </span>
  );
}

function ProviderIndicator({ provider }) {
  if (!provider) return null;
  const labels = { gemini: 'Gemini', groq: 'Groq', openai: 'OpenAI' };
  return <span className={`provider-chip ${provider}`} style={{ marginLeft: 8, alignSelf: 'center' }}>{labels[provider]}</span>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [url, setUrl]                         = useState('');
  const [apiKey, setApiKey]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [brochure, setBrochure]               = useState('');
  const [provider, setProvider]               = useState('');
  const [modelLabel, setModelLabel]           = useState('');
  const [error, setError]                     = useState('');
  const [copied, setCopied]                   = useState(false);
  const [pdfLoading, setPdfLoading]           = useState(false);
  const [darkMode, setDarkMode]               = useState(false);

  // Dinamik model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelsLoading, setModelsLoading]     = useState(false);
  const [modelsError, setModelsError]         = useState('');
  const [detectedProv, setDetectedProv]       = useState('');

  // ── Dark mode class on <html> ────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── API Key → fetch models (600ms debounce) ──────────────────────────────
  useEffect(() => {
    const trimmed = apiKey.trim();
    const prov    = detectProvider(trimmed);

    setDetectedProv(prov || '');

    if (!prov || trimmed.length < 10) {
      setAvailableModels([]);
      setSelectedModelId('');
      setModelsError('');
      return;
    }

    const timer = setTimeout(async () => {
      setModelsLoading(true);
      setModelsError('');
      setAvailableModels([]);
      setSelectedModelId('');
      try {
        const models = await fetchAvailableModels(trimmed);
        setAvailableModels(models);
        if (models.length > 0) setSelectedModelId(models[0].modelId);
      } catch (err) {
        setModelsError(err.message);
      } finally {
        setModelsLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [apiKey]);

  // ── Generate ─────────────────────────────────────────────────────────────
  async function handleGenerate() {
    const trimmedUrl = url.trim();
    const trimmedKey = apiKey.trim();

    if (!trimmedUrl)             { setError('Lütfen bir URL girin.'); return; }
    if (!isValidUrl(trimmedUrl)) { setError('Geçerli bir URL girin. Örnek: https://openai.com'); return; }
    if (!trimmedKey)             { setError('Lütfen API anahtarınızı girin.'); return; }
    if (!selectedModelId)        { setError('Lütfen bir model seçin (önce API Key girin).'); return; }

    setError('');
    setBrochure('');
    setModelLabel('');
    setProvider('');
    setLoading(true);

    try {
      const result = await fetchBrochure(trimmedUrl, trimmedKey, selectedModelId);
      setBrochure(result.markdown);
      setProvider(result.provider);
      setModelLabel(result.modelLabel);
    } catch (err) {
      setError(err.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleGenerate();
  }

  // ── Copy ─────────────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brochure);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  // ── PDF Download ─────────────────────────────────────────────────────────

  /** URL'den marka adını akıllıca çıkarır.
   *  tr.pinterest.com  → Pinterest_Brosuru.pdf
   *  www.apple.com.tr  → Apple_Brosuru.pdf
   *  chat.openai.com   → Openai_Brosuru.pdf
   *
   *  Algoritma: sağdan sola TLD token'larını atla (.com, .tr, .co …),
   *  ilk TLD-olmayan parça marka adıdır.
   */
  function buildPdfFileName(rawUrl) {
    try {
      const normalized = rawUrl.trim().startsWith('http')
        ? rawUrl.trim()
        : `https://${rawUrl.trim()}`;

      const hostname = new URL(normalized).hostname.toLowerCase(); // örn: tr.pinterest.com
      const parts    = hostname.split('.');                        // ['tr','pinterest','com']

      // Bilinen TLD token'ları — ülke kodları + genel uzantılar
      const TLD_TOKENS = new Set([
        'com','org','net','io','co','gov','edu','ac','app','info','biz','me','tv','ai','so','dev',
        'tr','uk','de','fr','it','es','jp','cn','ru','br','au','ca','nl','pl','be','ch',
        'se','no','dk','fi','pt','gr','cz','sk','ro','hu','bg','hr','lt','lv','ee','si',
        'at','ie','lu','us','mx','ar','cl','in','kr','za','nz','sg','hk','my','id','th',
      ]);

      // Sağdan TLD'leri atla → ilk TLD-olmayan parça = marka
      let idx = parts.length - 1;
      while (idx > 0 && TLD_TOKENS.has(parts[idx])) idx--;

      const brand = parts[idx];
      const capitalized = brand.charAt(0).toUpperCase() + brand.slice(1);
      return `${capitalized}_Brosuru.pdf`;
    } catch {
      return 'Dijital_Brosur.pdf';
    }
  }

  async function handlePDF() {
    const el = document.getElementById('brochure-paper');
    if (!el) return;

    // Dinamik dosya adı: URL'den domain çıkar
    const fileName = buildPdfFileName(url);

    setPdfLoading(true);
    try {
      // 1. Canvas: scale:2 yeterli çözünürlük, useCORS CORS hatalarını önler
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: darkMode ? '#0d0d1a' : '#ffffff',
      });

      // 2. JPEG sıkıştırma (0.8 kalite) — PNG'ye göre ~4-5x daha küçük boyut
      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      // 3. A4 formatı: 'p' (portrait), 'mm', 'a4'
      const pdf  = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
      const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm
      const imgH = (canvas.height * pdfW) / canvas.width; // orantılı yükseklik

      // Çok sayfalı destek
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfW, imgH);
        yOffset += pdfH;
      }

      // 4. Dosyayı kesin isimle indirmek için File System Access API (Modern Tarayıcılar)
      const blob = pdf.output('blob');

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PDF Dosyası',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setPdfLoading(false);
          return; // Başarıyla kaydedildi, çıkış yap
        } catch (err) {
          // Eğer kullanıcı pencereyi kapatırsa (AbortError) işlemi iptal et
          if (err.name === 'AbortError') {
            setPdfLoading(false);
            return;
          }
          // Başka bir hata olursa fallback yöntemine geç
          console.error('FilePicker Hatası:', err);
        }
      }

      // Fallback: Eski tarz <a download> (Eski tarayıcılar için)
      const blobUrl = URL.createObjectURL(blob);
      const anchor  = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href     = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);

      // DOM'a eklenmesini garantilemek için çok kısa bir bekleme
      setTimeout(() => {
        anchor.click();
        setTimeout(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }, 0);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="app">

      {/* Theme toggle — fixed top-right */}
      <button
        className="theme-toggle"
        onClick={() => setDarkMode((v) => !v)}
        aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
        id="theme-toggle-btn"
        title={darkMode ? 'Açık Tema' : 'Cyber / Koyu Tema'}
      >
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        {darkMode ? 'Açık' : 'Cyber'}
      </button>

      {/* Header */}
      <header className="header">
        <div className="header-badge">
          <Sparkles size={12} />
          Yapay Zeka Destekli
        </div>
        <h1>
          Anında <span>Dijital Broşür</span> Üret
        </h1>
        <p>
          Herhangi bir şirketin veya ürünün web sitesini yapay zekâya ver;
          saniyeler içinde şık, profesyonel bir broşür hazırla.
        </p>
      </header>

      {/* Input Card */}
      <section className="input-card">

        {/* URL */}
        <label className="input-label" htmlFor="url-input">
          <Globe size={12} style={{ display: 'inline', marginRight: 5 }} />
          Web Sitesi URL'si
        </label>
        <div className="input-row" style={{ marginBottom: 24 }}>
          <input
            id="url-input"
            type="url"
            className="url-input"
            placeholder="https://openai.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="off"
          />
        </div>

        {/* API Key */}
        <label className="input-label" htmlFor="api-key-input">
          <Key size={12} style={{ display: 'inline', marginRight: 5 }} />
          API Anahtarı
          <ProviderIndicator provider={detectedProv} />
        </label>
        <div className="input-row">
          <input
            id="api-key-input"
            type="password"
            className="url-input"
            placeholder="API Anahtarınızı girin (Gemini, Groq veya OpenAI)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="off"
          />
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={loading || modelsLoading}
            id="generate-btn"
          >
            {loading ? (
              <><span className="spinner" />Hazırlanıyor…</>
            ) : (
              <><Sparkles size={16} />Broşür Üret</>
            )}
          </button>
        </div>

        {/* Model */}
        <div className="model-row">
          <label className="input-label" htmlFor="model-select" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
            Model
          </label>
          <ModelSelector
            models={availableModels}
            value={selectedModelId}
            onChange={setSelectedModelId}
            loading={modelsLoading}
            error={modelsError}
            disabled={loading}
          />
        </div>

        <ApiKeyHelp />
      </section>

      {/* Error */}
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} className="icon" />
          <div>
            <div className="error-title">Bir hata oluştu</div>
            <div className="error-msg">{error}</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <BrochureSkeleton />}

      {/* Brochure Result */}
      {brochure && !loading && (
        <div className="brochure-wrapper">
          <div className="brochure-toolbar">
            <div className="brochure-label">
              <span className="dot" />
              <FileText size={13} />
              Dijital Broşür
              <ResultBadge provider={provider} modelLabel={modelLabel} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-copy" onClick={handlePDF} disabled={pdfLoading} id="pdf-btn">
                {pdfLoading ? <Loader size={14} className="spin-icon" /> : <Download size={14} />}
                {pdfLoading ? 'Hazırlanıyor…' : 'PDF İndir'}
              </button>
              <button className="btn-copy" onClick={handleCopy} id="copy-btn">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Kopyalandı!' : 'Kopyala'}
              </button>
            </div>
          </div>

          <article className="brochure-paper" id="brochure-paper">
            <div className="brochure-content brochure-body">
              <ReactMarkdown components={MD_COMPONENTS}>{brochure}</ReactMarkdown>
            </div>
          </article>
        </div>
      )}

      <footer className="footer">
        Jina AI Reader · Gemini · Groq · OpenAI — AI Broşür Üreteci
      </footer>
    </main>
  );
}
