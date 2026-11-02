import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  CAMERA_PRESETS,
  FINISH_PALETTES,
  FinishPresetId,
  InspectablePartSpec,
  LIGHTING_CONFIGS,
  LightingPresetId,
  PHOTO_STAGE_CAMERA_PRESETS,
  StudioConfig,
} from '../types/studio';
import {
  createArchitecturalTileMap,
  createFlagstonePavingTexture,
  createRadialContactShadowTexture,
  createSpringWaterTexture,
} from '../three/proceduralTextures';
import {
  applyPaletteToMaterials,
  buildCreationScene,
  BuiltCreationScene,
  createStudioMaterials,
  MaterialBundle,
} from '../three/proceduralModels';
import { buildBlenderPhotoReconstructedStage } from '../three/blenderPhotoStage';
import { soundEngine } from '../utils/audioSynth';

const FINISH_SHADER_INDEX: Record<FinishPresetId, number> = {
  'cycles-photoreal': 0,
  'clay-monolith': 1,
  'song-mineral': 2,
  'imperial-jade': 3,
};

const LIGHTING_SHADER_INDEX: Record<LightingPresetId, number> = {
  'photo-daylight': 0,
  'spring-morning': 1,
  'lishan-sunset': 2,
  'minghu-moonlight': 3,
};

export interface StudioCanvasHandle {
  captureSnapshot: () => string | null;
  resetCamera: () => void;
  focusOnPart: (part: InspectablePartSpec) => void;
}

interface StudioCanvasProps {
  config: StudioConfig;
  selectedPart: InspectablePartSpec | null;
  onSelectPart: (part: InspectablePartSpec | null) => void;
  onPartsListChange: (parts: InspectablePartSpec[]) => void;
}

// Pre-allocated module-scope scratch math objects (Zero GC in animation loop)
const _targetPos = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _mouse = new THREE.Vector2();
const _koiDummy = new THREE.Object3D();

