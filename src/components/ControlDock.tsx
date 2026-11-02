import React, { useState } from 'react';
import {
  BookOpen,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Copy,
  Download,
  Eye,
  Feather,
  Image as ImageIcon,
  Layers,
  MapPin,
  Monitor,
  Palette,
  RotateCcw,
  Sliders,
  Smartphone,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AspectTabId,
  CAMERA_PRESETS,
  CameraPresetId,
  FINISH_PALETTES,
  FinishPresetId,
  InspectablePartSpec,
  LIGHTING_CONFIGS,
  LightingPresetId,
  SCENE_METADATA,
  ScenePresetId,
  StudioConfig,
} from '../types/studio';
import { generateBlenderPythonScript } from '../three/blenderPhotoStage';
import { soundEngine } from '../utils/audioSynth';

interface ControlDockProps {
  config: StudioConfig;
  selectedPart: InspectablePartSpec | null;
  sceneParts: InspectablePartSpec[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onChangeConfig: (patch: Partial<StudioConfig>) => void;
  onSelectAndFocusPart: (part: InspectablePartSpec) => void;
  onCaptureSnapshot: () => void;
  onResetCamera: () => void;
}

type DockTab = 'scenes' | 'landmarks' | 'atmosphere' | 'camera';

const ASPECT_TABS: { id: AspectTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'architecture', label: '建筑形制', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'history', label: '历史渊源', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'poetry', label: '诗词艺文', icon: <Feather className="w-3.5 h-3.5" /> },
  { id: 'guide', label: '游览看点', icon: <MapPin className="w-3.5 h-3.5" /> },
];

