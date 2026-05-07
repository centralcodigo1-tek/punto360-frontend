import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { X, Camera, CameraOff, RefreshCw } from "lucide-react";

interface Props {
    onScan: (code: string) => void;
    onClose: () => void;
}

export default function BarcodeScannerModal({ onScan, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);
    const [scanning, setScanning] = useState(false);

    const startScanner = async (deviceId?: string) => {
        setError(null);
        setScanning(false);

        if (readerRef.current) {
            BrowserMultiFormatReader.releaseAllStreams();
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        try {
            const devices = await BrowserMultiFormatReader.listVideoInputDevices();
            setCameras(devices);

            // Prefer back camera by default
            const backCam = devices.find(d => /back|rear|environment/i.test(d.label));
            const camId = deviceId ?? backCam?.deviceId ?? devices[0]?.deviceId;
            setSelectedCamera(camId);

            if (!camId && devices.length === 0) {
                setError("No se encontraron cámaras en este dispositivo.");
                return;
            }

            setScanning(true);
            await reader.decodeFromVideoDevice(camId, videoRef.current!, (result, err) => {
                if (result) {
                    BrowserMultiFormatReader.releaseAllStreams();
                    onScan(result.getText());
                    onClose();
                }
                if (err && !(err instanceof NotFoundException)) {
                    // Ignore not-found frames, they're normal during scanning
                }
            });
        } catch (e: any) {
            setScanning(false);
            if (e?.name === "NotAllowedError") {
                setError("Permiso de cámara denegado. Actívalo en la configuración del navegador.");
            } else {
                setError("No se pudo acceder a la cámara. Intenta de nuevo.");
            }
        }
    };

    useEffect(() => {
        startScanner();
        return () => { BrowserMultiFormatReader.releaseAllStreams(); };
    }, []);

    const switchCamera = (deviceId: string) => {
        setSelectedCamera(deviceId);
        startScanner(deviceId);
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

                    {/* Scanning overlay */}
                    {scanning && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-48 h-32">
                                <div className="absolute inset-0 border-2 border-app-accent rounded-lg opacity-80" />
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-app-accent rounded-tl" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-app-accent rounded-tr" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-app-accent rounded-bl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-app-accent rounded-br" />
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-app-accent/70 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6">
                            <CameraOff size={40} className="text-rose-400" />
                            <p className="text-white text-sm text-center">{error}</p>
                            <button onClick={() => startScanner(selectedCamera)} className="flex items-center gap-2 px-4 py-2 bg-app-accent rounded-xl text-white text-sm font-bold">
                                <RefreshCw size={14} /> Reintentar
                            </button>
                        </div>
                    )}
                </div>

                {/* Camera selector & hint */}
                <div className="px-4 py-3 flex flex-col gap-2">
                    {cameras.length > 1 && (
                        <select
                            value={selectedCamera}
                            onChange={e => switchCamera(e.target.value)}
                            className="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/40"
                        >
                            {cameras.map(c => (
                                <option key={c.deviceId} value={c.deviceId}>{c.label || `Cámara ${c.deviceId.slice(0, 6)}`}</option>
                            ))}
                        </select>
                    )}
                    <p className="text-xs text-app-text-muted text-center">Apunta la cámara al código de barras</p>
                </div>
            </div>
        </div>
    );
}
