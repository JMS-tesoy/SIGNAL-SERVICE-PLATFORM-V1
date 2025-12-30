'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { downloadApi, DownloadFile } from '@/lib/api';

// Popular MT5 brokers list
const BROKERS = [
  { id: 'icmarkets', name: 'IC Markets', server: 'ICMarketsSC-Demo' },
  { id: 'xm', name: 'XM Global', server: 'XMGlobal-MT5' },
  { id: 'pepperstone', name: 'Pepperstone', server: 'Pepperstone-Demo' },
  { id: 'fxpro', name: 'FxPro', server: 'FxPro-MT5' },
  { id: 'oanda', name: 'OANDA', server: 'OANDA-MT5' },
  { id: 'fxtm', name: 'FXTM', server: 'ForexTimeFXTM-Demo01' },
  { id: 'exness', name: 'Exness', server: 'Exness-MT5Real' },
  { id: 'roboforex', name: 'RoboForex', server: 'RoboForex-ECN' },
  { id: 'tickmill', name: 'Tickmill', server: 'Tickmill-Demo' },
  { id: 'admirals', name: 'Admirals (Admiral Markets)', server: 'AdmiralMarkets-Demo' },
  { id: 'avatrade', name: 'AvaTrade', server: 'AvaTrade-Demo' },
  { id: 'hfm', name: 'HFM (HotForex)', server: 'HFMarketsSV-Demo' },
  { id: 'other', name: 'Other Broker', server: '' },
];

export default function DownloadsPage() {
  const { accessToken } = useAuthStore();
  const [downloads, setDownloads] = useState<DownloadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedBroker, setSelectedBroker] = useState(BROKERS[0].id);
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-broker-dropdown]')) {
        setShowBrokerDropdown(false);
      }
    };

    if (showBrokerDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBrokerDropdown]);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!accessToken) return;

      try {
        const result = await downloadApi.getAvailableDownloads(accessToken);
        if (result.data) {
          setDownloads(result.data.downloads);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to load downloads');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDownloads();
  }, [accessToken]);

  const handleDownload = async (file: DownloadFile) => {
    if (!accessToken) return;

    setDownloadingId(file.id);
    setError('');

    try {
      const response = await fetch(downloadApi.getDownloadUrl(file.id), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Downloads</h1>
        <p className="text-foreground-muted">
          Download Expert Advisors and tools for your MetaTrader 5 terminal
        </p>
      </div>

      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center gap-3 text-accent-red">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Installation Guide */}
      <div className="card bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Installation Instructions
        </h3>
        <ol className="text-sm text-foreground-muted space-y-2 list-decimal list-inside">
          <li>Download the Signal Receiver EA file below</li>
          <li>Open your MetaTrader 5 terminal</li>
          <li>Go to <strong>File</strong> &gt; <strong>Open Data Folder</strong></li>
          <li>Navigate to <strong>MQL5</strong> &gt; <strong>Experts</strong></li>
          <li>Copy the downloaded .ex5 file to this folder</li>
          <li>Restart MetaTrader 5 or right-click on <strong>Expert Advisors</strong> in Navigator and select <strong>Refresh</strong></li>
          <li>Drag the EA onto any chart and configure your account settings</li>
        </ol>
      </div>

      {/* Downloads List */}
      <div className="space-y-4">
        {downloads.length === 0 ? (
          <div className="card text-center py-12">
            <Download className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Downloads Available</h3>
            <p className="text-foreground-muted">
              Check back later for available downloads
            </p>
          </div>
        ) : (
          downloads.map((file, index) => {
            const isReceiverEA = file.name.toLowerCase().includes('receiver') ||
                                 file.filename.toLowerCase().includes('receiver');
            const currentBroker = BROKERS.find(b => b.id === selectedBroker);

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileDown className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{file.name}</h3>
                      <p className="text-sm text-foreground-muted">{file.description}</p>
                      <p className="text-xs text-foreground-subtle mt-1">{file.filename}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    {downloadingId === file.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>

                {/* Broker Selection for Signal Receiver EA */}
                {isReceiverEA && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Select Your Broker</span>
                    </div>

                    <div className="relative" data-broker-dropdown>
                      <button
                        type="button"
                        onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                        className="w-full sm:w-80 flex items-center justify-between px-4 py-3 bg-background-elevated border border-border rounded-xl text-left hover:border-primary/50 transition-colors"
                      >
                        <span className="text-foreground">
                          {currentBroker?.name || 'Select a broker'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform ${showBrokerDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showBrokerDropdown && (
                        <div className="absolute z-50 w-full sm:w-80 mt-2 py-2 bg-background-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
                          {BROKERS.map((broker) => (
                            <button
                              key={broker.id}
                              type="button"
                              onClick={() => {
                                setSelectedBroker(broker.id);
                                setShowBrokerDropdown(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left hover:bg-background-elevated transition-colors flex items-center justify-between ${
                                selectedBroker === broker.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                              }`}
                            >
                              <span>{broker.name}</span>
                              {selectedBroker === broker.id && (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {currentBroker && currentBroker.id !== 'other' && (
                      <p className="mt-2 text-xs text-foreground-muted">
                        Default server: <span className="font-mono text-foreground-subtle">{currentBroker.server}</span>
                      </p>
                    )}

                    {currentBroker?.id === 'other' && (
                      <p className="mt-2 text-xs text-foreground-muted">
                        The EA works with any MT5 broker. Configure your server in the EA settings.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Additional Info */}
      <div className="card bg-background-elevated">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Verified & Safe</h4>
            <p className="text-sm text-foreground-muted">
              All Expert Advisors are compiled and tested by our team. They communicate
              securely with our servers using encrypted connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
