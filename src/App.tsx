/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { InspectablePartSpec, StudioConfig } from './types/studio';
import { StudioCanvas, StudioCanvasHandle } from './components/StudioCanvas';
import { ControlDock } from './components/ControlDock';

export default function App() {
  const canvasRef = useRef<StudioCanvasHandle>(null);

  const [config, setConfig] = useState<StudioConfig>(() => {
    const isInitialMobile =
      typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      deviceMode: isInitialMobile ? 'mobile' : 'desktop',
      scenePreset: 'baotu',
      baotuRenderEngine: 'blender-photo-3d',
      finishPreset: 'cycles-photoreal',
      lightingPreset: 'photo-daylight',
      cameraPreset: 'photo-match',
      explodeFactor: 0.0,
      speedMultiplier: 1.0,
      waterWaveIntensity: 1.05,
      lightAzimuthDeg: 135,
      audioEnabled: false,
      autoRotate: false,
      wireframeOverlay: false,
      showReferencePhoto: !isInitialMobile,
    };
  });

  const [selectedPart, setSelectedPart] = useState<InspectablePartSpec | null>(null);
  const [sceneParts, setSceneParts] = useState<InspectablePartSpec[]>([]);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);

  const handleChangeConfig = useCallback((patch: Partial<StudioConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectAndFocusPart = useCallback((part: InspectablePartSpec) => {
    setSelectedPart(part);
    canvasRef.current?.focusOnPart(part);
  }, []);

  const handleCaptureSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.captureSnapshot();
    if (url) {
      setSnapshotDataUrl(url);
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    canvasRef.current?.resetCamera();
  }, []);

  // Keyboard shortcuts: H to collapse/expand HUD, 1/2/3/4 to switch Jinan scenes, Space to pause/play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === '1') {
        handleChangeConfig({
          scenePreset: 'baotu',
          explodeFactor: 0,
          cameraPreset: 'photo-match',
        });
      } else if (e.key === '2') {
        handleChangeConfig({
          scenePreset: 'daming',
          explodeFactor: 0,
          cameraPreset: 'panorama',
        });
      } else if (e.key === '3') {
        handleChangeConfig({
          scenePreset: 'qianfo',
          explodeFactor: 0,
          cameraPreset: 'panorama',
        });
      } else if (e.key === '4') {
        handleChangeConfig({
          scenePreset: 'lingyan',
          explodeFactor: 0,
          cameraPreset: 'panorama',
        });
      } else if (e.code === 'Space') {
        e.preventDefault();
        setConfig((prev) => ({
          ...prev,
          speedMultiplier: prev.speedMultiplier === 0 ? 1.0 : 0,
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleChangeConfig]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#c8dff0] select-none">
      {/* Isolated Full-Bleed WebGL Viewport Container */}
      <StudioCanvas
        ref={canvasRef}
        config={config}
        selectedPart={selectedPart}
        onSelectPart={setSelectedPart}
        onPartsListChange={setSceneParts}
      />

      {/* Ergonomic Bottom Control Dock, Reference Photo Compare & Top Multi-Aspect Landmark Inspector */}
      <ControlDock
        config={config}
        selectedPart={selectedPart}
        sceneParts={sceneParts}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
        onChangeConfig={handleChangeConfig}
        onSelectAndFocusPart={handleSelectAndFocusPart}
        onCaptureSnapshot={handleCaptureSnapshot}
        onResetCamera={handleResetCamera}
      />

      {/* Studio Snapshot Export Modal */}
      {snapshotDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(6, 11, 18, 0.86)' }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-800 p-5 shadow-2xl"
            style={{ backgroundColor: '#0c1520' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Blender 级 3D 渲染画卷快照
                </h2>
                <p className="text-xs text-slate-400">
                  ACES Filmic 色调映射 · 无损画布直出
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotDataUrl(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="关闭预览"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <img
                src={snapshotDataUrl}
                alt="Jinan 3D Scenic Sanctuary Snapshot"
                className="w-full h-auto max-h-[55vh] object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSnapshotDataUrl(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                返回游览
              </button>
              <a
                href={snapshotDataUrl}
                download={`jinan-blender-3d-${config.scenePreset}-${Date.now()}.png`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 PNG 渲染图</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
