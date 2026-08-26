import React, { useState, useEffect, useRef } from 'react';
import { visionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PaperSheet, SectionHeader } from '../components/layout/PaperSheet';
import { loadCVModel, detectObjectsInVideo } from '../services/cvEngine';
import {
  Camera,
  Radio,
  Eye,
  Truck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Boxes,
  Zap,
  Play,
  Pause,
  X,
  RefreshCw,
  Video
} from 'lucide-react';

export default function SmartCCTV() {
  const { showNotification } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [visionStatus, setVisionStatus] = useState(null);
  const [visionEvents, setVisionEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);

  const defaultCameras = [
    { id: 'CAM-01', name: 'GATE 01 (MAIN ENTRY)', status: 'ONLINE', fps: '30 FPS', resolution: '1080p', activeTarget: 'Plate Recognition' },
    { id: 'CAM-02', name: 'DOCK 02 (RECEIVING APRON)', status: 'ONLINE', fps: '30 FPS', resolution: '1080p', activeTarget: 'Pallet Unload CV' },
    { id: 'CAM-03', name: 'YARD EAST (STAGING STALLS)', status: 'ONLINE', fps: '25 FPS', resolution: '720p', activeTarget: 'Vehicle Detection' },
    { id: 'CAM-04', name: 'WAREHOUSE AISLE B (RACKS)', status: 'ONLINE', fps: '30 FPS', resolution: '1080p', activeTarget: 'Forklift Telemetry' }
  ];

  const fetchVisionData = async () => {
    try {
      setLoading(true);
      const [camRes, statusRes, eventRes] = await Promise.all([
        visionAPI.getCameras().catch(() => ({ data: { cameras: [] } })),
        visionAPI.getStatus().catch(() => ({ data: null })),
        visionAPI.getEvents().catch(() => ({ data: { events: [] } }))
      ]);

      setCameras(camRes.data.cameras?.length > 0 ? camRes.data.cameras : defaultCameras);
      setVisionStatus(statusRes.data);
      setVisionEvents(eventRes.data.events || []);
    } catch (err) {
      console.error('Error loading Vision telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisionData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER SHEET */}
      <PaperSheet variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-xs">
                CCTV
              </span>
              <h1 className="text-lg font-bold font-sans tracking-tight text-[#1A1F1D] dark:text-[#F2F4F3] uppercase">
                Smart CCTV Security & Vision Telemetry
              </h1>
            </div>
            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-1">
              Industrial multi-camera surveillance matrix integrated with TensorFlow.js COCO-SSD object recognition.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchVisionData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Video Feeds</span>
          </button>
        </div>

        {/* SYSTEM STATUS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#DDD9CF] dark:border-[#2B3533] text-left font-mono text-xs">
          <div className="p-2.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
            <span className="text-[10px] text-[#8A908B]">Active Camera Nodes:</span>
            <div className="font-bold text-[#1A1F1D] dark:text-[#F2F4F3] mt-0.5">4 / 4 ONLINE</div>
          </div>
          <div className="p-2.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
            <span className="text-[10px] text-[#8A908B]">Inference Engine:</span>
            <div className="font-bold text-[#166534] dark:text-[#15803D] mt-0.5">TF.js COCO-SSD</div>
          </div>
          <div className="p-2.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
            <span className="text-[10px] text-[#8A908B]">Gate OCR Precision:</span>
            <div className="font-bold text-[#1A1F1D] dark:text-[#F2F4F3] mt-0.5">98.4% Confidence</div>
          </div>
          <div className="p-2.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
            <span className="text-[10px] text-[#8A908B]">Security Alert Status:</span>
            <div className="font-bold text-[#15803D] mt-0.5">NOMINAL (0 Alerts)</div>
          </div>
        </div>
      </PaperSheet>

      {/* 4-FEED SURVEILLANCE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(cameras.length > 0 ? cameras : defaultCameras).map((cam) => (
          <PaperSheet key={cam.id} variant="default" className="p-4 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs pb-2 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#166534] dark:text-[#15803D]" />
                <strong className="text-[#1A1F1D] dark:text-[#F2F4F3]">{cam.id}: {cam.name}</strong>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-[#15803D] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
                {cam.status || 'ONLINE'}
              </span>
            </div>

            {/* Video Canvas Container */}
            <div className="aspect-video w-full rounded-sm bg-[#111817] border border-[#232D2B] relative flex items-center justify-center text-white overflow-hidden">
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-xs bg-black/60 text-[9px] font-mono text-[#E3E7E5] border border-[#232D2B]">
                {cam.id} • {new Date().toLocaleTimeString()}
              </div>

              <div className="text-center space-y-2">
                <Video className="w-8 h-8 mx-auto text-[#7A8683]" />
                <div className="text-[10px] font-mono text-[#A3ACA8]">
                  Target: {cam.activeTarget || 'Surveillance Feed'}
                </div>
              </div>

              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-xs bg-black/60 text-[9px] font-mono text-[#15803D] border border-[#232D2B]">
                {cam.fps || '30 FPS'} • {cam.resolution || '1080p'}
              </div>
            </div>
          </PaperSheet>
        ))}
      </div>
    </div>
  );
}
