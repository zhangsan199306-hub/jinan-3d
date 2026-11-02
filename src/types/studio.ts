export type ScenePresetId = 'baotu' | 'daming' | 'qianfo' | 'lingyan';

export type FinishPresetId =
  | 'cycles-photoreal'
  | 'clay-monolith'
  | 'song-mineral'
  | 'imperial-jade';

export type LightingPresetId =
  | 'photo-daylight'
  | 'spring-morning'
  | 'lishan-sunset'
  | 'minghu-moonlight';

export type CameraPresetId =
  | 'photo-match'
  | 'panorama'
  | 'aerial'
  | 'pavilion-closeup'
  | 'waterside';

export type AspectTabId = 'architecture' | 'history' | 'poetry' | 'guide';

export type BaotuRenderEngineId = 'blender-photo-3d' | 'full-mesh-3d';

export type DeviceModeId = 'mobile' | 'desktop';

export interface InspectablePartSpec {
  id: string;
  nameZh: string;
  nameEn: string;
  role: '核心建筑 (Primary Landmark)' | '山水名胜 (Scenic Feature)' | '人文古迹 (Cultural Relic)';
  eraSpec: string;
  focusCameraPos: [number, number, number];
  focusTargetPos: [number, number, number];
  aspects: {
    architecture: string;
    history: string;
    poetry: string;
    guide: string;
  };
  metrics: {
    label: string;
    value: string;
  }[];
}

export interface StudioConfig {
  deviceMode: DeviceModeId;
  scenePreset: ScenePresetId;
  baotuRenderEngine: BaotuRenderEngineId;
  finishPreset: FinishPresetId;
  lightingPreset: LightingPresetId;
  cameraPreset: CameraPresetId;
  explodeFactor: number; // 0 to 1
  speedMultiplier: number; // 0, 0.5, 1, 2.5
  waterWaveIntensity: number; // 0 to 2.0
  lightAzimuthDeg: number; // 0 to 360
  audioEnabled: boolean;
  autoRotate: boolean;
  wireframeOverlay: boolean;
  showReferencePhoto: boolean;
}

export interface SceneMetadata {
  id: ScenePresetId;
  titleZh: string;
  titleEn: string;
  poeticTagline: string;
  locationSpec: string;
  partsCount: number;
  instancedElements: string;
  overview: string;
}

