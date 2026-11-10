import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@gradio/client';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileVideo,
  Play,
  RotateCcw,
  Brain,
  Activity,
  Info,
  ShieldAlert,
  Settings,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

const DEFAULT_SPACE = import.meta.env.VITE_HF_SPACE || 'thanmayeed2006/asd-backend';

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_SPACE);
  const [tempApiUrl, setTempApiUrl] = useState(DEFAULT_SPACE);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'healthy' | 'offline'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Check Space connection
  const checkHealth = async (spaceToConnect = apiUrl) => {
    setHealthStatus('checking');
    try {
      const client = await Client.connect(spaceToConnect);
      if (client) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('offline');
      }
    } catch (err) {
      console.warn('Backend connection error:', err.message);
      setHealthStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth(apiUrl);
  }, [apiUrl]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (file) => {
    if (!file) return;
    setError(null);
    setResult(null);

    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mkv'];
    const isExtensionValid = /\.(mp4|avi|mov|mkv|mpeg|mpg|webm)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      setError('Please select a valid video format (.mp4, .avi, .mov, or .webm).');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('The selected video exceeds the 100 MB maximum size limit.');
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgressStep('Connecting to AI Space & uploading video...');

    const timer1 = setTimeout(() => {
      setProgressStep('Extracting key video frames & processing VGG16 features...');
    }, 2500);

    const timer2 = setTimeout(() => {
      setProgressStep('Evaluating temporal patterns with LSTM neural network...');
    }, 5500);

    try {
      const client = await Client.connect(apiUrl);

      const response = await client.predict('/predict', {
        video_path: selectedFile,
      });

      // Gradio output: response.data[0] = summary text, response.data[1] = confidence object
      const summaryText = response.data[0] || '';
      const scores = response.data[1] || {};

      let asdScore = Number(scores.ASD ?? scores['ASD'] ?? 0);
      let tdScore = Number(scores.TD ?? scores['TD'] ?? 0);

      // Handle softmax normalization fallback if needed
      if (asdScore + tdScore > 0 && Math.abs(asdScore + tdScore - 1) > 0.05) {
        const sum = asdScore + tdScore;
        asdScore = asdScore / sum;
        tdScore = tdScore / sum;
      }

      const predictedClass = asdScore >= tdScore ? 'ASD' : 'TD';

      setResult({
        predicted_class: predictedClass,
        summary: summaryText,
        model_scores: {
          ASD: asdScore,
          TD: tdScore,
        },
        frames_extracted: 5,
      });
    } catch (err) {
      console.error('Prediction failed:', err);
      let msg = 'Failed to analyze video. Check that the Space is running and reachable.';
      if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
      setProgressStep('');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveSettings = (e) => {
    e.preventDefault();
    setApiUrl(tempApiUrl);
    setShowSettings(false);
    checkHealth(tempApiUrl);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg glass-nav sticky-top py-3">
        <div className="container">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <Brain size={24} />
            </div>
            <div>
              <span className="navbar-brand brand-font fs-4 text-primary m-0 p-0 d-block leading-none">AutiTrack</span>
              <small className="text-muted" style={{ fontSize: '11px' }}>AI Autism Video Screening</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Live Backend Status */}
            <div className="d-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border">
              <span className={`pulse-dot ${
                healthStatus === 'healthy' ? 'pulse-green' : healthStatus === 'checking' ? 'pulse-yellow' : 'pulse-red'
              }`}></span>
              <small className="fw-medium text-secondary">
                Backend: {healthStatus === 'healthy' ? 'Online' : healthStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </small>
            </div>

            <button
              onClick={() => { setTempApiUrl(apiUrl); setShowSettings(true); }}
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill"
              title="Configure Backend Space"
            >
              <Settings size={15} />
              <span className="d-none d-md-inline">Space Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-gradient py-5 border-bottom">
        <div className="container text-center py-2">
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold mb-3">
            Computer Vision & Deep Temporal Modeling
          </span>
          <h1 className="brand-font display-5 fw-bold text-dark mb-3">
            Early Autism Screening from Behavioral Video
          </h1>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '680px' }}>
            AutiTrack extracts visual feature representations across sampled video frames using VGG16 and evaluates temporal behavior with an LSTM sequence model.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="container my-5 flex-grow-1">
        <div className="row g-4">
          {/* Video Upload & Preview Column */}
          <div className="col-lg-6">
            <div className="card-custom p-4 h-100 d-flex flex-column">
              <h5 className="fw-bold d-flex align-items-center gap-2 mb-3">
                <FileVideo className="text-primary" size={20} />
                Video Upload & Inspection
              </h5>

              {!selectedFile ? (
                <div
                  className={`upload-zone flex-grow-1 d-flex flex-column align-items-center justify-content-center ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-3 bg-white rounded-circle shadow-sm mb-3 text-primary">
                    <UploadCloud size={38} />
                  </div>
                  <h6 className="fw-bold mb-1">Click to upload or drag video here</h6>
                  <p className="text-muted small mb-3">Supports MP4, AVI, MOV, WEBM (Max 100 MB)</p>
                  <button type="button" className="btn btn-sm btn-outline-primary px-4 rounded-pill">
                    Browse File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="d-none"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="d-flex flex-column flex-grow-1">
                  <div className="position-relative bg-dark rounded-3 overflow-hidden mb-3 text-center" style={{ minHeight: '260px' }}>
                    <video
                      src={previewUrl}
                      controls
                      className="w-100"
                      style={{ maxHeight: '340px', objectFit: 'contain' }}
                    />
                  </div>

                  <div className="p-3 bg-light rounded-3 border mb-3 d-flex justify-content-between align-items-center">
                    <div className="text-truncate me-2">
                      <p className="fw-semibold mb-0 text-truncate">{selectedFile.name}</p>
                      <small className="text-muted">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</small>
                    </div>
                    <button
                      onClick={handleReset}
                      disabled={isAnalyzing}
                      className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-pill"
                    >
                      <RotateCcw size={14} /> Remove
                    </button>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || healthStatus === 'offline'}
                    className="btn btn-primary btn-lg w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 mt-auto shadow-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Analyzing Behavioral Patterns...
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="currentColor" /> Run AI Screening Analysis
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Status or Progress Feedback */}
              {isAnalyzing && (
                <div className="mt-3 p-3 bg-primary-subtle rounded-3 text-primary small d-flex align-items-center gap-2">
                  <div className="spinner-grow spinner-grow-sm" role="status"></div>
                  <span>{progressStep}</span>
                </div>
              )}

              {error && (
                <div className="alert alert-danger mt-3 d-flex align-items-start gap-2 mb-0" role="alert">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <div className="small">{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* Results Column */}
          <div className="col-lg-6">
            <div className="card-custom p-4 h-100 d-flex flex-column">
              <h5 className="fw-bold d-flex align-items-center gap-2 mb-3">
                <Activity className="text-primary" size={20} />
                Screening Results & Confidence Breakdown
              </h5>

              {!result ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 bg-light rounded-3 border">
                  <Brain size={48} className="text-muted opacity-50 mb-3" />
                  <h6 className="fw-bold text-secondary">Awaiting Video Input</h6>
                  <p className="text-muted small mb-0" style={{ maxWidth: '320px' }}>
                    Upload a child interaction video on the left and click "Run AI Screening Analysis" to generate model predictions.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column flex-grow-1">
                  {/* Classification Card */}
                  <div className="p-4 rounded-3 border text-center mb-4 bg-light">
                    <span className="text-uppercase tracking-wider text-muted fw-bold small d-block mb-2">
                      Predicted Classification
                    </span>

                    {result.predicted_class === 'ASD' ? (
                      <div>
                        <div className="badge-asd fs-5 mb-2">
                          <AlertTriangle size={20} />
                          Features Consistent with ASD
                        </div>
                        <p className="text-muted small mt-1 mb-0">
                          Autism Spectrum Disorder behavioral pattern detected by LSTM.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="badge-td fs-5 mb-2">
                          <CheckCircle2 size={20} />
                          Features Consistent with TD
                        </div>
                        <p className="text-muted small mt-1 mb-0">
                          Typically Developing behavioral pattern detected.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confidence Breakdown Bars */}
                  <h6 className="fw-bold text-secondary mb-3">Softmax Confidence Scores</h6>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small fw-semibold mb-1">
                      <span>ASD (Autism Spectrum Disorder)</span>
                      <span>{((result.model_scores?.ASD || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress progress-custom">
                      <div
                        className="progress-bar bg-danger"
                        role="progressbar"
                        style={{ width: `${(result.model_scores?.ASD || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between small fw-semibold mb-1">
                      <span>TD (Typically Developing)</span>
                      <span>{((result.model_scores?.TD || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress progress-custom">
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: `${(result.model_scores?.TD || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pipeline Metadata Badges */}
                  <div className="row g-2 mb-4 text-center">
                    <div className="col-6">
                      <div className="p-2 border rounded-3 bg-white">
                        <small className="text-muted d-block">Sampled Frames</small>
                        <span className="fw-bold text-dark">{result.frames_extracted || 5} frames</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-2 border rounded-3 bg-white">
                        <small className="text-muted d-block">Feature Model</small>
                        <span className="fw-bold text-dark">VGG16 + LSTM</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Disclaimer Box */}
                  <div className="p-3 rounded-3 bg-warning-subtle border border-warning-subtle text-dark small mt-auto">
                    <div className="d-flex align-items-center gap-2 fw-bold text-warning-emphasis mb-1">
                      <ShieldAlert size={16} />
                      Academic & Research Use Only
                    </div>
                    <p className="mb-0 text-secondary" style={{ fontSize: '12px' }}>
                      This model achieves approximately ~56.4% experimental accuracy and is not clinically validated. It must NOT be used for medical diagnosis or clinical evaluation. Always consult a certified pediatrician or child neurologist.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Architecture Section */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="card-custom p-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <Info className="text-primary" size={20} />
                How the Screening Pipeline Works
              </h5>
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 h-100 bg-light">
                    <div className="badge bg-primary text-white mb-2">Stage 1</div>
                    <h6 className="fw-bold">Uniform Frame Sampling</h6>
                    <p className="text-muted small mb-0">
                      5 evenly spaced frames are extracted across the full duration of the video and normalized to 224×224 pixels.
                    </p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 h-100 bg-light">
                    <div className="badge bg-primary text-white mb-2">Stage 2</div>
                    <h6 className="fw-bold">VGG16 Feature Extraction</h6>
                    <p className="text-muted small mb-0">
                      Each sampled frame is processed through ImageNet-pretrained VGG16 layers to produce 1,000 spatial visual features per frame.
                    </p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 h-100 bg-light">
                    <div className="badge bg-primary text-white mb-2">Stage 3</div>
                    <h6 className="fw-bold">LSTM Sequence Classification</h6>
                    <p className="text-muted small mb-0">
                      The (5, 1000) sequence is fed into a trained Long Short-Term Memory (LSTM) recurrent network to classify temporal cues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Hugging Face Space Settings</h5>
                <button type="button" className="btn-close" onClick={() => setShowSettings(false)}></button>
              </div>
              <form onSubmit={saveSettings}>
                <div className="modal-body">
                  <label className="form-label fw-semibold small">Hugging Face Space ID or URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    placeholder="thanmayeed2006/asd-backend"
                    required
                  />
                  <div className="form-text mt-2">
                    Default: <code>thanmayeed2006/asd-backend</code>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowSettings(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save & Test Connection
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-top py-4 bg-white mt-auto">
        <div className="container text-center text-muted small">
          <p className="mb-1">
            <strong>AutiTrack</strong> — Machine Learning Video Classification Project
          </p>
          <p className="mb-0" style={{ fontSize: '11px' }}>
            Powered by VGG16-LSTM Model. Connected to Hugging Face Space: <code>{apiUrl}</code>
          </p>
        </div>
      </footer>
    </div>
  );
}
