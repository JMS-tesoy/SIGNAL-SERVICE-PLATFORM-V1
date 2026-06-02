'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { downloadApi, DownloadFile } from '@/lib/api';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

export default function DownloadsPage() {
  const { accessToken } = useAuthStore();
  const [downloads, setDownloads] = useState<DownloadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState('');

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue(''), 1600);
    } catch {
      setError('Failed to copy value.');
    }
  };

  const fetchDownloads = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await downloadApi.getAvailableDownloads(accessToken);
      if (result.data) {
        setDownloads(result.data.downloads);
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to load downloads');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

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
        <div className="flex flex-col gap-3 rounded-xl border border-accent-red/20 bg-accent-red/10 p-4 text-accent-red sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={fetchDownloads} className="btn-secondary text-sm">
            Retry
          </button>
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
          <li>Add the EA WebRequest URL below in MT5 <strong>Tools</strong> &gt; <strong>Options</strong> &gt; <strong>Expert Advisors</strong></li>
        </ol>
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">EA WebRequest URL</p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{API_BASE_URL}</p>
          </div>
          <button
            type="button"
            onClick={() => copyText(API_BASE_URL)}
            className="btn-secondary flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Copy className="h-4 w-4" />
            {copiedValue === API_BASE_URL ? 'Copied' : 'Copy'}
          </button>
        </div>
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