export const SCENE_METADATA: Record<ScenePresetId, SceneMetadata> = {
  baotu: {
    id: 'baotu',
    titleZh: '趵突泉 · 实景级 Blender 3D 复刻',
    titleEn: 'Baotu Spring Photorealistic 3D Reconstruction',
    poeticTagline: '云雾润蒸华不注，波涛声震大明湖',
    locationSpec: '1:1 复刻实景照片机位 · 泺源堂、敞轩亭、汉白玉栏、三股水与红鲤群',
    partsCount: 10,
    instancedElements: '85 尾动态游弋锦鲤、68 根雕花汉白玉望柱与垂柳丝绦',
    overview:
      '基于实景照片进行 Blender 级三维建筑与水景重建：前景为汉白玉雕花石栏围合的翡翠色方池，池内三股白浪昼夜翻涌、水雾升腾，数十尾红黄锦鲤游弋于东南池畔；正北为五开间歇山顶“泺源堂”与三出陛石阶，东岸紧邻朱柱美人靠敞轩水榭，西岸为青石板广场、西厢殿宇与参天垂柳，远景可见来鹤桥与白石牌坊。',
  },
  daming: {
    id: 'daming',
    titleZh: '大明湖 · 泉城明珠',
    titleEn: 'Daming Lake & Chaoran Lou',
    poeticTagline: '四面荷花三面柳，一城山色半城湖',
    locationSpec: '济南市历下区大明湖路 · 众泉汇流天然湖泊',
    partsCount: 9,
    instancedElements: '96 株环湖垂柳与盛放红荷、画舫石灯',
    overview:
      '由济南众多泉水汇流而成的天然湖泊，湖心历下亭古意盎然，东岸超然楼巍峨耸立，北岸铁公祠与南丰祠隔水相望，翠柳红荷与百米曲桥相映成趣。',
  },
  qianfo: {
    id: 'qianfo',
    titleZh: '千佛山 · 齐烟九点',
    titleEn: 'Thousand Buddha Mountain (Lishan)',
    poeticTagline: '齐烟九点揽历山，万佛摩崖映禅关',
    locationSpec: '济南市历下区经十一路18号 · 泰山余脉名胜',
    partsCount: 9,
    instancedElements: '88 株苍松翠柏、摩崖石龛与盘山石灯',
    overview:
      '古称历山，相传虞舜曾躬耕于此。隋开皇年间依山势镌刻千佛摩崖造像并建兴国禅寺，山巅“齐烟九点”坊与“一览亭”可俯瞰泉城山水全貌。',
  },
  lingyan: {
    id: 'lingyan',
    titleZh: '灵岩寺 · 海内四大名刹',
    titleEn: 'Lingyan Temple & Pizhi Pagoda',
    poeticTagline: '游泰山不至灵岩不成游也',
    locationSpec: '济南市长清区万德街道 · 世界文化与自然遗产',
    partsCount: 9,
    instancedElements: '80 座历代墓塔林、千年古柏与银杏',
    overview:
      '始建于东晋，唐宋时期与浙江国清寺、南京栖霞寺、湖北玉泉寺并称“海内四大名刹”。寺内宋代八角九层辟支塔、千佛殿四十尊彩色泥塑罗汉及墓塔林享誉世界。',
  },
};

export interface FinishPalette {
  id: FinishPresetId;
  nameZh: string;
  nameEn: string;
  swatchHex: string;
  secondaryHex: string;
  primaryRoof: {
    color: number;
    metalness: number;
    roughness: number;
    anisotropy: number;
  };
  secondaryTimber: {
    color: number;
    metalness: number;
    roughness: number;
  };
  stonePlinth: {
    color: number;
    metalness: number;
    roughness: number;
    clearcoat: number;
  };
  waterCrystal: {
    color: number;
    attenuationColor: number;
    ior: number;
  };
  terrainColor: number;
}