export const StudioCanvas = forwardRef<StudioCanvasHandle, StudioCanvasProps>(
  ({ config, selectedPart, onSelectPart, onPartsListChange }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);

    const configRef = useRef<StudioConfig>(config);
    configRef.current = config;

    const selectedPartRef = useRef<InspectablePartSpec | null>(selectedPart);
    selectedPartRef.current = selectedPart;

    const onSelectPartRef = useRef(onSelectPart);
    onSelectPartRef.current = onSelectPart;

    const onPartsListChangeRef = useRef(onPartsListChange);
    onPartsListChangeRef.current = onPartsListChange;

    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const materialsRef = useRef<MaterialBundle | null>(null);
    const activeCreationRef = useRef<BuiltCreationScene | null>(null);
    const highlightRingRef = useRef<THREE.Mesh | null>(null);
    const skyUniformsRef = useRef<{
      topColor: { value: THREE.Color };
      bottomColor: { value: THREE.Color };
    } | null>(null);

    const lightsRef = useRef<{
      keyLight: THREE.DirectionalLight;
      hemiLight: THREE.HemisphereLight;
      rimLight: THREE.DirectionalLight;
    } | null>(null);

    const animStateRef = useRef({
      dampedExplode: config.explodeFactor,
      dampedAzimuthRad: THREE.MathUtils.degToRad(config.lightAzimuthDeg),
      cameraTransitionActive: false,
      simTime: 0,
    });

    const setAdjustedCameraGoal = (
      pos: [number, number, number],
      target: [number, number, number]
    ) => {
      _camGoalTarget.set(...target);
      _camGoalPos.set(...pos);

      const aspect =
        cameraRef.current?.aspect ||
        (window.innerWidth || 1) / Math.max(1, window.innerHeight || 1);
      const isMobile = configRef.current.deviceMode === 'mobile';

      if (isMobile || aspect < 1.15) {
        const pullBack = isMobile
          ? Math.max(1.52, Math.min(2.65, 1.16 / Math.max(0.42, aspect)))
          : Math.max(1.0, Math.min(2.35, 1.12 / Math.max(0.45, aspect)));
        _camGoalPos.sub(_camGoalTarget).multiplyScalar(pullBack).add(_camGoalTarget);
      }

      if (cameraRef.current) {
        const nextFov = isMobile || aspect < 1.0 ? 50 : 38;
        if (cameraRef.current.fov !== nextFov) {
          cameraRef.current.fov = nextFov;
          cameraRef.current.updateProjectionMatrix();
        }
      }
      animStateRef.current.cameraTransitionActive = true;
    };

    // Trigger camera transition when cameraPreset or deviceMode changes
    useEffect(() => {
      const isPhotoStage =
        config.scenePreset === 'baotu' &&
        config.baotuRenderEngine === 'blender-photo-3d';
      const presetMap = isPhotoStage ? PHOTO_STAGE_CAMERA_PRESETS : CAMERA_PRESETS;
      const preset = presetMap[config.cameraPreset];
      if (preset) {
        setAdjustedCameraGoal(preset.position, preset.target);
      }
    }, [config.cameraPreset, config.scenePreset, config.baotuRenderEngine, config.deviceMode]);

    // Update material finishes & wireframe when finishPreset or wireframeOverlay changes
    useEffect(() => {
      if (materialsRef.current) {
        const palette = FINISH_PALETTES[config.finishPreset];
        applyPaletteToMaterials(materialsRef.current, palette, config.wireframeOverlay);
      }
      const pUniforms = activeCreationRef.current?.photoShaderUniforms;
      if (pUniforms) {
        pUniforms.uFinishMode.value = FINISH_SHADER_INDEX[config.finishPreset];
        pUniforms.uWireframePass.value = config.wireframeOverlay ? 1.0 : 0.0;
      }
    }, [config.finishPreset, config.wireframeOverlay]);

    // Update lighting, sky dome & atmospheric fog when lightingPreset changes
    useEffect(() => {
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const lights = lightsRef.current;
      if (!scene || !renderer || !lights) return;

      const lCfg = LIGHTING_CONFIGS[config.lightingPreset];
      scene.background = new THREE.Color(lCfg.bgColor);
      scene.fog = new THREE.FogExp2(lCfg.skyHorizonColor, lCfg.fogDensity);
      renderer.toneMappingExposure = lCfg.exposure;

      if (skyUniformsRef.current) {
        skyUniformsRef.current.topColor.value.setHex(lCfg.skyTopColor);
        skyUniformsRef.current.bottomColor.value.setHex(lCfg.skyHorizonColor);
      }

      lights.keyLight.color.setHex(lCfg.keyColor);
      lights.keyLight.intensity = lCfg.keyIntensity;
      lights.hemiLight.color.setHex(lCfg.hemiSkyColor);
      lights.hemiLight.groundColor.setHex(lCfg.hemiGroundColor);
      lights.hemiLight.intensity = lCfg.hemiIntensity;
      lights.rimLight.color.setHex(lCfg.rimColor);
      lights.rimLight.intensity = lCfg.rimIntensity;

      const pUniforms = activeCreationRef.current?.photoShaderUniforms;
      if (pUniforms) {
        pUniforms.uLightingMode.value = LIGHTING_SHADER_INDEX[config.lightingPreset];
      }
    }, [config.lightingPreset]);

    // Rebuild 3D Jinan scene when scenePreset or baotuRenderEngine changes
    useEffect(() => {
      const scene = sceneRef.current;
      const mats = materialsRef.current;
      const renderer = rendererRef.current;
      if (!scene || !mats || !renderer) return;

      if (activeCreationRef.current) {
        scene.remove(activeCreationRef.current.rootGroup);
        activeCreationRef.current.dispose();
      }

      const isPhotoStage =
        config.scenePreset === 'baotu' &&
        config.baotuRenderEngine === 'blender-photo-3d';

      let built: BuiltCreationScene;
      if (isPhotoStage) {
        const meshRef = buildCreationScene('baotu', mats);
        const rawSpecs = meshRef.parts.map((p) => p.partSpec);
        meshRef.dispose();

        built = buildBlenderPhotoReconstructedStage(
          rawSpecs,
          renderer.capabilities.getMaxAnisotropy(),
          configRef.current.finishPreset,
          configRef.current.lightingPreset,
          configRef.current.wireframeOverlay
        );
      } else {
        built = buildCreationScene(config.scenePreset, mats);
      }

      scene.add(built.rootGroup);
      activeCreationRef.current = built;

      const specs = built.parts.map((p) => p.partSpec);
      onPartsListChangeRef.current(specs);

      if (specs.length > 0) {
        onSelectPartRef.current(specs[0]);
      }

      const targetCam = isPhotoStage
        ? PHOTO_STAGE_CAMERA_PRESETS['photo-match']
        : config.scenePreset === 'baotu'
        ? CAMERA_PRESETS['photo-match']
        : CAMERA_PRESETS.panorama;
      setAdjustedCameraGoal(targetCam.position, targetCam.target);
    }, [config.scenePreset, config.baotuRenderEngine]);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!renderer || !scene || !camera) return null;
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
      resetCamera: () => {
        const cfg = configRef.current;
        const isPhotoStage =
          cfg.scenePreset === 'baotu' && cfg.baotuRenderEngine === 'blender-photo-3d';
        const presetMap = isPhotoStage ? PHOTO_STAGE_CAMERA_PRESETS : CAMERA_PRESETS;
        const preset = presetMap[cfg.cameraPreset];
        setAdjustedCameraGoal(preset.position, preset.target);
      },
      focusOnPart: (part: InspectablePartSpec) => {
        setAdjustedCameraGoal(part.focusCameraPos, part.focusTargetPos);
      },
    }));

    // Main WebGL initialization once on mount
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = (() => {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      })();

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 2. Scene, Nishita Sky Dome & RoomEnvironment Studio IBL Reflections
      const scene = new THREE.Scene();
      const initLightCfg = LIGHTING_CONFIGS[configRef.current.lightingPreset];
      scene.background = new THREE.Color(initLightCfg.bgColor);
      scene.fog = new THREE.FogExp2(initLightCfg.skyHorizonColor, initLightCfg.fogDensity);
      sceneRef.current = scene;

      const skyUniforms = {
        topColor: { value: new THREE.Color(initLightCfg.skyTopColor) },
        bottomColor: { value: new THREE.Color(initLightCfg.skyHorizonColor) },
      };
      skyUniformsRef.current = skyUniforms;

      const skyGeo = new THREE.SphereGeometry(68, 32, 20);
      const skyMat = new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize( vWorldPosition + vec3(0.0, 8.0, 0.0) ).y;
            gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), 0.65 ), 0.0 ) ), 1.0 );
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      scene.add(skyDome);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      // 3. PerspectiveCamera & OrbitControls (FOV 38° matches standard 35mm architectural photography)
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 160);
      const isInitPhotoStage =
        configRef.current.scenePreset === 'baotu' &&
        configRef.current.baotuRenderEngine === 'blender-photo-3d';
      const initCam = isInitPhotoStage
        ? PHOTO_STAGE_CAMERA_PRESETS[configRef.current.cameraPreset]
        : CAMERA_PRESETS[configRef.current.cameraPreset];
      camera.position.set(...initCam.position);
      cameraRef.current = camera;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...initCam.target);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.055;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minDistance = 1.8;
      controls.maxDistance = 26;
      controls.update();
      controlsRef.current = controls;

      const onControlsStart = () => {
        animStateRef.current.cameraTransitionActive = false;
      };
      controls.addEventListener('start', onControlsStart);

      // 4. Balanced 3-Point Studio Sunlight Rig + RectAreaLight Softboxes
      const keyLight = new THREE.DirectionalLight(
        initLightCfg.keyColor,
        initLightCfg.keyIntensity
      );
      keyLight.position.set(-7.5, 11.5, 6.5);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.set(2048, 2048);
      const d = 7.5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 1.0;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const hemiLight = new THREE.HemisphereLight(
        initLightCfg.hemiSkyColor,
        initLightCfg.hemiGroundColor,
        initLightCfg.hemiIntensity
      );
      hemiLight.position.set(0, 18, 0);
      scene.add(hemiLight);

      const rimLight = new THREE.DirectionalLight(
        initLightCfg.rimColor,
        initLightCfg.rimIntensity
      );
      rimLight.position.set(7.5, 6.5, -7.0);
      scene.add(rimLight);

      lightsRef.current = { keyLight, hemiLight, rimLight };

      if (!isSoftwareGl) {
        RectAreaLightUniformsLib.init();
        const softbox1 = new THREE.RectAreaLight(0xfff7ed, 2.5, 6, 3.5);
        softbox1.position.set(-5.5, 7.0, 4.5);
        softbox1.lookAt(0, 1.0, 0);
        scene.add(softbox1);

        const softbox2 = new THREE.RectAreaLight(0xe0f2fe, 1.8, 5, 3);
        softbox2.position.set(6.0, 5.0, -4.5);
        softbox2.lookAt(0, 1.0, 0);
        scene.add(softbox2);
      }

      // 5. Procedural Textures & Grounding Contact Shadow Plane
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const waterTex = createSpringWaterTexture(maxAniso);
      const tileBumpTex = createArchitecturalTileMap(maxAniso);
      const flagstoneTex = createFlagstonePavingTexture(maxAniso);
      const shadowTex = createRadialContactShadowTexture();

      const studioFloorGeo = new THREE.CircleGeometry(42, 64);
      studioFloorGeo.rotateX(-Math.PI / 2);
      const studioFloorMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.88,
        metalness: 0.06,
      });
      const studioFloor = new THREE.Mesh(studioFloorGeo, studioFloorMat);
      studioFloor.position.y = -0.02;
      studioFloor.receiveShadow = true;
      scene.add(studioFloor);

      const contactPlaneGeo = new THREE.PlaneGeometry(15.5, 15.5);
      contactPlaneGeo.rotateX(-Math.PI / 2);
      const contactPlaneMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const contactPlane = new THREE.Mesh(contactPlaneGeo, contactPlaneMat);
      contactPlane.position.y = 0.005;
      scene.add(contactPlane);

      // Golden Selection Highlight Beacon Ring for the currently inspected landmark
      const ringGeo = new THREE.RingGeometry(0.75, 0.9, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const highlightRing = new THREE.Mesh(ringGeo, ringMat);
      highlightRing.position.set(0, 0.4, 0);
      scene.add(highlightRing);
      highlightRingRef.current = highlightRing;

      // 6. Initialize PBR Materials & Build Initial Jinan 3D Scene
      const initPalette = FINISH_PALETTES[configRef.current.finishPreset];
      const mats = createStudioMaterials(
        initPalette,
        waterTex,
        tileBumpTex,
        flagstoneTex,
        maxAniso,
        isSoftwareGl
      );
      materialsRef.current = mats;

      let built: BuiltCreationScene;
      if (
        configRef.current.scenePreset === 'baotu' &&
        configRef.current.baotuRenderEngine === 'blender-photo-3d'
      ) {
        const meshRef = buildCreationScene('baotu', mats);
        const rawSpecs = meshRef.parts.map((p) => p.partSpec);
        meshRef.dispose();

        built = buildBlenderPhotoReconstructedStage(
          rawSpecs,
          maxAniso,
          configRef.current.finishPreset,
          configRef.current.lightingPreset,
          configRef.current.wireframeOverlay
        );
      } else {
        built = buildCreationScene(configRef.current.scenePreset, mats);
      }
      scene.add(built.rootGroup);
      activeCreationRef.current = built;

      const specs = built.parts.map((p) => p.partSpec);
      onPartsListChangeRef.current(specs);
      if (specs.length > 0) {
        onSelectPartRef.current(specs[0]);
      }

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // 7. Layer 1 Raycasting: Click any 3D Landmark to Focus Camera & Inspect All Aspects
      const raycaster = new THREE.Raycaster();
      raycaster.layers.set(1);
      let pointerDownPos = { x: 0, y: 0 };
      let lastHoverTime = 0;

      const handlePointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        if (dx * dx + dy * dy > 36) return;

        const rect = renderer.domElement.getBoundingClientRect();
        _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(_mouse, camera);
        const creation = activeCreationRef.current;
        if (!creation) return;

        const hits = raycaster.intersectObjects(creation.rootGroup.children, true);
        if (hits.length > 0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData.partSpec) {
            obj = obj.parent;
          }
          if (obj && obj.userData.partSpec) {
            const spec = obj.userData.partSpec as InspectablePartSpec;
            onSelectPartRef.current(spec);
            soundEngine.playPartSelect(spec.id.length);

            setAdjustedCameraGoal(spec.focusCameraPos, spec.focusTargetPos);
          }
        }
      };

      const handlePointerMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastHoverTime < 65) return;
        lastHoverTime = now;

        const rect = renderer.domElement.getBoundingClientRect();
        _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(_mouse, camera);
        const creation = activeCreationRef.current;
        if (!creation) return;

        const hits = raycaster.intersectObjects(creation.rootGroup.children, true);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      };

      const domElem = renderer.domElement;
      domElem.addEventListener('pointerdown', handlePointerDown);
      domElem.addEventListener('pointerup', handlePointerUp);
      domElem.addEventListener('pointermove', handlePointerMove);

      // 8. Responsive Window Resize
      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // 9. Animation Loop with Software-WebGL Fence Sync Pacing (afterDraw)
      const clock = new THREE.Clock();
      let frameId = 0;
      let isDisposed = false;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || !gl.fenceSync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function tick() {
        if (isDisposed) return;
        const rawDelta = clock.getDelta();
        const dt = Math.min(rawDelta, 0.1);
        const cfg = configRef.current;
        const st = animStateRef.current;

        st.simTime += dt * cfg.speedMultiplier;
        mats.shaderUniforms.uTime.value = st.simTime;
        mats.shaderUniforms.uWaveAmp.value = cfg.waterWaveIntensity;

        st.dampedExplode = THREE.MathUtils.damp(
          st.dampedExplode,
          cfg.explodeFactor,
          6.5,
          dt
        );
        st.dampedAzimuthRad = THREE.MathUtils.damp(
          st.dampedAzimuthRad,
          THREE.MathUtils.degToRad(cfg.lightAzimuthDeg),
          5.5,
          dt
        );

        const lightRadius = 11.0;
        keyLight.position.x = Math.cos(st.dampedAzimuthRad) * lightRadius;
        keyLight.position.z = Math.sin(st.dampedAzimuthRad) * lightRadius;

        const creation = activeCreationRef.current;
        const activeSpec = selectedPartRef.current;
        if (creation) {
          const isPhotoStage = Boolean(creation.photoShaderUniforms);
          if (highlightRingRef.current) {
            highlightRingRef.current.visible = !isPhotoStage;
          }

          if (creation.photoShaderUniforms) {
            creation.photoShaderUniforms.uTime.value = st.simTime;
            creation.photoShaderUniforms.uWaveAmp.value = cfg.waterWaveIntensity;
            creation.photoShaderUniforms.uSunAzimuth.value = st.dampedAzimuthRad;
            creation.photoShaderUniforms.uExplode.value = st.dampedExplode;
          }

          for (let i = 0; i < creation.parts.length; i++) {
            const p = creation.parts[i];
            _targetPos
              .copy(p.basePos)
              .addScaledVector(p.explodeVec, st.dampedExplode);

            if (p.bobAmp && p.bobFreq) {
              _targetPos.y += Math.sin(st.simTime * p.bobFreq) * p.bobAmp;
            }
            p.object.position.copy(_targetPos);

            if (p.spinAxis && p.spinSpeed) {
              p.object.rotation[p.spinAxis] = st.simTime * p.spinSpeed;
            }

            if (
              !isPhotoStage &&
              activeSpec &&
              p.partSpec.id === activeSpec.id &&
              highlightRingRef.current
            ) {
              highlightRingRef.current.position.set(
                _targetPos.x,
                Math.max(0.26, _targetPos.y + 0.04),
                _targetPos.z
              );
              const scalePulse = 1 + Math.sin(st.simTime * 3.0) * 0.06;
              highlightRingRef.current.scale.setScalar(scalePulse);
            }
          }

          // Animate the 85 Swimming Koi Fish in Baotu Spring Pool
          if (creation.koiMesh && creation.koiData) {
            const kMesh = creation.koiMesh;
            const kData = creation.koiData;
            for (let k = 0; k < kData.length; k++) {
              const d = kData[k];
              const angle = st.simTime * d.speed + d.phase;
              const nx = Math.max(-2.05, Math.min(2.05, d.baseX + Math.cos(angle) * d.orbitRadius));
              const nz = Math.max(-1.65, Math.min(1.65, d.baseZ + Math.sin(angle) * d.orbitRadius));
              const heading = Math.atan2(-Math.cos(angle), Math.sin(angle)) + Math.sin(st.simTime * 8.0 + d.phase) * 0.08;

              _koiDummy.position.set(nx, d.depthY, nz);
              _koiDummy.rotation.set(0, heading, 0);
              _koiDummy.scale.setScalar(d.scale);
              _koiDummy.updateMatrix();
              kMesh.setMatrixAt(k, _koiDummy.matrix);
            }
            kMesh.instanceMatrix.needsUpdate = true;
          }
        }

        if (st.cameraTransitionActive) {
          const dampAlpha = 1 - Math.exp(-5.0 * dt);
          camera.position.lerp(_camGoalPos, dampAlpha);
          controls.target.lerp(_camGoalTarget, dampAlpha);
          if (
            camera.position.distanceToSquared(_camGoalPos) < 0.003 &&
            controls.target.distanceToSquared(_camGoalTarget) < 0.003
          ) {
            st.cameraTransitionActive = false;
          }
        }

        controls.autoRotate = !isSoftwareGl && cfg.autoRotate && !st.cameraTransitionActive;
        controls.autoRotateSpeed = 0.75;
        controls.update();

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      tick();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        window.removeEventListener('resize', handleResize);
        controls.removeEventListener('start', onControlsStart);
        domElem.removeEventListener('pointerdown', handlePointerDown);
        domElem.removeEventListener('pointerup', handlePointerUp);
        domElem.removeEventListener('pointermove', handlePointerMove);

        if (activeCreationRef.current) {
          activeCreationRef.current.dispose();
        }
        skyGeo.dispose();
        skyMat.dispose();
        studioFloorGeo.dispose();
        studioFloorMat.dispose();
        contactPlaneGeo.dispose();
        contactPlaneMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        waterTex.dispose();
        tileBumpTex.dispose();
        flagstoneTex.dispose();
        shadowTex.dispose();
        renderer.dispose();
      };
    }, []);

    return (
      <div
        ref={mountRef}
        className="fixed inset-0 w-screen h-screen overflow-hidden z-0"
        aria-label="Interactive 3D Jinan Cultural Landmarks Viewport"
      />
    );
  }
);
