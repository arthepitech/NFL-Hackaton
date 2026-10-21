// Visualisation 3D du terrain NFL avec Three.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const FIELD_LEN = 120; // yards (avec zones d'en-but)
const FIELD_WID = 53.3;

// Conversion coordonnées NFL (x: 0-120, y: 0-53.3) -> espace 3D centré
function toWorld(x, y) {
  return [x - FIELD_LEN / 2, 0, -(y - FIELD_WID / 2)];
}

export class Field3D {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || 800;
    this.height = Math.max(420, Math.round(this.width * 0.5));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 90, 180);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 500);
    this.camViews = [
      { pos: [0, 55, 70], look: [0, 0, 0] },      // vue haute arrière
      { pos: [0, 90, 2], look: [0, 0, 0] },       // vue tactique (dessus)
      { pos: [-70, 25, 0], look: [0, 0, 0] },     // vue latérale
    ];
    this.camIndex = 0;
    this._applyCam(0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 160;

    this._buildLights();
    this._buildField();

    this.playerMeshes = new Map(); // nflId -> mesh
    this.ballMesh = null;
    this.colors = { offense: "#ff5c5c", defense: "#4d9fff" };

    this._animate = this._animate.bind(this);
    this._animate();

    window.addEventListener("resize", () => this._onResize());
  }

  _applyCam(i) {
    const v = this.camViews[i];
    this.camera.position.set(...v.pos);
    this.camera.lookAt(...v.look);
  }

  cycleCamera() {
    this.camIndex = (this.camIndex + 1) % this.camViews.length;
    const v = this.camViews[this.camIndex];
    this.camera.position.set(...v.pos);
    if (this.controls) this.controls.target.set(...v.look);
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(30, 80, 40);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -80;
    dir.shadow.camera.right = 80;
    dir.shadow.camera.top = 80;
    dir.shadow.camera.bottom = -80;
    this.scene.add(dir);
  }

  _buildField() {
    const group = new THREE.Group();

    // pelouse
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_LEN, FIELD_WID),
      new THREE.MeshStandardMaterial({ color: 0x0f4d20, roughness: 0.95 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    group.add(grass);

    // bandes alternées de pelouse
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) continue;
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(10, FIELD_WID),
        new THREE.MeshStandardMaterial({ color: 0x0d4420, roughness: 0.95 })
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * 10 - FIELD_LEN / 2 + 5, 0.01, 0);
      group.add(stripe);
    }

    // zones d'en-but
    const ezMat = new THREE.MeshStandardMaterial({ color: 0x0a3317, roughness: 0.9 });
    [-(FIELD_LEN / 2 - 5), FIELD_LEN / 2 - 5].forEach((cx) => {
      const ez = new THREE.Mesh(new THREE.PlaneGeometry(10, FIELD_WID), ezMat);
      ez.rotation.x = -Math.PI / 2;
      ez.position.set(cx, 0.02, 0);
      group.add(ez);
    });

    // lignes tous les 5 yards
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for (let yd = 10; yd <= 110; yd += 5) {
      const x = yd - FIELD_LEN / 2;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.05, -FIELD_WID / 2),
        new THREE.Vector3(x, 0.05, FIELD_WID / 2),
      ]);
      group.add(new THREE.Line(geo, lineMat));
    }
    // bordures
    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-FIELD_LEN / 2, 0.05, -FIELD_WID / 2),
        new THREE.Vector3(FIELD_LEN / 2, 0.05, -FIELD_WID / 2),
        new THREE.Vector3(FIELD_LEN / 2, 0.05, FIELD_WID / 2),
        new THREE.Vector3(-FIELD_LEN / 2, 0.05, FIELD_WID / 2),
      ]),
      new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.8, transparent: true })
    );
    group.add(border);

    this.scene.add(group);
    this.field = group;
  }

  setColors(colors) {
    // colors: { offense: {primary}, defense: {primary} }
    this.colors = {
      offense: colors?.offense?.primary || "#ff5c5c",
      defense: colors?.defense?.primary || "#4d9fff",
    };
  }

  _makePlayer(side) {
    const color = side === "offense" ? this.colors.offense : this.colors.defense;
    const g = new THREE.Group();
    // corps = cylindre, tête = sphère -> silhouette simple de joueur
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 2.4, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    );
    body.position.y = 1.2;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0d9b5, roughness: 0.7 })
    );
    head.position.y = 2.7;
    head.castShadow = true;
    g.add(body);
    g.add(head);
    return g;
  }

  _makeBall() {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a3b10, emissive: 0x3a1c05 })
    );
    ball.scale.set(1.5, 0.9, 0.9);
    ball.castShadow = true;
    return ball;
  }

  // Positionne les joueurs selon une frame
  renderFrame(frame) {
    if (!frame) return;
    const seen = new Set();
    for (const p of frame.players) {
      if (p.x == null || p.y == null) continue;
      const [wx, , wz] = toWorld(p.x, p.y);
      if (p.side === "ball") {
        if (!this.ballMesh) {
          this.ballMesh = this._makeBall();
          this.scene.add(this.ballMesh);
        }
        this.ballMesh.position.set(wx, 0.8, wz);
        continue;
      }
      const key = p.nflId;
      seen.add(key);
      let mesh = this.playerMeshes.get(key);
      if (!mesh) {
        mesh = this._makePlayer(p.side);
        mesh.userData.side = p.side;
        this.scene.add(mesh);
        this.playerMeshes.set(key, mesh);
      }
      mesh.position.set(wx, 0, wz);
      // oriente le joueur dans le sens du mouvement (approx via s>0)
      mesh.visible = true;
    }
    // masque les joueurs absents de cette frame
    for (const [key, mesh] of this.playerMeshes) {
      mesh.visible = seen.has(key);
    }
  }

  reset() {
    for (const mesh of this.playerMeshes.values()) this.scene.remove(mesh);
    this.playerMeshes.clear();
    if (this.ballMesh) {
      this.scene.remove(this.ballMesh);
      this.ballMesh = null;
    }
  }

  _onResize() {
    if (!this.container.clientWidth) return;
    this.width = this.container.clientWidth;
    this.height = Math.max(420, Math.round(this.width * 0.5));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  _animate() {
    requestAnimationFrame(this._animate);
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