export const FINISH_PALETTES: Record<FinishPresetId, FinishPalette> = {
  'cycles-photoreal': {
    id: 'cycles-photoreal',
    nameZh: 'Cycles 实景材质 · 灰瓦朱柱汉白玉',
    nameEn: 'Cycles Photorealistic PBR',
    swatchHex: '#475569',
    secondaryHex: '#991b1b',
    primaryRoof: {
      color: 0x3b424c, // 实景照片中的青灰筒瓦屋面
      metalness: 0.22,
      roughness: 0.42,
      anisotropy: 0.35,
    },
    secondaryTimber: {
      color: 0x9b2c2c, // 实景照片中的朱红廊柱与隔扇
      metalness: 0.1,
      roughness: 0.48,
    },
    stonePlinth: {
      color: 0xe7e5e0, // 暖调汉白玉石栏与台阶
      metalness: 0.06,
      roughness: 0.52,
      clearcoat: 0.15,
    },
    waterCrystal: {
      color: 0xf8fafc, // 翻涌雪白水花
      attenuationColor: 0x0d9488,
      ior: 1.333,
    },
    terrainColor: 0x9ca3af, // 青石板广场铺装色
  },
  'clay-monolith': {
    id: 'clay-monolith',
    nameZh: 'Blender 白模泥塑 · 建筑体块检视',
    nameEn: 'Blender Studio Clay Render',
    swatchHex: '#e2e8f0',
    secondaryHex: '#94a3b8',
    primaryRoof: {
      color: 0xcbd5e1,
      metalness: 0.05,
      roughness: 0.68,
      anisotropy: 0.1,
    },
    secondaryTimber: {
      color: 0xe2e8f0,
      metalness: 0.05,
      roughness: 0.72,
    },
    stonePlinth: {
      color: 0xf1f5f9,
      metalness: 0.04,
      roughness: 0.65,
      clearcoat: 0.1,
    },
    waterCrystal: {
      color: 0xbae6fd,
      attenuationColor: 0x38bdf8,
      ior: 1.333,
    },
    terrainColor: 0x94a3b8,
  },
  'song-mineral': {
    id: 'song-mineral',
    nameZh: '千里江山 · 宋韵青绿',
    nameEn: 'Song Dynasty Blue-Green Mineral',
    swatchHex: '#10b981',
    secondaryHex: '#f59e0b',
    primaryRoof: {
      color: 0x047857,
      metalness: 0.68,
      roughness: 0.22,
      anisotropy: 0.65,
    },
    secondaryTimber: {
      color: 0xb45309,
      metalness: 0.55,
      roughness: 0.48,
    },
    stonePlinth: {
      color: 0xd6d3d1,
      metalness: 0.22,
      roughness: 0.35,
      clearcoat: 0.6,
    },
    waterCrystal: {
      color: 0xe0f2fe,
      attenuationColor: 0x0284c7,
      ior: 1.45,
    },
    terrainColor: 0x334155,
  },
  'imperial-jade': {
    id: 'imperial-jade',
    nameZh: '白玉鎏金 · 盛世沙盘',
    nameEn: 'Imperial White Jade & Gilded Gold',
    swatchHex: '#f8fafc',
    secondaryHex: '#eab308',
    primaryRoof: {
      color: 0xfbbf24,
      metalness: 0.92,
      roughness: 0.18,
      anisotropy: 0.8,
    },
    secondaryTimber: {
      color: 0xf1f5f9,
      metalness: 0.15,
      roughness: 0.45,
    },
    stonePlinth: {
      color: 0xffffff,
      metalness: 0.18,
      roughness: 0.22,
      clearcoat: 1.0,
    },
    waterCrystal: {
      color: 0xecfdf5,
      attenuationColor: 0x10b981,
      ior: 1.65,
    },
    terrainColor: 0x475569,
  },
};

export interface LightingConfig {
  id: LightingPresetId;
  nameZh: string;
  nameEn: string;
  bgColor: number;
  skyTopColor: number;
  skyHorizonColor: number;
  fogDensity: number;
  keyColor: number;
  keyIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  rimColor: number;
  rimIntensity: number;
  exposure: number;
}

export const LIGHTING_CONFIGS: Record<LightingPresetId, LightingConfig> = {
  'photo-daylight': {
    id: 'photo-daylight',
    nameZh: '实景晴空暖阳 (照片光效)',
    nameEn: 'Reference Photo Golden Daylight',
    bgColor: 0xc8dff0,
    skyTopColor: 0x5ea3d6,
    skyHorizonColor: 0xe8eff5,
    fogDensity: 0.0085,
    keyColor: 0xfff3d6,
    keyIntensity: 3.4,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x64748b,
    hemiIntensity: 1.35,
    rimColor: 0xfef08a,
    rimIntensity: 1.4,
    exposure: 1.15,
  },
  'spring-morning': {
    id: 'spring-morning',
    nameZh: '泉城晨雾',
    nameEn: 'Spring Mist Dawn',
    bgColor: 0x9ab8cc,
    skyTopColor: 0x4a7c9b,
    skyHorizonColor: 0xd5e3ec,
    fogDensity: 0.013,
    keyColor: 0xfff0d4,
    keyIntensity: 2.9,
    hemiSkyColor: 0xbae6fd,
    hemiGroundColor: 0x475569,
    hemiIntensity: 1.2,
    rimColor: 0x2dd4bf,
    rimIntensity: 1.5,
    exposure: 1.14,
  },
  'lishan-sunset': {
    id: 'lishan-sunset',
    nameZh: '齐烟夕照',
    nameEn: 'Lishan Golden Dusk',
    bgColor: 0xd99b78,
    skyTopColor: 0x3b4d71,
    skyHorizonColor: 0xf5b88c,
    fogDensity: 0.012,
    keyColor: 0xffa952,
    keyIntensity: 3.5,
    hemiSkyColor: 0xfda4af,
    hemiGroundColor: 0x44403c,
    hemiIntensity: 1.05,
    rimColor: 0xf59e0b,
    rimIntensity: 2.1,
    exposure: 1.12,
  },
  'minghu-moonlight': {
    id: 'minghu-moonlight',
    nameZh: '明湖夜月',
    nameEn: 'Lantern Moonlight',
    bgColor: 0x0b1526,
    skyTopColor: 0x060b14,
    skyHorizonColor: 0x162844,
    fogDensity: 0.016,
    keyColor: 0x93c5fd,
    keyIntensity: 2.2,
    hemiSkyColor: 0x6366f1,
    hemiGroundColor: 0x0f172a,
    hemiIntensity: 0.85,
    rimColor: 0xfbbf24,
    rimIntensity: 2.4,
    exposure: 1.12,
  },
};