export const ControlDock: React.FC<ControlDockProps> = ({
  config,
  selectedPart,
  sceneParts,
  isCollapsed,
  onToggleCollapse,
  onChangeConfig,
  onSelectAndFocusPart,
  onCaptureSnapshot,
  onResetCamera,
}) => {
  const [activeDockTab, setActiveDockTab] = useState<DockTab>('landmarks');
  const [activeAspect, setActiveAspect] = useState<AspectTabId>('architecture');
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(
    () => config.deviceMode === 'mobile'
  );
  const [showBlenderScriptModal, setShowBlenderScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const currentSceneMeta = SCENE_METADATA[config.scenePreset];

  const handleDockTabSwitch = (tab: DockTab) => {
    soundEngine.playMechanicalClick(1.1);
    setActiveDockTab(tab);
  };

  const handleCopyBlenderScript = () => {
    navigator.clipboard.writeText(generateBlenderPythonScript());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadBlenderScript = () => {
    const blob = new Blob([generateBlenderPythonScript()], {
      type: 'text/x-python;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baotu_spring_blender_cycles.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isMobile = config.deviceMode === 'mobile';

  return (
    <>
      {isMobile ? (
        /* =====================================================================
         * MOBILE MODE HEADER (手机端专属紧凑顶部栏：左上角手机/电脑切换 + 横向滑条)
         * ===================================================================== */
        <header className="fixed top-2.5 left-2.5 right-2.5 z-10 pointer-events-none flex flex-col gap-1.5">
          {/* Row 1: Top-Left Device Switcher + Scene Title + Inspector Toggle & Snapshot */}
          <div
            className="pointer-events-auto flex items-center justify-between gap-1.5 rounded-xl border border-slate-700/90 px-2 py-1.5 shadow-xl"
            style={{ backgroundColor: 'rgba(11, 18, 28, 0.94)' }}
          >
            {/* Top-Left Mobile / Desktop Switcher Button */}
            <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.0);
                  onChangeConfig({ deviceMode: 'mobile', showReferencePhoto: false });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-500 text-slate-950 whitespace-nowrap"
                title="当前为手机端视图"
              >
                <Smartphone className="w-3 h-3" />
                <span>手机</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.1);
                  onChangeConfig({ deviceMode: 'desktop', showReferencePhoto: true });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white whitespace-nowrap"
                title="切换到电脑端宽屏视图"
              >
                <Monitor className="w-3 h-3" />
                <span>电脑</span>
              </button>
            </div>

            {/* Compact Scene Title */}
            <div className="min-w-0 flex-1 px-1 text-center">
              <div className="text-xs font-bold text-white truncate">
                {currentSceneMeta.titleZh.split(' ')[0]}
              </div>
            </div>

            {/* Right Quick Buttons: Toggle Landmark Details + Snapshot */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsInspectorMinimized((prev) => !prev)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap ${
                  !isInspectorMinimized
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {isInspectorMinimized ? '景点解说 ▾' : '收起解说 ▴'}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playChime(783.99, 0.22);
                  onCaptureSnapshot();
                }}
                className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                aria-label="导出渲染图"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Horizontally Scrollable Blender Render Mode & Quick Tools Strip */}
          <div
            className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-700/90 px-2 py-1.5 shadow-lg"
            style={{ backgroundColor: 'rgba(11, 18, 28, 0.90)' }}
          >
            <button
              type="button"
              onClick={() => {
                soundEngine.playMechanicalClick(1.05);
                onChangeConfig({
                  scenePreset: 'baotu',
                  baotuRenderEngine: 'blender-photo-3d',
                  finishPreset: 'cycles-photoreal',
                  cameraPreset: 'photo-match',
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                config.scenePreset === 'baotu' &&
                config.baotuRenderEngine === 'blender-photo-3d' &&
                config.finishPreset === 'cycles-photoreal'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              Cycles 实景重渲染
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playMechanicalClick(1.1);
                onChangeConfig({
                  scenePreset: 'baotu',
                  baotuRenderEngine: 'blender-photo-3d',
                  finishPreset: 'clay-monolith',
                  cameraPreset: 'photo-match',
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                config.scenePreset === 'baotu' &&
                config.baotuRenderEngine === 'blender-photo-3d' &&
                config.finishPreset === 'clay-monolith'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              Blender 白模泥塑
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playMechanicalClick(1.15);
                onChangeConfig({
                  scenePreset: 'baotu',
                  baotuRenderEngine: 'full-mesh-3d',
                  cameraPreset: 'photo-match',
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                config.scenePreset === 'baotu' &&
                config.baotuRenderEngine === 'full-mesh-3d'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              360° 三维网格
            </button>

            <button
              type="button"
              onClick={() =>
                onChangeConfig({ showReferencePhoto: !config.showReferencePhoto })
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                config.showReferencePhoto
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{config.showReferencePhoto ? '收起原图' : '原图对比'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBlenderScriptModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 text-amber-300 whitespace-nowrap shrink-0"
            >
              <Code2 className="w-3 h-3" />
              <span>.py 脚本</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !config.audioEnabled;
                soundEngine.setEnabled(next);
                onChangeConfig({ audioEnabled: next });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                config.audioEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/90 text-slate-300'
              }`}
            >
              {config.audioEnabled ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
              <span>{config.audioEnabled ? '古琴开' : '静音'}</span>
            </button>
          </div>

          {/* Compact Mobile Reference Photo Floating Thumbnail (when toggled on) */}
          {config.showReferencePhoto && (
            <div
              className="pointer-events-auto self-end rounded-xl border border-slate-700 p-1.5 shadow-xl w-44"
              style={{ backgroundColor: 'rgba(11, 18, 28, 0.94)' }}
            >
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] font-semibold text-amber-300">实景参考原图</span>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ showReferencePhoto: false })}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  关闭 ✕
                </button>
              </div>
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/image_b3dce47f.png`}
                alt="趵突泉实景参考原图"
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-lg object-cover"
              />
            </div>
          )}

          {/* Collapsible Mobile Landmark 4-Aspect Card */}
          {!isInspectorMinimized && selectedPart && (
            <div
              className="pointer-events-auto rounded-xl border border-slate-700/90 p-2.5 shadow-2xl"
              style={{ backgroundColor: 'rgba(11, 18, 28, 0.93)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-amber-300 truncate">
                  {selectedPart.nameZh}
                </h2>
                <span className="text-[10px] text-slate-400 truncate shrink-0">
                  {selectedPart.eraSpec}
                </span>
              </div>

              {/* 4-Aspect Tabs */}
              <div className="mt-1.5 grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                {ASPECT_TABS.map((tab) => {
                  const isActive = activeAspect === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playMechanicalClick(1.15);
                        setActiveAspect(tab.id);
                      }}
                      className={`py-1 px-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-1.5 text-[11px] text-slate-100 leading-relaxed max-h-20 overflow-y-auto bg-slate-900/80 rounded-lg p-2 border border-slate-800">
                {selectedPart.aspects[activeAspect]}
              </p>

              {/* Quick Sub-Landmark Horizontal Selector */}
              <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pt-1">
                {sceneParts.map((part, idx) => {
                  const active = selectedPart.id === part.id;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playPartSelect(idx);
                        onSelectAndFocusPart(part);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {idx + 1}.{part.nameZh.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </header>
      ) : (
        /* =====================================================================
         * DESKTOP MODE HEADER (电脑端宽屏双栏工作台：左上角手机/电脑切换 + 详情卡 + 右侧工具栏)
         * ===================================================================== */
        <header className="fixed top-4 left-4 right-4 z-10 pointer-events-none flex items-start justify-between gap-4">
          {/* Multi-Aspect Landmark Cultural & Architectural Inspector Card */}
          <div
            className="pointer-events-auto rounded-2xl border border-slate-700/90 p-4 shadow-2xl w-full max-w-md transition-all duration-200"
            style={{ backgroundColor: 'rgba(11, 18, 28, 0.93)' }}
          >
            {/* Top-Left Device Switcher Bar inside Desktop Card */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMechanicalClick(1.0);
                    onChangeConfig({ deviceMode: 'mobile', showReferencePhoto: false });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                  title="切换到手机竖屏紧凑视图"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>手机版</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMechanicalClick(1.1);
                    onChangeConfig({ deviceMode: 'desktop', showReferencePhoto: true });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 transition-colors whitespace-nowrap"
                  title="当前为电脑宽屏视图"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>电脑版</span>
                </button>
              </div>

              <span className="text-[11px] text-amber-400 font-medium truncate">
                点击 3D 景物检视四维详情
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {currentSceneMeta.titleZh}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setIsInspectorMinimized((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/90 text-xs text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {isInspectorMinimized ? '展开详情 ▾' : '收起卡片 ▴'}
              </button>
            </div>

            <p className="mt-1 text-xs text-amber-200/85 italic">
              “{currentSceneMeta.poeticTagline}”
            </p>

            {!isInspectorMinimized && selectedPart && (
              <div className="mt-3 pt-3 border-t border-slate-700/80">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-amber-300 truncate">
                    {selectedPart.nameZh}
                  </h2>
                  <span className="text-[11px] text-slate-300 font-mono whitespace-nowrap shrink-0">
                    {selectedPart.role.split(' ')[0]}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {selectedPart.eraSpec}
                </p>

                {/* 4-Aspect Switcher Tabs */}
                <div className="mt-2.5 grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900/95 border border-slate-800">
                  {ASPECT_TABS.map((tab) => {
                    const isActive = activeAspect === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playMechanicalClick(1.15);
                          setActiveAspect(tab.id);
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Aspect Content Prose */}
                <div className="mt-2.5 min-h-[68px] rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <p className="text-xs text-slate-100 leading-relaxed">
                    {selectedPart.aspects[activeAspect]}
                  </p>
                </div>

                {/* 3 Tabular Key Metrics */}
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {selectedPart.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg bg-slate-900/75 border border-slate-800 px-2.5 py-1.5"
                    >
                      <div className="text-[10px] text-slate-400 truncate">{m.label}</div>
                      <div className="mt-0.5 text-xs font-semibold text-white font-mono truncate">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Sub-Landmark Numbered Selector Strip */}
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-1 overflow-x-auto">
                  <span className="text-[11px] text-slate-400 mr-1 whitespace-nowrap shrink-0">
                    景点直达：
                  </span>
                  {sceneParts.map((part, idx) => {
                    const active = selectedPart.id === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playPartSelect(idx);
                          onSelectAndFocusPart(part);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={part.nameZh}
                      >
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top-Right Quick Actions, Blender Render Engine Switcher & Reference Photo PiP */}
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            {/* Blender 4.2 Cycles Render Pass & Engine Switcher Bar */}
            <div
              className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-slate-700/90 p-1.5 shadow-xl"
              style={{ backgroundColor: 'rgba(11, 18, 28, 0.94)' }}
            >
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.05);
                  onChangeConfig({
                    scenePreset: 'baotu',
                    baotuRenderEngine: 'blender-photo-3d',
                    finishPreset: 'cycles-photoreal',
                    cameraPreset: 'photo-match',
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  config.scenePreset === 'baotu' &&
                  config.baotuRenderEngine === 'blender-photo-3d' &&
                  config.finishPreset === 'cycles-photoreal'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Cycles 实景重渲染
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.1);
                  onChangeConfig({
                    scenePreset: 'baotu',
                    baotuRenderEngine: 'blender-photo-3d',
                    finishPreset: 'clay-monolith',
                    cameraPreset: 'photo-match',
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  config.scenePreset === 'baotu' &&
                  config.baotuRenderEngine === 'blender-photo-3d' &&
                  config.finishPreset === 'clay-monolith'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Blender 白模泥塑
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.15);
                  onChangeConfig({
                    scenePreset: 'baotu',
                    baotuRenderEngine: 'full-mesh-3d',
                    cameraPreset: 'photo-match',
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  config.scenePreset === 'baotu' &&
                  config.baotuRenderEngine === 'full-mesh-3d'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                360° 独立三维网格
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.0);
                  setShowBlenderScriptModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30 transition-colors whitespace-nowrap shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Blender .py 脚本</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playMechanicalClick(1.0);
                  onChangeConfig({
                    showReferencePhoto: !config.showReferencePhoto,
                  });
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  config.showReferencePhoto
                    ? 'bg-slate-800 text-white border border-slate-600'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{config.showReferencePhoto ? '收起原图' : '原图对比'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !config.audioEnabled;
                  soundEngine.setEnabled(next);
                  onChangeConfig({ audioEnabled: next });
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  config.audioEnabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {config.audioEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playChime(783.99, 0.22);
                  onCaptureSnapshot();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>导出渲染图</span>
              </button>
            </div>

            {/* Reference Photo Picture-in-Picture Comparison Card */}
            {config.showReferencePhoto && (
              <div
                className="pointer-events-auto rounded-2xl border border-slate-700/90 p-2.5 shadow-2xl w-72 sm:w-80"
                style={{ backgroundColor: 'rgba(11, 18, 28, 0.94)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
                  <span className="text-xs font-semibold text-amber-300">
                    上传原图 vs Blender 实时渲染
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        scenePreset: 'baotu',
                        baotuRenderEngine: 'blender-photo-3d',
                        cameraPreset: 'photo-match',
                        finishPreset: 'cycles-photoreal',
                        lightingPreset: 'photo-daylight',
                      })
                    }
                    className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200 underline whitespace-nowrap shrink-0"
                  >
                    重置 1:1 渲染视角 ↗
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/aistudio/image_b3dce47f.png`}
                    alt="趵突泉实景参考照片"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover"
                  />
                </div>
                <p className="mt-1.5 px-1 text-[11px] text-slate-300 leading-snug">
                  已从该原图提取 57,600 顶点 3D 深度浮雕、Sobel 法线贴图、AO 环境光遮蔽与三股水流体遮罩，支持实时白模、青绿、鎏金与昼夜全局光重渲染。
                </p>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className="fixed z-10 pointer-events-none transition-transform duration-300 ease-out"
        style={{
          bottom: isMobile ? '10px' : '16px',
          left: '50%',
          width: isMobile ? '96vw' : 'min(940px, 95vw)',
          transform: isCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playMechanicalClick(0.9);
              onToggleCollapse();
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-700/90 text-xs font-medium text-slate-200 hover:text-white hover:border-amber-500/50 shadow-lg transition-colors whitespace-nowrap shrink-0"
            style={{ backgroundColor: 'rgba(11, 18, 28, 0.95)' }}
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMobile ? '展开底部操控面板' : '展开 Blender 场景与景点操控台 (H)'}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMobile ? '收起面板 · 纯享全景' : '收起操控台 · 纯享全景 (H)'}</span>
              </>
            )}
          </button>
        </div>

        <section
          aria-label="Jinan 3D Scenic Sanctuary Controls"
          className={`pointer-events-auto rounded-2xl border border-slate-700/95 shadow-2xl ${
            isMobile ? 'p-2.5' : 'p-3.5'
          }`}
          style={{ backgroundColor: 'rgba(11, 18, 28, 0.94)' }}
        >
          {/* Top Row: Navigation Tabs + Spatial Cutaway / Explode Slider */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 border border-slate-800 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => handleDockTabSwitch('landmarks')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeDockTab === 'landmarks'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isMobile ? `景点 (${sceneParts.length})` : `当前景点要素 (${sceneParts.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDockTabSwitch('scenes')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeDockTab === 'scenes'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isMobile ? '四大名胜' : '济南四大名胜切换'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDockTabSwitch('atmosphere')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeDockTab === 'atmosphere'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{isMobile ? '材质天光' : 'Blender 渲染材质与光效'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDockTabSwitch('camera')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeDockTab === 'camera'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{isMobile ? '镜头水脉' : '镜头机位与水脉'}</span>
              </button>
            </div>

            {/* Spatial Structural Cutaway / Explode Slider (Desktop only to keep Mobile compact) */}
            {!isMobile && (
              <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-xs ml-auto">
                <label
                  htmlFor="explode-slider"
                  className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                >
                  空间分层剖视
                </label>
                <input
                  id="explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.explodeFactor}
                  onChange={(e) =>
                    onChangeConfig({ explodeFactor: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="font-mono text-xs text-amber-400 w-10 text-right shrink-0">
                  {Math.round(config.explodeFactor * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Bottom Row: Dynamic Tab Content */}
          <div className="pt-2.5">
            {activeDockTab === 'landmarks' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-28 overflow-y-auto pr-1">
                {sceneParts.map((part, idx) => {
                  const isSelected = selectedPart?.id === part.id;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playPartSelect(idx);
                        onSelectAndFocusPart(part);
                      }}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-slate-900/75 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">
                        {part.nameZh}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 shrink-0">
                        ↗
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeDockTab === 'scenes' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(SCENE_METADATA) as ScenePresetId[]).map((id, idx) => {
                  const meta = SCENE_METADATA[id];
                  const isSelected = config.scenePreset === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        soundEngine.playChime(523.25 + idx * 65, 0.25);
                        onChangeConfig({
                          scenePreset: id,
                          explodeFactor: 0,
                          cameraPreset: id === 'baotu' ? 'photo-match' : 'panorama',
                        });
                      }}
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/70 text-white'
                          : 'bg-slate-900/70 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold tracking-tight truncate">
                          {meta.titleZh}
                        </span>
                        <span className="font-mono text-[10px] text-amber-400 shrink-0">
                          [{idx + 1}]
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                        {meta.poeticTagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeDockTab === 'atmosphere' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    渲染模式：
                  </span>
                  {(Object.keys(FINISH_PALETTES) as FinishPresetId[]).map((fid) => {
                    const pal = FINISH_PALETTES[fid];
                    const active = config.finishPreset === fid;
                    return (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => {
                          soundEngine.playMechanicalClick(1.2);
                          onChangeConfig({ finishPreset: fid });
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${pal.swatchHex} 50%, ${pal.secondaryHex} 50%)`,
                          }}
                        />
                        <span>{pal.nameZh}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {(Object.keys(LIGHTING_CONFIGS) as LightingPresetId[]).map((lid) => {
                    const lCfg = LIGHTING_CONFIGS[lid];
                    const active = config.lightingPreset === lid;
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => {
                          soundEngine.playMechanicalClick(0.95);
                          onChangeConfig({ lightingPreset: lid });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {lCfg.nameZh}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeDockTab === 'camera' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((cid) => {
                    const cSpec = CAMERA_PRESETS[cid];
                    const active = config.cameraPreset === cid;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => {
                          soundEngine.playMechanicalClick(1.05);
                          onChangeConfig({ cameraPreset: cid });
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {cSpec.nameZh}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 w-32">
                    <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      水花
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={2.0}
                      step={0.1}
                      value={config.waterWaveIntensity}
                      onChange={(e) =>
                        onChangeConfig({ waterWaveIntensity: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playMechanicalClick(1.1);
                      onChangeConfig({ autoRotate: !config.autoRotate });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      config.autoRotate
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {config.autoRotate ? '环绕：开' : '环绕：关'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playMechanicalClick(1.25);
                      onChangeConfig({ wireframeOverlay: !config.wireframeOverlay });
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      config.wireframeOverlay
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>网格线框</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playMechanicalClick(0.85);
                      onChangeConfig({ explodeFactor: 0, cameraPreset: 'photo-match' });
                      onResetCamera();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>照片机位归位</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Runnable Blender 4.2 Python Script (.py) Exporter Modal */}
      {showBlenderScriptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(6, 11, 18, 0.88)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 p-5 shadow-2xl"
            style={{ backgroundColor: '#0c1520' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Blender 4.2+ Cycles 趵突泉三维重建脚本 (baotu_spring_blender_cycles.py)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  可在桌面端 Blender 的 Scripting 工作区一键运行，自动生成 Cycles 渲染器、Nishita 天空、三股水与古建场景
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlenderScriptModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-[52vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
                {generateBlenderPythonScript()}
              </pre>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                提示：当前网页视口已内置实时 GPU Cycles 深度重渲染引擎，无需安装外部软件即可交互游览。
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyBlenderScript}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:text-white transition-colors"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">已复制脚本</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制 Python 代码</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBlenderScript}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 .py 脚本文件</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
