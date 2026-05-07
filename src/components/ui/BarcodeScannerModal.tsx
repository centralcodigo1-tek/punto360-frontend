import { useEffect, useRef, useState } from "react";
import { X, Camera, CameraOff, RefreshCw, ScanLine } from "lucide-react";

interface Props {
    onScan: (code: string) => void;
    onClose: () => void;
}

declare class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(source: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
    static getSupportedFormats(): Promise<string[]>;
}

const SUPPORTED = typeof window !== "undefined" && "BarcodeDetector" in window;

export default function BarcodeScannerModal({ onScan, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>("");
    const [manualCode, setManualCode] = useState("");

    const stopStream = () => {
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    const startCamera = async (deviceId?: string) => {
        stopStream();
        setError(null);
        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: { ideal: "environment" } },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Populate camera list after first access (permissions granted)
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");
            setCameras(videoDevices);
            if (!deviceId) {
                const active = stream.getVideoTracks()[0];
                const settings = active.getSettings();
                setSelectedCamera(settings.deviceId ?? "");
            } else {
                setSelectedCamera(deviceId);
            }

            if (SUPPORTED) {
                const detector = new BarcodeDetector({ formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_39"] });
                const scan = async () => {
                    if (!videoRef.current || videoRef.current.readyState < 2) {
                        rafRef.current = requestAnimationFrame(scan);
                        return;
                    }
                    try {
                        const results = await detector.detect(videoRef.current);
                        if (results.length > 0) {
                            stopStream();
                            onScan(results[0].rawValue);
                            onClose();
                            return;
                        }
                    } catch { /* frame not ready */ }
                    rafRef.current = requestAnimationFrame(scan);
                };
                rafRef.current = requestAnimationFrame(scan);
            }
        } catch (e: unknown) {
            const name = (e as { name?: string }).name;
            if (name === "NotAllowedError") {
                setError("Permiso de cámara denegado. Actívalo en la configuración del navegador.");
            } else {
                setError("No se pudo acceder a la cámara.");
            }
        }
    };

    useEffect(() => {
        startCamera();
        return stopStream;
    }, []);

    const handleManual = () => {
        const code = manualCode.trim();
        if (!code) return;
        onScan(code);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-app-bg border border-app-border rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
                    <div className="flex items-center gap-2">
                        <Camera size={18} className="text-app-accent" />
                        <span className="font-bold text-app-text text-sm">Escanear código de barras</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-card text-app-text-muted hover:text-app-text transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Camera view */}
                <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                    {/* Scanning frame overlay */}
                    {!error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-52 h-32">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-app-accent rounded-tl" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-app-accent rounded-tr" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-app-accent rounded-bl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-app-accent rounded-br" />
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-app-accent/60 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6">
                            <CameraOff size={40} className="text-rose-400" />
                            <p className="text-white text-sm text-center">{error}</p>
                            <button onClick={() => startCamera(selectedCamera || undefined)}
                                className="flex items-center gap-2 px-4 py-2 bg-app-accent rounded-xl text-white text-sm font-bold">
                                <RefreshCw size={14} /> Reintentar
                            </button>
                        </div>
                    )}

                    {/* No BarcodeDetector support badge */}
                    {!SUPPORTED && !error && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                            <span className="text-[10px] bg-black/60 text-yellow-300 px-2 py-1 rounded-full">
                                Escaneo automático no disponible en este navegador
                            </span>
                        </div>
                    )}
                </div>

                {/* Camera selector */}
                {cameras.length > 1 && (
                    <div className="px-4 pt-3">
                        <select
                            value={selectedCamera}
                            onChange={e => startCamera(e.target.value)}
                            className="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/40"
                        >
                            {cameras.map(c => (
                                <option key={c.deviceId} value={c.deviceId}>
                                    {c.label || `Cámara ${c.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Manual input fallback */}
                <div className="px-4 py-3 flex flex-col gap-2">
                    <p className="text-[11px] text-app-text-muted text-center">
                        {SUPPORTED ? "Apunta la cámara al código de barras" : "Ingresa el código manualmente"}
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Código manual..."
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleManual()}
                            className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/40 font-mono"
                        />
                        <button onClick={handleManual}
                            className="px-3 py-2 bg-app-accent rounded-xl text-white font-bold text-sm flex items-center gap-1">
                            <ScanLine size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
