import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  FileText,
  User,
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  Tag,
  Briefcase,
  Zap,
  ArrowRight,
  Copy,
  ScanText,
  Layers,
  CheckCircle2,
  Plus,
  RotateCw,
  FlipHorizontal,
} from 'lucide-react';
import { Lead, ExtractedLeadData, LeadStatus, LeadType } from '../types/lead';
import { supabase } from '../utils/storage';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Lead) => void;
  nextNo: number;
  initialImage?: string | null;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  nextNo,
  initialImage,
}) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [activeTab, setActiveTab] = useState<'form' | 'ocr'>('form');

  // Dual-sided images (Frente y Reverso)
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [currentCapturingSide, setCurrentCapturingSide] = useState<'front' | 'back'>('front');
  const [selectedPreviewSide, setSelectedPreviewSide] = useState<'front' | 'back'>('front');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedLeadData | null>(null);
  const [eventInput, setEventInput] = useState('EXPOPYME');
  const [generatorInput, setGeneratorInput] = useState('Sergio');
  const [statusInput, setStatusInput] = useState<LeadStatus>('Pendiente');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);

  // Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // File input refs
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-process initial image if passed
  useEffect(() => {
    if (isOpen && initialImage) {
      optimizeImage(initialImage).then((optimized) => {
        setFrontImage(optimized);
        processOCRImages(optimized, null);
      });
    }
  }, [isOpen, initialImage]);

  // Downscale and normalize large camera photos (e.g. 12-48MP from phones) to max 1600px
  const optimizeImage = (dataUrl: string, maxDimension = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Rotate an image 90 degrees clockwise and re-trigger OCR
  const rotateImage = async (side: 'front' | 'back') => {
    const target = side === 'front' ? frontImage : backImage;
    if (!target) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotated = canvas.toDataURL('image/jpeg', 0.90);
      if (side === 'front') {
        setFrontImage(rotated);
        processOCRImages(rotated, backImage);
      } else {
        setBackImage(rotated);
        processOCRImages(frontImage || rotated, rotated);
      }
    };
    img.src = target;
  };

  // Enhance contrast & brightness for dim, shadowed or unevenly lit cards
  const enhanceImageContrast = async (side: 'front' | 'back') => {
    const target = side === 'front' ? frontImage : backImage;
    if (!target) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      const contrast = 1.25;
      const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
      for (let i = 0; i < d.length; i += 4) {
        d[i] = factor * (d[i] - 128) + 128 + 12;
        d[i + 1] = factor * (d[i + 1] - 128) + 128 + 12;
        d[i + 2] = factor * (d[i + 2] - 128) + 128 + 12;
      }
      ctx.putImageData(imgData, 0, 0);
      const enhanced = canvas.toDataURL('image/jpeg', 0.90);
      if (side === 'front') {
        setFrontImage(enhanced);
        processOCRImages(enhanced, backImage);
      } else {
        setBackImage(enhanced);
        processOCRImages(frontImage || enhanced, enhanced);
      }
    };
    img.src = target;
  };

  // Listen to paste events (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const rawDataUrl = event.target?.result as string;
              const optimized = await optimizeImage(rawDataUrl);
              if (!frontImage) {
                setFrontImage(optimized);
                processOCRImages(optimized, backImage);
              } else {
                setBackImage(optimized);
                processOCRImages(frontImage, optimized);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, frontImage, backImage]);

  // Clean up camera on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFrontImage(null);
    setBackImage(null);
    setCurrentCapturingSide('front');
    setSelectedPreviewSide('front');
    setExtractedData(null);
    setIsProcessing(false);
    setErrorMessage(null);
    setConfidenceScore(null);
    setSaveSuccess(false);
    setActiveTab('form');
  };

  // Camera handlers
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevs);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = (targetSide: 'front' | 'back') => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    if (targetSide === 'front') {
      setFrontImage(dataUrl);
      setSelectedPreviewSide('front');
      // If user is just taking the front, switch side helper to back so they can take back immediately
      setCurrentCapturingSide('back');
      processOCRImages(dataUrl, backImage);
    } else {
      setBackImage(dataUrl);
      setSelectedPreviewSide('back');
      stopCamera();
      setMode('upload');
      processOCRImages(frontImage || dataUrl, dataUrl);
    }
  };

  const handleFileUpload = (file: File, side: 'front' | 'back') => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      const optimized = await optimizeImage(rawDataUrl);
      if (side === 'front') {
        setFrontImage(optimized);
        setSelectedPreviewSide('front');
        processOCRImages(optimized, backImage);
      } else {
        setBackImage(optimized);
        setSelectedPreviewSide('back');
        processOCRImages(frontImage || optimized, optimized);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate dual-sided sample cards for testing
  const loadDualSidedSample = () => {
    // Canvas 1: Front
    const canvasF = document.createElement('canvas');
    canvasF.width = 800;
    canvasF.height = 480;
    const ctxF = canvasF.getContext('2d');
    if (ctxF) {
      const grad = ctxF.createLinearGradient(0, 0, 800, 480);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctxF.fillStyle = grad;
      ctxF.fillRect(0, 0, 800, 480);

      ctxF.strokeStyle = '#6366f1';
      ctxF.lineWidth = 6;
      ctxF.strokeRect(20, 20, 760, 440);

      ctxF.fillStyle = '#818cf8';
      ctxF.font = 'bold 36px sans-serif';
      ctxF.fillText('INNOVATEC AUTOMATION', 50, 80);

      ctxF.fillStyle = '#c7d2fe';
      ctxF.font = '18px sans-serif';
      ctxF.fillText('Robótica Industrial y Soluciones de Automatización 4.0', 50, 115);

      ctxF.fillStyle = '#ffffff';
      ctxF.font = 'bold 32px sans-serif';
      ctxF.fillText('Ing. Carlos Eduardo Villarreal', 50, 200);

      ctxF.fillStyle = '#818cf8';
      ctxF.font = 'bold 20px sans-serif';
      ctxF.fillText('Director de Proyectos de Automatización', 50, 235);

      ctxF.fillStyle = '#e0e7ff';
      ctxF.font = '19px sans-serif';
      ctxF.fillText('📱 Celular: 8182903344', 50, 295);
      ctxF.fillText('☎️ Oficina MTY: (81) 8345-7700', 50, 335);
      ctxF.fillText('✉️ c.villarreal@innovatec.com.mx', 50, 375);
      ctxF.fillText('🌐 www.innovatec.com.mx', 50, 415);
    }

    // Canvas 2: Back (Reverso with catalog, second phone, branches and handwritten note)
    const canvasB = document.createElement('canvas');
    canvasB.width = 800;
    canvasB.height = 480;
    const ctxB = canvasB.getContext('2d');
    if (ctxB) {
      ctxB.fillStyle = '#ffffff';
      ctxB.fillRect(0, 0, 800, 480);

      ctxB.fillStyle = '#4f46e5';
      ctxB.fillRect(0, 0, 800, 15);

      ctxB.fillStyle = '#1e1b4b';
      ctxB.font = 'bold 24px sans-serif';
      ctxB.fillText('NUESTROS SERVICIOS ESPECIALIZADOS (REVERSO):', 50, 65);

      ctxB.fillStyle = '#334155';
      ctxB.font = '17px sans-serif';
      ctxB.fillText('• Celdas de soldadura y ensamble con robots KUKA, FANUC y ABB', 50, 105);
      ctxB.fillText('• Programación de PLC Siemens S7-1500, Allen Bradley y Omron', 50, 140);
      ctxB.fillText('• Sistemas de Visión Artificial Cognex y Keyence para control de calidad', 50, 175);
      ctxB.fillText('• Mantenimiento predictivo industrial y sensores IoT', 50, 210);

      ctxB.fillStyle = '#64748b';
      ctxB.font = '15px sans-serif';
      ctxB.fillText('📍 Sucursal Monterrey: Parque Industrial Apodaca, N.L. C.P. 66600', 50, 260);
      ctxB.fillText('📍 Sucursal Coahuila: Blvd. Venustiano Carranza 3400, Saltillo', 50, 290);
      ctxB.fillText('WhatsApp Soporte 24/7: 8114002299', 50, 320);

      // Handwritten note simulation on the back of card
      ctxB.fillStyle = '#1d4ed8';
      ctxB.font = 'italic 20px cursive';
      ctxB.fillText('✍️ Anotación a pluma: "Interesado en alianza para cotizar 2 celdas robóticas.', 50, 380);
      ctxB.fillText('Llamar el jueves después de las 3pm. Alianza estratégica."', 80, 415);
    }

    const frontData = canvasF.toDataURL('image/jpeg', 0.95);
    const backData = canvasB.toDataURL('image/jpeg', 0.95);

    setFrontImage(frontData);
    setBackImage(backData);
    setSelectedPreviewSide('front');
    processOCRImages(frontData, backData);
  };

  // Call backend to process front + optional back
  const processOCRImages = async (frontBase64: string, backBase64: string | null) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setExtractedData(null);
    setConfidenceScore(null);
    setSaveSuccess(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      const response = await fetch('/api/extract-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          frontImageBase64: frontBase64,
          backImageBase64: backBase64 || undefined,
          mimeType: 'image/jpeg',
          backMimeType: 'image/jpeg',
          defaultEvent: eventInput,
          defaultLeadGenerator: generatorInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Error al comunicarse con el servidor');
      }

      const result = await response.json();
      if (result.success && result.lead) {
        const lead = result.lead;
        setExtractedData({
          nombre: lead.nombre || '',
          apellidos: lead.apellidos || '',
          empresa: lead.empresa || '',
          evento: lead.evento || eventInput,
          notas: lead.notas || '',
          leadGenerator: lead.leadGenerator || generatorInput,
          giroServicio: lead.giroServicio || '',
          tipo: lead.tipo || 'Lead',
          celular: lead.celular || '',
          telefonoFijo: lead.telefonoFijo || '',
          correo: lead.correo || '',
          paginaWeb: lead.paginaWeb || '',
          puesto: lead.puesto || '',
          direccion: lead.direccion || '',
          status: lead.status || statusInput,
          confidence: lead.confidence || 95,
          rawTextSummary: lead.rawTextSummary || '',
          ocrTextLines: lead.ocrTextLines || [],
        });
        setConfidenceScore(lead.confidence || 95);
      } else {
        throw new Error('No se pudo interpretar el texto de la imagen.');
      }
    } catch (err: any) {
      console.error('Error procesando imagen OCR:', err);
      setErrorMessage(
        err.message || 'Ocurrió un error al procesar el OCR con Gemini. Intenta nuevamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedLeadData, value: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLine(text);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  const handleConfirmAndAdd = () => {
    if (!extractedData) return;

    const newLead: Lead = {
      id: `lead-scanned-${Date.now()}`,
      no: nextNo,
      nombre: extractedData.nombre || 'Sin nombre',
      apellidos: extractedData.apellidos || '',
      empresa: extractedData.empresa || 'Sin empresa',
      evento: extractedData.evento || eventInput || 'EXPOPYME',
      notas: extractedData.notas || '',
      leadGenerator: extractedData.leadGenerator || generatorInput,
      giroServicio: extractedData.giroServicio || '',
      tipo: extractedData.tipo || 'Lead',
      celular: extractedData.celular || '',
      telefonoFijo: extractedData.telefonoFijo || '',
      correo: extractedData.correo || '',
      paginaWeb: extractedData.paginaWeb || '',
      puesto: extractedData.puesto || '',
      direccion: extractedData.direccion || '',
      status: (extractedData.status as LeadStatus) || statusInput || 'Pendiente',
      createdAt: new Date().toISOString(),
      photoUrl: frontImage || undefined,
      photoBackUrl: backImage || undefined,
      confidence: confidenceScore || undefined,
      rawTextSummary: extractedData.rawTextSummary,
      ocrTextLines: extractedData.ocrTextLines,
    };

    onAddLead(newLead);
    setSaveSuccess(true);

    setTimeout(() => {
      resetForm();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <ScanText className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Escáner OCR Doble Cara (Frente + Reverso)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Gemini Multimodal
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Captura el frente y reverso de la tarjeta. La IA consolida contactos, servicios del reverso y notas manuscritas.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* Quick presets bar */}
          <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Evento:</span>
                <input
                  type="text"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Lead Generator:</span>
                <select
                  value={generatorInput}
                  onChange={(e) => setGeneratorInput(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                >
                  <option value="Sergio">Sergio</option>
                  <option value="Jess">Jess</option>
                  <option value="Litzy">Litzy</option>
                  <option value="Alexa">Alexa</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Estado:</span>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as LeadStatus)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800"
                >
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Contactado">🌀 Contactado</option>
                  <option value="Nuevo Cierre">💰 Nuevo Cierre</option>
                  <option value="Rechazado">🙅🏻‍♀️ Rechazado</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDualSidedSample}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-colors flex items-center gap-1.5"
                title="Cargar ejemplo con Frente y Reverso"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                Ejemplo Frente + Reverso
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Dual-Sided Capture & Previews */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Selector de modo y lados */}
              <div className="flex p-1 bg-slate-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setMode('upload');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'upload'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera');
                    startCamera();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'camera'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Cámara en Vivo
                </button>
              </div>

              {/* Slots de Frente y Reverso */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Lado 1: Frente */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewSide('front');
                    if (mode === 'camera') setCurrentCapturingSide('front');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    selectedPreviewSide === 'front'
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <span>1. Frente</span>
                      {frontImage && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {frontImage ? 'Foto cargada' : 'Cara principal'}
                    </p>
                  </div>
                  {frontImage && (
                    <img
                      src={frontImage}
                      alt="Miniatura frente"
                      className="w-8 h-8 rounded object-cover border border-slate-300"
                    />
                  )}
                </button>

                {/* Lado 2: Reverso */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewSide('back');
                    if (mode === 'camera') setCurrentCapturingSide('back');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    selectedPreviewSide === 'back'
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <span>2. Reverso</span>
                      {backImage && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {backImage ? 'Foto cargada' : 'Servicios / Notas'}
                    </p>
                  </div>
                  {backImage ? (
                    <img
                      src={backImage}
                      alt="Miniatura reverso"
                      className="w-8 h-8 rounded object-cover border border-slate-300"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      + Reverso
                    </span>
                  )}
                </button>
              </div>

              {/* Mode: Camera View */}
              {mode === 'camera' && (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex flex-col items-center justify-center border-2 border-slate-300 shadow-inner group">
                  {cameraError ? (
                    <div className="p-6 text-center text-red-400 max-w-xs">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs font-medium">{cameraError}</p>
                      <button
                        onClick={() => startCamera()}
                        className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
                      >
                        Reintentar Cámara
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Alignment guide */}
                      <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                        <span className="text-[11px] text-white/90 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs font-medium">
                          {currentCapturingSide === 'front'
                            ? '📷 Encuadra el FRENTE de la tarjeta'
                            : '🔄 Encuadra el REVERSO de la tarjeta'}
                        </span>
                      </div>

                      {/* Side toggle badge inside camera */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1.5">
                        <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Capturando: {currentCapturingSide === 'front' ? 'FRENTE' : 'REVERSO'}</span>
                      </div>

                      {/* Controls */}
                      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => capturePhoto('front')}
                          className={`px-4 py-2.5 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all ${
                            currentCapturingSide === 'front'
                              ? 'bg-indigo-600 text-white ring-2 ring-white/50 scale-105'
                              : 'bg-black/60 text-slate-200 hover:bg-black/80'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Foto Frente
                        </button>

                        <button
                          type="button"
                          onClick={() => capturePhoto('back')}
                          className={`px-4 py-2.5 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all ${
                            currentCapturingSide === 'back'
                              ? 'bg-indigo-600 text-white ring-2 ring-white/50 scale-105'
                              : 'bg-black/60 text-slate-200 hover:bg-black/80'
                          }`}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                          Foto Reverso
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mode: Upload / Dropzone */}
              {mode === 'upload' && (
                <div className="space-y-3">
                  
                  {/* Front image upload slot */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ScanText className="w-4 h-4 text-indigo-600" />
                        Foto del Frente (Obligatoria)
                      </span>
                      {frontImage && (
                        <button
                          type="button"
                          onClick={() => frontFileInputRef.current?.click()}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>

                    {frontImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-16/9 flex items-center justify-center group">
                        <img
                          src={frontImage}
                          alt="Frente"
                          className="w-full h-full object-contain"
                        />
                        {/* Quick photo fix toolbar */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 shadow-lg">
                          <button
                            type="button"
                            onClick={() => rotateImage('front')}
                            className="text-white hover:text-purple-300 text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Girar foto 90° (útil si la tarjeta salió de lado)"
                          >
                            <RotateCw className="w-3 h-3 text-purple-400" />
                            <span>Girar</span>
                          </button>
                          <span className="w-px h-3 bg-white/30" />
                          <button
                            type="button"
                            onClick={() => enhanceImageContrast('front')}
                            className="text-white hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Realzar nitidez y contraste para fotos oscuras o con sombras"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Realzar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => frontFileInputRef.current?.click()}
                        className="rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 p-5 text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-6 h-6 mx-auto text-indigo-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Subir foto del Frente</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o pegar con Ctrl+V</p>
                      </div>
                    )}
                    <input
                      ref={frontFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'front');
                      }}
                    />
                  </div>

                  {/* Back image upload slot (Reverso) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FlipHorizontal className="w-4 h-4 text-purple-600" />
                        Foto del Reverso (Opcional - Servicios y Notas)
                      </span>
                      {backImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setBackImage(null);
                            if (frontImage) processOCRImages(frontImage, null);
                          }}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {backImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-16/9 flex items-center justify-center group">
                        <img
                          src={backImage}
                          alt="Reverso"
                          className="w-full h-full object-contain"
                        />
                        {/* Quick photo fix toolbar */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 shadow-lg">
                          <button
                            type="button"
                            onClick={() => rotateImage('back')}
                            className="text-white hover:text-purple-300 text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Girar foto 90° (útil si la tarjeta salió de lado)"
                          >
                            <RotateCw className="w-3 h-3 text-purple-400" />
                            <span>Girar</span>
                          </button>
                          <span className="w-px h-3 bg-white/30" />
                          <button
                            type="button"
                            onClick={() => enhanceImageContrast('back')}
                            className="text-white hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Realzar nitidez y contraste"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Realzar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => backFileInputRef.current?.click()}
                        className="rounded-lg border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/20 p-4 text-center cursor-pointer transition-colors"
                      >
                        <Plus className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">
                          + Agregar foto del Reverso de la tarjeta
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Para extraer servicios, mapa, sucursales o notas manuscritas
                        </p>
                      </div>
                    )}
                    <input
                      ref={backFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'back');
                      }}
                    />
                  </div>

                  {/* Re-trigger OCR button if images exist */}
                  {(frontImage || backImage) && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => processOCRImages(frontImage!, backImage)}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      Re-analizar caras con OCR ({backImage ? 'Frente + Reverso' : 'Solo Frente'})
                    </button>
                  )}

                </div>
              )}

              {/* Status and Error messages */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-semibold">Error en lectura OCR</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  <span className="font-semibold">¡Datos consolidados guardados exitosamente en tu tabla!</span>
                </div>
              )}
            </div>

            {/* Right Column: Auto-Populated CRM Form Fields & OCR Inspector Tabs */}
            <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              
              {/* Header with Tab switcher */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    #{nextNo}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Datos Extraídos por OCR
                      {backImage && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Frente + Reverso
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">Mapeados automáticamente a las columnas del CRM</p>
                  </div>
                </div>

                {extractedData && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveTab('form')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        activeTab === 'form'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Campos Mapeados (
                      {[
                        extractedData.nombre,
                        extractedData.apellidos,
                        extractedData.empresa,
                        extractedData.puesto,
                        extractedData.celular,
                        extractedData.telefonoFijo,
                        extractedData.correo,
                        extractedData.paginaWeb,
                        extractedData.direccion,
                        extractedData.giroServicio,
                        extractedData.notas,
                      ].filter((v) => Boolean(v && v.trim())).length}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ocr')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                        activeTab === 'ocr'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ScanText className="w-3 h-3 text-indigo-500" />
                      Texto Crudo OCR ({extractedData.ocrTextLines?.length || 0})
                    </button>
                  </div>
                )}
              </div>

              {extractedData && (
                <div className="mb-3 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>¡Datos detectados con éxito!</strong> Revisa cada campo o escribe cualquier detalle adicional antes de guardar en tu tabla.
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200/60 font-bold text-emerald-900 shrink-0">
                    Confianza: {confidenceScore || 95}%
                  </span>
                </div>
              )}

              {!extractedData && !isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <ScanText className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Aún no hay foto cargada</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Sube la foto del frente de la tarjeta (y opcionalmente del reverso). El sistema OCR leerá ambas caras y unificará todos los datos en la tabla.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-800">
                    {backImage
                      ? 'Analizando conjuntamente Frente y Reverso con OCR...'
                      : 'Ejecutando Reconocimiento Óptico de Caracteres...'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Extrayendo contacto, servicios, notas a pluma y dirección física.
                  </p>
                </div>
              )}

              {/* TAB 1: Structured Form Fields */}
              {extractedData && activeTab === 'form' && (
                <div className="space-y-4">
                  {/* Name and Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={extractedData.nombre}
                        onChange={(e) => handleFieldChange('nombre', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-900"
                        placeholder="Ej. Gabriela / Ing. Roberto"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Apellidos
                      </label>
                      <input
                        type="text"
                        value={extractedData.apellidos}
                        onChange={(e) => handleFieldChange('apellidos', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-900"
                        placeholder="Ej. Monzalvo Carreto"
                      />
                    </div>
                  </div>

                  {/* Company and Job Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        Empresa
                      </label>
                      <input
                        type="text"
                        value={extractedData.empresa}
                        onChange={(e) => handleFieldChange('empresa', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-slate-900"
                        placeholder="Nombre de la empresa"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        Puesto / Cargo
                      </label>
                      <input
                        type="text"
                        value={extractedData.puesto}
                        onChange={(e) => handleFieldChange('puesto', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        placeholder="Ej. Director General, Gerente de Ventas"
                      />
                    </div>
                  </div>

                  {/* Phones and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        Celular / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={extractedData.celular}
                        onChange={(e) => handleFieldChange('celular', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-mono text-slate-900 font-semibold"
                        placeholder="8116294590"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        Teléfono Fijo
                      </label>
                      <input
                        type="text"
                        value={extractedData.telefonoFijo}
                        onChange={(e) => handleFieldChange('telefonoFijo', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        placeholder="8183690200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-600" />
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={extractedData.correo}
                        onChange={(e) => handleFieldChange('correo', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-900 font-medium"
                        placeholder="correo@empresa.com"
                      />
                    </div>
                  </div>

                  {/* Web & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        Página Web / Redes
                      </label>
                      <input
                        type="text"
                        value={extractedData.paginaWeb}
                        onChange={(e) => handleFieldChange('paginaWeb', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        placeholder="www.empresa.com.mx"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={extractedData.direccion}
                        onChange={(e) => handleFieldChange('direccion', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        placeholder="Calle, Colonia, C.P., Monterrey, N.L."
                      />
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        Tipo de Contacto
                      </label>
                      <select
                        value={extractedData.tipo}
                        onChange={(e) => handleFieldChange('tipo', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-900"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Lead Potencial">Lead Potencial</option>
                        <option value="Alianza">Alianza</option>
                        <option value="Proveedor">Proveedor</option>
                        <option value="Cliente">Cliente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Giro / Servicio {backImage && '(detectado del reverso)'}
                      </label>
                      <input
                        type="text"
                        value={extractedData.giroServicio}
                        onChange={(e) => handleFieldChange('giroServicio', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        placeholder="Ej. Celdas robóticas, Cursos de capacitación"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Estado CRM
                      </label>
                      <select
                        value={extractedData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-900"
                      >
                        <option value="Pendiente">⏳ Pendiente</option>
                        <option value="Contactado">🌀 Contactado</option>
                        <option value="Nuevo Cierre">💰 Nuevo Cierre</option>
                        <option value="Rechazado">🙅🏻‍♀️ Rechazado</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes / Comments */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Notas y Observaciones {backImage && '(incluye anotaciones del reverso)'}
                    </label>
                    <textarea
                      rows={2}
                      value={extractedData.notas}
                      onChange={(e) => handleFieldChange('notas', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                      placeholder="Anotaciones de la conversación, servicios de interés..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Raw OCR Detected Text Inspector */}
              {extractedData && activeTab === 'ocr' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ScanText className="w-4 h-4 text-indigo-600" />
                        Texto Leído en la Imagen ({extractedData.ocrTextLines?.length || 0} fragmentos)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Haz clic en cualquier línea para copiarla
                      </span>
                    </div>

                    {copiedLine && (
                      <div className="mb-2 p-1.5 bg-emerald-100 text-emerald-800 text-[11px] rounded font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Copiado al portapapeles: "{copiedLine}"
                      </div>
                    )}

                    <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                      {extractedData.ocrTextLines && extractedData.ocrTextLines.length > 0 ? (
                        extractedData.ocrTextLines.map((line, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-white rounded-lg border border-slate-200/80 hover:border-indigo-400 text-xs text-slate-800 font-mono flex items-center justify-between gap-2 transition-colors group"
                          >
                            <span
                              onClick={() => copyToClipboard(line)}
                              className="truncate flex-1 cursor-pointer hover:text-indigo-600"
                              title="Haz clic para copiar"
                            >
                              {line}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  handleFieldChange('puesto', line);
                                  setActiveTab('form');
                                }}
                                className="px-1.5 py-0.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-sans font-medium"
                                title="Asignar como Puesto"
                              >
                                + Puesto
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleFieldChange('empresa', line);
                                  setActiveTab('form');
                                }}
                                className="px-1.5 py-0.5 text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-sans font-medium"
                                title="Asignar como Empresa"
                              >
                                + Empresa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleFieldChange('notas', extractedData.notas ? `${extractedData.notas}\n${line}` : line);
                                  setActiveTab('form');
                                }}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-sans font-medium"
                                title="Agregar a Notas"
                              >
                                + Notas
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(line)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50"
                                title="Copiar texto"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic p-2">
                          {extractedData.rawTextSummary || 'Texto extraído directamente a los campos del formulario.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {extractedData.rawTextSummary && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        Resumen OCR Completo
                      </span>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                        {extractedData.rawTextSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!extractedData || isProcessing}
                    onClick={handleConfirmAndAdd}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Poner Datos Automáticamente en Tabla
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
