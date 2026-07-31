import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { sitePath } from "./site-path";
import { INITIAL_FLAGS, type StoryFlags, type StoryPage } from "./story";
import {
  drawBootScreen,
  drawMissingPage,
  drawSearchScreen,
  drawTeletextPage,
  TELETEXT_HEIGHT,
  TELETEXT_WIDTH,
  type ChoiceRegion,
  type TeletextDrawState,
} from "./teletext-renderer";

export interface SceneSettings {
  reducedMotion: boolean;
  reducedFlash: boolean;
}

export interface SceneCallbacks {
  onChoice: (index: number) => void;
  onToggleFocus: () => void;
}

type ScreenMode = "boot" | "page" | "search" | "missing";

const linkColors = [0xff3f54, 0x65ff85, 0xffe36e, 0x58e9ff];

const atmosphereShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.022 },
    aberration: { value: 0.0012 },
    vignette: { value: 0.62 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float aberration;
    uniform float vignette;
    varying vec2 vUv;

    float random(vec2 value) {
      return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 center = vUv - 0.5;
      float edge = dot(center, center);
      vec2 offset = center * aberration * (0.35 + edge * 2.2);

      float red = texture2D(tDiffuse, vUv + offset).r;
      float green = texture2D(tDiffuse, vUv).g;
      float blue = texture2D(tDiffuse, vUv - offset).b;
      vec3 color = vec3(red, green, blue);

      float noise = random(vUv * vec2(1731.0, 997.0) + time * 0.17) - 0.5;
      float darken = smoothstep(0.82, 0.18, length(center * vec2(0.84, 1.0)));
      color += noise * grain;
      color *= mix(1.0 - vignette, 1.0, darken);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

const crtShader = {
  uniforms: {
    map: { value: null as THREE.Texture | null },
    time: { value: 0 },
    disturbance: { value: 0.08 },
    reducedFlash: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 curved = position;
      vec2 centered = uv - 0.5;
      curved.z += (1.0 - dot(centered, centered) * 2.0) * 0.025;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(curved, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform float time;
    uniform float disturbance;
    uniform float reducedFlash;
    varying vec2 vUv;

    float random(vec2 value) {
      return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float barrel = dot(center, center);
      uv += center * barrel * 0.028;

      float lineNoise = sin(uv.y * 71.0 + time * 4.0);
      float jitter = lineNoise * 0.00045 * disturbance * (1.0 - reducedFlash);
      uv.x += jitter;

      float split = 0.0011 * disturbance * (1.0 - reducedFlash * 0.75);
      float red = texture2D(map, uv + vec2(split, 0.0)).r;
      float green = texture2D(map, uv).g;
      float blue = texture2D(map, uv - vec2(split, 0.0)).b;
      vec3 color = vec3(red, green, blue);

      float scan = 0.91 + 0.09 * sin(uv.y * 720.0 * 3.14159);
      float grille = 0.97 + 0.03 * sin(uv.x * 960.0 * 3.14159);
      float vignette = smoothstep(0.77, 0.29, length(center * vec2(0.86, 1.05)));
      float noise = random(uv * 700.0 + floor(time * 18.0)) - 0.5;

      color *= scan * grille * mix(0.5, 1.0, vignette);
      color += noise * 0.025 * disturbance * (1.0 - reducedFlash);
      color *= 1.52;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

function createCarpetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#6d452b";
  ctx.fillRect(0, 0, 512, 512);

  const rows = 6;
  const columns = 5;
  for (let row = -1; row < rows + 1; row += 1) {
    for (let column = -1; column < columns + 1; column += 1) {
      const x = column * 116 + (row % 2 ? 58 : 0);
      const y = row * 92;
      const wobble = ((column * 19 + row * 11) % 9) - 4;

      ctx.beginPath();
      ctx.moveTo(x, y + 44);
      ctx.lineTo(x + 52 + wobble, y);
      ctx.lineTo(x + 104, y + 44);
      ctx.lineTo(x + 52 - wobble, y + 88);
      ctx.closePath();
      ctx.strokeStyle = row % 2 ? "#34201a" : "#2a1a18";
      ctx.lineWidth = 13;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 18, y + 44);
      ctx.lineTo(x + 52, y + 15);
      ctx.lineTo(x + 86, y + 44);
      ctx.lineTo(x + 52, y + 73);
      ctx.closePath();
      ctx.strokeStyle = "#9a6b43";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  for (let index = 0; index < 2_400; index += 1) {
    const alpha = 0.02 + Math.random() * 0.045;
    ctx.fillStyle = `rgba(9, 6, 5, ${alpha})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 7);
  return texture;
}

function createPhotoTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "#27343a");
  gradient.addColorStop(0.5, "#455257");
  gradient.addColorStop(0.51, "#182a31");
  gradient.addColorStop(1, "#07171e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 320);

  ctx.fillStyle = "#12191b";
  ctx.beginPath();
  ctx.moveTo(0, 165);
  ctx.lineTo(80, 112);
  ctx.lineTo(148, 151);
  ctx.lineTo(235, 85);
  ctx.lineTo(326, 143);
  ctx.lineTo(408, 102);
  ctx.lineTo(512, 154);
  ctx.lineTo(512, 210);
  ctx.lineTo(0, 210);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.22;
  for (let line = 0; line < 14; line += 1) {
    ctx.fillStyle = line % 2 ? "#7997a0" : "#b8734c";
    ctx.fillRect(0, 215 + line * 7, 512, 2);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCurtainGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 48, 24);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const fold =
      Math.sin((x / width + 0.5) * Math.PI * 13) * 0.105 +
      Math.sin((x / width + 0.5) * Math.PI * 5) * 0.025;
    const drape = (1 - (y / height + 0.5)) * 0.035;
    position.setZ(index, fold + drape);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createRoundedScreenGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 32, 24);
  return geometry;
}

function disposeMaterial(material: THREE.Material) {
  const candidate = material as THREE.Material & {
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
    metalnessMap?: THREE.Texture;
    emissiveMap?: THREE.Texture;
  };
  [
    candidate.map,
    candidate.normalMap,
    candidate.roughnessMap,
    candidate.metalnessMap,
    candidate.emissiveMap,
  ].forEach((texture) => texture?.dispose());
  material.dispose();
}

export class TeletextScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private atmospherePass: ShaderPass;
  private bloomPass: UnrealBloomPass;
  private animationStartedAt = performance.now();
  private frame = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  private screenCanvas = document.createElement("canvas");
  private screenTexture: THREE.CanvasTexture;
  private screenMaterial: THREE.ShaderMaterial;
  private screenMesh: THREE.Mesh;
  private screenLight: THREE.PointLight;
  private screenColorTarget = new THREE.Color(0x58e9ff);
  private screenIntensityTarget = 2.3;

  private warmLight!: THREE.SpotLight;
  private warmIntensityTarget = 48;
  private corridorLight!: THREE.PointLight;
  private corridorIntensityTarget = 7;
  private fogPlane!: THREE.Mesh;
  private fogOpacityTarget = 0;
  private silhouette!: THREE.Group;
  private silhouetteMaterials: THREE.MeshBasicMaterial[] = [];
  private silhouetteOpacityTarget = 0;
  private curtains = new THREE.Group();
  private dust!: THREE.Points;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(2, 2);
  private pointerTarget = new THREE.Vector2();
  private interactionTargets: THREE.Object3D[] = [];
  private linkButtons: THREE.Mesh[] = [];
  private choiceRegions: ChoiceRegion[] = [];

  private currentPage: StoryPage | null = null;
  private flags: StoryFlags = { ...INITIAL_FLAGS };
  private mode: ScreenMode = "boot";
  private requestedPage = "";
  private modeStartedAt = performance.now();
  private pageStartedAt = performance.now();
  private dirty = true;
  private lastDrawnRows = -1;
  private lastGlitchTick = -1;
  private lastModePhase = -1;
  private lastClockSecond = -1;
  private drawState: TeletextDrawState = {
    selectedChoice: -1,
    hoveredChoice: null,
    revealed: false,
    hold: false,
    focus: false,
    entry: "",
    visibleRows: 23,
    alert: "",
    clockSeconds: 0,
    glitchSeed: 1,
    reducedFlash: false,
  };
  private settings: SceneSettings = {
    reducedMotion: false,
    reducedFlash: false,
  };
  private started = false;
  private effectStartedAt = performance.now();
  private currentEffect: StoryPage["effect"] = "idle";
  private cameraPosition = new THREE.Vector3(0.22, 1.28, 4.75);
  private cameraTarget = new THREE.Vector3(-0.1, 1.27, 0.48);

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.05, 40);
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = "scene-canvas";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "A dim motel lounge with an interactive television",
    );
    this.container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x050608);
    this.scene.fog = new THREE.FogExp2(0x08090d, 0.065);

    this.screenCanvas.width = TELETEXT_WIDTH;
    this.screenCanvas.height = TELETEXT_HEIGHT;
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.minFilter = THREE.NearestFilter;
    this.screenTexture.magFilter = THREE.NearestFilter;
    this.screenTexture.generateMipmaps = false;

    this.screenMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(crtShader.uniforms),
      vertexShader: crtShader.vertexShader,
      fragmentShader: crtShader.fragmentShader,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    this.screenMaterial.uniforms.map.value = this.screenTexture;

    this.screenMesh = new THREE.Mesh(
      createRoundedScreenGeometry(0.81, 0.61),
      this.screenMaterial,
    );
    this.screenMesh.name = "InteractiveTeletextScreen";
    this.screenMesh.position.set(-0.275, 1.24, 0.565);
    this.screenMesh.renderOrder = 8;
    this.scene.add(this.screenMesh);
    this.interactionTargets.push(this.screenMesh);

    this.screenLight = new THREE.PointLight(0x58e9ff, 2.3, 5.5, 2);
    this.screenLight.position.set(-0.28, 1.28, 0.92);
    this.scene.add(this.screenLight);

    this.createRoom();
    void this.loadTelevision();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.28,
      0.34,
      0.78,
    );
    this.composer.addPass(this.bloomPass);
    this.atmospherePass = new ShaderPass(atmosphereShader);
    this.composer.addPass(this.atmospherePass);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave);

    drawBootScreen(this.screenCanvas, 0);
    this.screenTexture.needsUpdate = true;
    void document.fonts?.load('30px "Teletext50"').then(() => {
      this.dirty = true;
    });

    this.animate();
  }

  begin() {
    this.started = true;
    this.modeStartedAt = performance.now();
  }

  showPage(page: StoryPage, flags: StoryFlags) {
    this.currentPage = page;
    this.flags = { ...flags };
    this.mode = "page";
    this.modeStartedAt = performance.now();
    this.pageStartedAt = performance.now();
    this.lastDrawnRows = -1;
    this.drawState.visibleRows = 0;
    this.drawState.alert = "";
    this.drawState.entry = "";
    this.drawState.hoveredChoice = null;
    this.drawState.selectedChoice = Math.min(
      Math.max(-1, this.drawState.selectedChoice),
      page.choices.length - 1,
    );
    this.currentEffect = page.effect;
    this.effectStartedAt = performance.now();
    this.applyEffectTargets(page.effect);
    this.updateLinkButtons();
    this.dirty = true;
  }

  showSearch(requestedPage: string) {
    this.requestedPage = requestedPage;
    this.mode = "search";
    this.modeStartedAt = performance.now();
    this.lastModePhase = -1;
    this.dirty = true;
  }

  showMissing(requestedPage: string) {
    this.requestedPage = requestedPage;
    this.mode = "missing";
    this.modeStartedAt = performance.now();
    this.lastModePhase = -1;
    this.dirty = true;
  }

  setSelection(index: number) {
    this.drawState.selectedChoice = Math.max(-1, index);
    this.dirty = true;
  }

  setEntry(entry: string) {
    this.drawState.entry = entry;
    this.dirty = true;
  }

  setRevealed(revealed: boolean) {
    this.drawState.revealed = revealed;
    this.dirty = true;
  }

  setHold(hold: boolean) {
    this.drawState.hold = hold;
    this.dirty = true;
  }

  setFocus(focus: boolean) {
    this.drawState.focus = focus;
    this.dirty = true;
  }

  setAlert(message: string) {
    this.drawState.alert = message.toUpperCase();
    this.dirty = true;
  }

  clearAlert() {
    this.drawState.alert = "";
    this.dirty = true;
  }

  setSettings(settings: SceneSettings) {
    this.settings = settings;
    this.drawState.reducedFlash = settings.reducedFlash;
    this.screenMaterial.uniforms.reducedFlash.value = settings.reducedFlash
      ? 1
      : 0;
    this.atmospherePass.uniforms.grain.value = settings.reducedFlash
      ? 0
      : 0.022;
    this.atmospherePass.uniforms.aberration.value = settings.reducedFlash
      ? 0
      : 0.0012;
    this.dirty = true;
  }

  private createRoom() {
    const carpetTexture = createCarpetTexture();
    carpetTexture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        map: carpetTexture,
        color: 0x8b5b38,
        roughness: 0.97,
        metalness: 0,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.25);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x09090a,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.8, 1);
    this.scene.add(ceiling);

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0x12191a,
      roughness: 0.95,
    });
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      sideMaterial,
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4.15, 1.9, 1.8);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      sideMaterial.clone(),
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(4.15, 1.9, 1.8);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const woodColors = [0x3b2119, 0x43261c, 0x321c17, 0x4b2a1e];
    for (let index = 0; index < 19; index += 1) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 3.75, 0.11),
        new THREE.MeshStandardMaterial({
          color: woodColors[index % woodColors.length],
          roughness: 0.85,
          metalness: 0,
        }),
      );
      panel.position.set(-4.0 + index * 0.44, 1.88, -0.98);
      panel.receiveShadow = true;
      this.scene.add(panel);
    }

    const curtainMaterial = new THREE.MeshStandardMaterial({
      color: 0x12362d,
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const leftCurtain = new THREE.Mesh(
      createCurtainGeometry(2.4, 3.72),
      curtainMaterial,
    );
    leftCurtain.position.set(-2.95, 1.86, -0.82);
    leftCurtain.castShadow = true;
    leftCurtain.receiveShadow = true;
    this.curtains.add(leftCurtain);

    const rightCurtain = new THREE.Mesh(
      createCurtainGeometry(1.15, 3.72),
      curtainMaterial.clone(),
    );
    rightCurtain.position.set(3.58, 1.86, -0.82);
    rightCurtain.castShadow = true;
    this.curtains.add(rightCurtain);
    this.scene.add(this.curtains);

    this.createCorridor();
    this.createFurniture();
    this.createWallDetails();
    this.createDust();

    const ambient = new THREE.AmbientLight(0x2c2235, 0.7);
    this.scene.add(ambient);

    this.warmLight = new THREE.SpotLight(
      0xd59a50,
      48,
      8,
      Math.PI / 4.8,
      0.82,
      2,
    );
    this.warmLight.position.set(1.72, 2.5, 1.15);
    this.warmLight.target.position.set(-0.1, 0.75, 0);
    this.warmLight.castShadow = true;
    this.warmLight.shadow.mapSize.set(1024, 1024);
    this.warmLight.shadow.bias = -0.0004;
    this.scene.add(this.warmLight, this.warmLight.target);
  }

  private createCorridor() {
    const opening = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 2.85),
      new THREE.MeshBasicMaterial({ color: 0x020607 }),
    );
    opening.position.set(2.47, 1.43, -0.84);
    this.scene.add(opening);

    const frostMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8ccbd0,
      emissive: 0x183f47,
      emissiveIntensity: 0.55,
      roughness: 0.72,
      transmission: 0.2,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    });
    const frost = new THREE.Mesh(
      new THREE.PlaneGeometry(0.93, 2.45),
      frostMaterial,
    );
    frost.position.set(2.47, 1.44, -0.8);
    this.scene.add(frost);

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x271817,
      roughness: 0.85,
    });
    [
      [1.83, 1.43, 0.12, 2.9],
      [3.11, 1.43, 0.12, 2.9],
      [2.47, 2.86, 1.4, 0.12],
    ].forEach(([x, y, width, height]) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.14),
        frameMaterial,
      );
      frame.position.set(x, y, -0.72);
      frame.castShadow = true;
      this.scene.add(frame);
    });

    this.corridorLight = new THREE.PointLight(0x4fa8b4, 7, 5, 2);
    this.corridorLight.position.set(2.45, 1.55, -0.08);
    this.scene.add(this.corridorLight);

    const fogMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bc5c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.fogPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.55),
      fogMaterial,
    );
    this.fogPlane.position.set(2.47, 1.45, -0.66);
    this.scene.add(this.fogPlane);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x020203,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.9, 5, 10),
      shadowMaterial,
    );
    body.position.y = 1.05;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 12),
      shadowMaterial.clone(),
    );
    head.position.y = 1.78;
    this.silhouetteMaterials.push(
      shadowMaterial,
      head.material as THREE.MeshBasicMaterial,
    );
    this.silhouette = new THREE.Group();
    this.silhouette.add(body, head);
    this.silhouette.position.set(2.53, 0, -0.61);
    this.scene.add(this.silhouette);
  }

  private createFurniture() {
    const consoleMaterial = new THREE.MeshStandardMaterial({
      color: 0x40261c,
      roughness: 0.72,
    });
    const consoleTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.36, 0.22, 0.92),
      consoleMaterial,
    );
    consoleTop.position.set(0, 0.35, -0.02);
    consoleTop.castShadow = true;
    consoleTop.receiveShadow = true;
    this.scene.add(consoleTop);

    const consoleBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 0.38, 0.76),
      consoleMaterial.clone(),
    );
    consoleBody.position.set(0, 0.18, -0.03);
    consoleBody.castShadow = true;
    this.scene.add(consoleBody);

    [-0.83, 0.83].forEach((x) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.36, 0.12),
        consoleMaterial,
      );
      leg.position.set(x, 0.02, 0.01);
      leg.castShadow = true;
      this.scene.add(leg);
    });

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.08, 28),
      new THREE.MeshStandardMaterial({
        color: 0x321e19,
        roughness: 0.74,
      }),
    );
    tableTop.position.set(1.58, 0.68, 0.72);
    tableTop.castShadow = true;
    this.scene.add(tableTop);

    const tableStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 0.66, 16),
      new THREE.MeshStandardMaterial({
        color: 0x59412d,
        metalness: 0.15,
        roughness: 0.62,
      }),
    );
    tableStem.position.set(1.58, 0.34, 0.72);
    tableStem.castShadow = true;
    this.scene.add(tableStem);

    const phoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x17191b,
      roughness: 0.4,
      metalness: 0.14,
    });
    const phoneBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.12, 0.25),
      phoneMaterial,
    );
    phoneBase.position.set(1.58, 0.79, 0.72);
    phoneBase.rotation.y = -0.25;
    phoneBase.castShadow = true;
    this.scene.add(phoneBase);
    const handset = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.27, 4, 10),
      phoneMaterial,
    );
    handset.rotation.z = Math.PI / 2;
    handset.rotation.y = -0.25;
    handset.position.set(1.58, 0.9, 0.72);
    handset.castShadow = true;
    this.scene.add(handset);

    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d6a3f,
      metalness: 0.55,
      roughness: 0.38,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 1.7, 18),
      poleMaterial,
    );
    pole.position.set(1.74, 1.18, 1.12);
    pole.castShadow = true;
    this.scene.add(pole);

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.46, 0.48, 28, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xc4a26c,
        emissive: 0x7a4a20,
        emissiveIntensity: 0.24,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    shade.position.set(1.74, 2.12, 1.12);
    shade.castShadow = true;
    this.scene.add(shade);

    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.27, 0.08, 24),
      poleMaterial,
    );
    lampBase.position.set(1.74, 0.04, 1.12);
    this.scene.add(lampBase);

    this.createLinkButtons();
  }

  private createLinkButtons() {
    const positions = [-0.69, -0.45, -0.21, 0.03];
    positions.forEach((x, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: linkColors[index],
        emissive: linkColors[index],
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.15,
      });
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.055, 0.045),
        material,
      );
      button.position.set(x, 0.777, 0.63);
      button.userData.choiceIndex = index;
      button.castShadow = true;
      this.linkButtons.push(button);
      this.interactionTargets.push(button);
      this.scene.add(button);
    });
  }

  private createWallDetails() {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x17100e,
      roughness: 0.72,
    });
    const photoFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.78, 0.09),
      frameMaterial,
    );
    photoFrame.position.set(-2.22, 2.17, -0.78);
    photoFrame.castShadow = true;
    this.scene.add(photoFrame);

    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.99, 0.61),
      new THREE.MeshBasicMaterial({
        map: createPhotoTexture(),
        color: 0x9ca2a0,
      }),
    );
    photo.position.set(-2.22, 2.17, -0.724);
    this.scene.add(photo);

    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 48),
      new THREE.MeshStandardMaterial({
        color: 0xcfc2a2,
        roughness: 0.8,
      }),
    );
    clockFace.position.set(1.11, 2.55, -0.72);
    this.scene.add(clockFace);

    const clockFrame = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.3, 48),
      frameMaterial,
    );
    clockFrame.position.set(1.11, 2.55, -0.71);
    this.scene.add(clockFrame);

    const handMaterial = new THREE.MeshBasicMaterial({ color: 0x201715 });
    const hour = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.14, 0.015),
      handMaterial,
    );
    hour.position.set(1.11, 2.61, -0.68);
    hour.rotation.z = -0.62;
    this.scene.add(hour);
    const minute = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.19, 0.015),
      handMaterial.clone(),
    );
    minute.position.set(1.17, 2.53, -0.68);
    minute.rotation.z = 1.08;
    this.scene.add(minute);
  }

  private createDust() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 7.4;
      positions[index * 3 + 1] = 0.25 + Math.random() * 3.1;
      positions[index * 3 + 2] = -0.5 + Math.random() * 5.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xd5b98c,
      size: 0.012,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  private async loadTelevision() {
    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;

    try {
      const detailed = await loader.loadAsync(
        sitePath("/models/television/Television_01_1k.gltf"),
      );
      model = detailed.scene;
    } catch {
      if (this.disposed) return;
      try {
        const fallback = await loader.loadAsync(
          sitePath("/models/television/television-vintage.glb"),
        );
        model = fallback.scene;
      } catch {
        model = this.createProceduralFallbackTelevision();
      }
    }

    if (!model) return;
    if (this.disposed) {
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) {
          return;
        }
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(object.material);
        }
      });
      return;
    }

    model.name = "VintageTelevision";
    model.updateMatrixWorld(true);
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const scale = 1.9 / Math.max(0.001, initialSize.x);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y += 0.47 - box.min.y;
    model.position.z += 0.62 - box.max.z;
    model.updateMatrixWorld(true);

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        if (
          material instanceof THREE.MeshStandardMaterial ||
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          material.envMapIntensity = 0.25;
        }
      });
    });

    this.scene.add(model);
  }

  private createProceduralFallbackTelevision() {
    const group = new THREE.Group();
    const caseMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f2925,
      roughness: 0.72,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.42, 1.02),
      caseMaterial,
    );
    body.position.y = 0.71;
    group.add(body);
    return group;
  }

  private updateLinkButtons() {
    this.linkButtons.forEach((button, index) => {
      const material = button.material as THREE.MeshStandardMaterial;
      const choice = this.currentPage?.choices[index];
      const enabled =
        choice &&
        (choice.requires?.every((flag) => this.flags[flag]) ?? true);
      material.color.setHex(enabled ? linkColors[index] : 0x292e31);
      material.emissive.setHex(enabled ? linkColors[index] : 0x000000);
      material.emissiveIntensity = enabled ? 0.44 : 0;
      button.scale.z = choice ? 1 : 0.28;
    });
  }

  private applyEffectTargets(effect: StoryPage["effect"]) {
    const values: Record<
      StoryPage["effect"],
      {
        color: number;
        screen: number;
        warm: number;
        corridor: number;
        fog: number;
        silhouette: number;
      }
    > = {
      idle: {
        color: 0x58e9ff,
        screen: 2.35,
        warm: 48,
        corridor: 7,
        fog: 0,
        silhouette: 0,
      },
      fog: {
        color: 0x65ff85,
        screen: 2.6,
        warm: 36,
        corridor: 11,
        fog: 0.26,
        silhouette: 0.02,
      },
      scarf: {
        color: 0xffb459,
        screen: 2.5,
        warm: 53,
        corridor: 6,
        fog: 0.06,
        silhouette: 0.26,
      },
      relay: {
        color: 0x65ff85,
        screen: 2.75,
        warm: 41,
        corridor: 8,
        fog: 0.08,
        silhouette: 0.08,
      },
      letter: {
        color: 0xffd077,
        screen: 2.45,
        warm: 55,
        corridor: 5,
        fog: 0.03,
        silhouette: 0,
      },
      sealed: {
        color: 0xff59d1,
        screen: 2.8,
        warm: 30,
        corridor: 9,
        fog: 0.14,
        silhouette: 0.12,
      },
      mirror: {
        color: 0xeafcff,
        screen: 3.1,
        warm: 20,
        corridor: 13,
        fog: 0.22,
        silhouette: 0.45,
      },
      live: {
        color: 0x65ff85,
        screen: 3,
        warm: 28,
        corridor: 10,
        fog: 0.12,
        silhouette: 0.16,
      },
      countdown: {
        color: 0xff3f54,
        screen: 3.25,
        warm: 21,
        corridor: 12,
        fog: 0.25,
        silhouette: 0.31,
      },
      "ending-dark": {
        color: 0xffffff,
        screen: 0.7,
        warm: 0,
        corridor: 0,
        fog: 0,
        silhouette: 0,
      },
      "ending-amber": {
        color: 0xffb459,
        screen: 3.6,
        warm: 62,
        corridor: 9,
        fog: 0.12,
        silhouette: 0.18,
      },
      "ending-green": {
        color: 0x65ff85,
        screen: 3.8,
        warm: 10,
        corridor: 15,
        fog: 0.28,
        silhouette: 0.38,
      },
      "ending-dawn": {
        color: 0xb7f7ff,
        screen: 4.1,
        warm: 68,
        corridor: 23,
        fog: 0.18,
        silhouette: 0,
      },
    };
    const target = values[effect];
    this.screenColorTarget.setHex(target.color);
    this.screenIntensityTarget = target.screen;
    this.warmIntensityTarget = target.warm;
    this.corridorIntensityTarget = target.corridor;
    this.fogOpacityTarget = target.fog;
    this.silhouetteOpacityTarget = target.silhouette;
    this.screenMaterial.uniforms.disturbance.value = [
      "mirror",
      "live",
      "countdown",
    ].includes(effect)
      ? 0.88
      : ["sealed", "relay"].includes(effect)
        ? 0.45
        : 0.12;
  }

  private onPointerMove(event: PointerEvent) {
    if (!this.started) {
      this.renderer.domElement.style.cursor = "default";
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerTarget.set(this.pointer.x, this.pointer.y);

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.interactionTargets,
      false,
    );
    let hovered: number | null = null;

    if (intersections.length) {
      const hit = intersections[0];
      if (hit.object === this.screenMesh && hit.uv) {
        const canvasY = (1 - hit.uv.y) * TELETEXT_HEIGHT;
        hovered =
          this.choiceRegions.find(
            (region) => canvasY >= region.top && canvasY < region.bottom,
          )?.index ?? null;
      } else if (typeof hit.object.userData.choiceIndex === "number") {
        hovered = hit.object.userData.choiceIndex;
      }
    }

    if (hovered !== this.drawState.hoveredChoice) {
      this.drawState.hoveredChoice = hovered;
      this.dirty = true;
    }
    this.renderer.domElement.style.cursor = intersections.length
      ? hovered !== null
        ? "pointer"
        : "zoom-in"
      : "default";
  }

  private onPointerDown(event: PointerEvent) {
    if (!this.started) return;
    if (event.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.interactionTargets,
      false,
    );
    if (!intersections.length) return;

    const hit = intersections[0];
    if (hit.object === this.screenMesh && hit.uv) {
      const canvasY = (1 - hit.uv.y) * TELETEXT_HEIGHT;
      const choiceIndex =
        this.choiceRegions.find(
          (region) => canvasY >= region.top && canvasY < region.bottom,
        )?.index ?? null;
      if (choiceIndex !== null) {
        this.callbacks.onChoice(choiceIndex);
      } else {
        this.callbacks.onToggleFocus();
      }
      return;
    }

    if (typeof hit.object.userData.choiceIndex === "number") {
      this.callbacks.onChoice(hit.object.userData.choiceIndex);
    }
  }

  private onPointerLeave() {
    this.pointerTarget.set(0, 0);
    this.drawState.hoveredChoice = null;
    this.dirty = true;
  }

  private renderTeletext(elapsed: number) {
    this.drawState.clockSeconds = Math.floor(elapsed);

    if (this.mode === "boot") {
      const phase =
        this.settings.reducedMotion || this.settings.reducedFlash
          ? 8
          : Math.min(
              8,
              Math.floor((performance.now() - this.modeStartedAt) / 180),
            );
      drawBootScreen(this.screenCanvas, phase);
      this.screenTexture.needsUpdate = true;
      return;
    }

    if (this.mode === "search") {
      const phase = this.settings.reducedFlash
        ? 4
        : Math.floor((performance.now() - this.modeStartedAt) / 120);
      drawSearchScreen(
        this.screenCanvas,
        this.requestedPage,
        phase,
        this.drawState.clockSeconds,
      );
      this.screenTexture.needsUpdate = true;
      return;
    }

    if (this.mode === "missing") {
      drawMissingPage(
        this.screenCanvas,
        this.requestedPage,
        this.drawState.clockSeconds,
      );
      this.screenTexture.needsUpdate = true;
      return;
    }

    if (!this.currentPage) return;
    this.choiceRegions = drawTeletextPage(
      this.screenCanvas,
      this.currentPage,
      this.flags,
      this.drawState,
    );
    this.screenTexture.needsUpdate = true;
  }

  private updateScreenState(elapsed: number) {
    const clockSecond = Math.floor(elapsed);
    if (clockSecond !== this.lastClockSecond) {
      this.lastClockSecond = clockSecond;
      this.drawState.clockSeconds = clockSecond;
      this.dirty = true;
    }

    if (this.mode === "page") {
      const revealElapsed = performance.now() - this.pageStartedAt;
      const rows = this.settings.reducedMotion
        ? 23
        : Math.min(23, 1 + Math.floor(revealElapsed / 72) * 2);
      if (rows !== this.lastDrawnRows) {
        this.drawState.visibleRows = rows;
        this.lastDrawnRows = rows;
        this.dirty = true;
      }

      const glitchTick = Math.floor(elapsed * 2.7);
      if (
        !this.settings.reducedFlash &&
        glitchTick !== this.lastGlitchTick &&
        ["mirror", "live", "countdown"].includes(this.currentEffect)
      ) {
        this.lastGlitchTick = glitchTick;
        this.drawState.glitchSeed = glitchTick + this.currentPage!.page;
        this.dirty = true;
      }
    } else if (this.mode === "boot") {
      const phase =
        this.settings.reducedMotion || this.settings.reducedFlash
          ? 8
          : Math.min(
              8,
              Math.floor((performance.now() - this.modeStartedAt) / 180),
            );
      if (phase !== this.lastModePhase) {
        this.lastModePhase = phase;
        this.dirty = true;
      }
    } else if (this.mode === "search") {
      const phase = this.settings.reducedFlash
        ? 4
        : Math.floor((performance.now() - this.modeStartedAt) / 120);
      if (phase !== this.lastModePhase) {
        this.lastModePhase = phase;
        this.dirty = true;
      }
    }

    if (this.dirty) {
      this.renderTeletext(elapsed);
      this.dirty = false;
    }
  }

  private updateCamera(elapsed: number) {
    const focus = this.drawState.focus;
    const isPortrait = this.camera.aspect < 0.8;
    const introZ = isPortrait ? 6.4 : 4.75;
    const restZ = isPortrait ? 5.35 : 3.38;
    const focusZ = isPortrait ? 3.4 : 2.02;
    const targetPosition = new THREE.Vector3(
      focus ? 0.04 : 0.22,
      focus ? 1.265 : 1.29,
      !this.started ? introZ : focus ? focusZ : restZ,
    );

    const motion = this.settings.reducedMotion ? 0 : 1;
    const driftX =
      Math.sin(elapsed * 0.27) * 0.007 * motion +
      this.pointerTarget.x * 0.025 * motion;
    const driftY =
      Math.sin(elapsed * 0.33 + 1.7) * 0.005 * motion +
      this.pointerTarget.y * 0.012 * motion;
    targetPosition.x += driftX;
    targetPosition.y += driftY;

    const easing = this.settings.reducedMotion ? 0.35 : 0.055;
    this.cameraPosition.lerp(targetPosition, easing);
    this.camera.position.copy(this.cameraPosition);

    const look = new THREE.Vector3(
      -0.11 + driftX * 0.3,
      1.275 + driftY * 0.3,
      0.49,
    );
    this.cameraTarget.lerp(look, easing * 1.5);
    this.camera.lookAt(this.cameraTarget);
    this.camera.fov = THREE.MathUtils.lerp(
      this.camera.fov,
      focus ? 38 : 46,
      easing,
    );
    this.camera.updateProjectionMatrix();
  }

  private updateEnvironment(elapsed: number) {
    const effectElapsed = (performance.now() - this.effectStartedAt) / 1_000;
    let screenTarget = this.screenIntensityTarget;
    let warmTarget = this.warmIntensityTarget;
    let corridorTarget = this.corridorIntensityTarget;

    if (
      !this.settings.reducedFlash &&
      ["countdown", "mirror"].includes(this.currentEffect)
    ) {
      const pulse = 0.82 + Math.sin(effectElapsed * 5.3) * 0.18;
      screenTarget *= pulse;
      corridorTarget *= 0.9 + (1 - pulse) * 0.4;
    }

    if (
      !this.settings.reducedFlash &&
      this.currentEffect === "ending-dark"
    ) {
      screenTarget *= Math.max(0.04, 1 - effectElapsed * 0.2);
      warmTarget *= Math.max(0, 1 - effectElapsed * 0.24);
    }

    this.screenLight.color.lerp(this.screenColorTarget, 0.045);
    this.screenLight.intensity = THREE.MathUtils.lerp(
      this.screenLight.intensity,
      screenTarget,
      0.045,
    );
    this.warmLight.intensity = THREE.MathUtils.lerp(
      this.warmLight.intensity,
      warmTarget,
      0.035,
    );
    this.corridorLight.intensity = THREE.MathUtils.lerp(
      this.corridorLight.intensity,
      corridorTarget,
      0.035,
    );

    const fogMaterial = this.fogPlane.material as THREE.MeshBasicMaterial;
    fogMaterial.opacity = THREE.MathUtils.lerp(
      fogMaterial.opacity,
      this.fogOpacityTarget,
      0.025,
    );
    this.silhouetteMaterials.forEach((material) => {
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        this.silhouetteOpacityTarget,
        0.022,
      );
    });

    const motion = this.settings.reducedMotion ? 0 : 1;
    this.dust.rotation.y = Math.sin(elapsed * 0.035) * 0.06 * motion;
    this.curtains.position.x =
      Math.sin(elapsed * 0.18) * 0.006 * motion +
      (this.currentEffect === "live"
        ? Math.sin(elapsed * 0.7) * 0.011 * motion
        : 0);

  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio, 1.75);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(width, height);
    this.bloomPass?.resolution.set(width, height);
  }

  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);

    const elapsed = (performance.now() - this.animationStartedAt) / 1_000;
    this.updateScreenState(elapsed);
    this.updateCamera(elapsed);
    this.updateEnvironment(elapsed);

    this.screenMaterial.uniforms.time.value = elapsed;
    this.atmospherePass.uniforms.time.value = elapsed;
    this.composer.render();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.onPointerMove,
    );
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.onPointerDown,
    );
    this.renderer.domElement.removeEventListener(
      "pointerleave",
      this.onPointerLeave,
    );

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) {
        return;
      }
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(object.material);
      }
    });
    this.screenTexture.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