export interface CameraTargetSpec {
  id: CameraPresetId;
  nameZh: string;
  nameEn: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraTargetSpec> = {
  'photo-match': {
    id: 'photo-match',
    nameZh: '实景照片机位 (西南凭栏)',
    nameEn: 'Reference Photo Match',
    position: [-2.65, 2.38, 5.25],
    target: [0.35, 0.95, -0.65],
  },
  panorama: {
    id: 'panorama',
    nameZh: '全景揽胜',
    nameEn: 'Panorama View',
    position: [6.8, 4.8, 7.6],
    target: [0, 1.0, 0],
  },
  aerial: {
    id: 'aerial',
    nameZh: '飞鸟俯瞰',
    nameEn: 'Birds-Eye Plan',
    position: [0.1, 12.2, 2.5],
    target: [0, 0.6, 0],
  },
  'pavilion-closeup': {
    id: 'pavilion-closeup',
    nameZh: '三股水微距',
    nameEn: 'Three Springs Macro',
    position: [-0.8, 1.45, 3.1],
    target: [0, 0.45, 0.15],
  },
  waterside: {
    id: 'waterside',
    nameZh: '东廊望泉',
    nameEn: 'East Pavilion View',
    position: [3.2, 1.65, 2.4],
    target: [-0.4, 0.85, -0.5],
  },
};

export const PHOTO_STAGE_CAMERA_PRESETS: Record<CameraPresetId, CameraTargetSpec> = {
  'photo-match': {
    id: 'photo-match',
    nameZh: 'Blender 实景重渲染正视 (1:1 构图)',
    nameEn: 'Blender Cycles Photo Match',
    position: [0.0, 3.22, 6.85],
    target: [0.0, 2.45, -0.35],
  },
  panorama: {
    id: 'panorama',
    nameZh: '三维微缩沙盘斜视',
    nameEn: '3D Relief Diorama Angle',
    position: [-2.45, 3.65, 6.65],
    target: [0.1, 2.35, -0.25],
  },
  aerial: {
    id: 'aerial',
    nameZh: '高空俯视深度浮雕',
    nameEn: 'High Angle Relief View',
    position: [0.0, 5.85, 5.65],
    target: [0.0, 2.15, -0.25],
  },
  'pavilion-closeup': {
    id: 'pavilion-closeup',
    nameZh: '三股水涌浪特写',
    nameEn: 'Three Springs Macro',
    position: [0.0, 2.25, 4.15],
    target: [0.05, 1.98, 0.1],
  },
  waterside: {
    id: 'waterside',
    nameZh: '观澜亭与泺源堂特写',
    nameEn: 'East Pavilion & Hall Closeup',
    position: [1.85, 3.35, 4.45],
    target: [1.75, 3.45, -0.2],
  },
};

