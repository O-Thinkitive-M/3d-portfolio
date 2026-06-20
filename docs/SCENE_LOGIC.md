# AI Developer Brain — Scene Logic

> **Last updated:** Scene 2 redesign — 4-cluster skill network, orbiting sub-nodes, energy links, hover HTML panels

---

## Architecture Overview

| File | Purpose |
|------|---------|
| `src/store/scrollStore.ts` | Module-level scroll state. Wheel + touch events update `targetProgress` (0–1). R3F `useFrame` lerps `progress` toward it at 0.04/frame. |
| `src/App.tsx` | Root: R3F Canvas + HUD overlay. Calls `initScrollEvents()` on mount. |
| `src/components/Portfolio.tsx` | Camera waypoint system. 9 `[x,y,z]` waypoints lerped by scroll. Renders all scenes. |
| `src/components/ui/HUD.tsx` | React HTML overlay: progress bar, nav dots, scene tag, scene-1 hero title, scroll hint, CTA. |
| `src/components/scenes/Scene*.tsx` | One component per scene. Each hides itself (`group.visible`) when camera is >1.8 scene-units away. |

---

## World Layout

Camera travels **vertically** (Y axis). Each scene center:

| Scene | Y Position | Camera Waypoint |
|-------|-----------|-----------------|
| 1 Entry | 0 | [0, 3, 12] |
| 2 Skills | -20 | [0, -17, 10] |
| 3 Microservices | -40 | [2, -37, 12] |
| 4 LLM Core | -60 | [0, -57, 8] |
| 5 RAG Pipeline | -80 | [-1, -77, 13] |
| 6 Full Stack | -100 | [0, -97, 16] |
| 7 Projects | -120 | [1, -117, 11] |
| 8 Mindset | -140 | [0, -137, 11] |
| 9 CTA | -160 | [0, -157, 9] |

---

## Scene 1 — Entry (Neural Brain)

**Status:** ✅ Redesigned

### Visual Layer Stack (center → outer)

1. **Dark core sphere** `r=1.45` — `meshPhongMaterial`, color `#010614`, emissive `#001a33`, blue specular highlight
2. **Neural edge mesh** (LineSegments) — 30 edges of a base icosahedron at `r=1.5`; single shared `LineBasicMaterial` with `AdditiveBlending`; opacity pulses via `sin(t*1.8)` in `useFrame`
3. **Inner wireframe shell** `r=1.52` detail-2 — cyan, additive, `opacity=0.14`
4. **Outer wireframe shell** `r=1.72` detail-3 — purple, additive, `opacity=0.08`
5. **Vertex firing nodes** (InstancedMesh ×12) — each icosahedron vertex hosts a small sphere; fires with `sin(t*1.8 + i*0.72)`, alternates cyan/purple via HSL colors
6. **Glow halo tight** `r=1.82` — cyan, `BackSide`, additive, breathes with brain
7. **Glow halo mid** `r=2.4` — cyan, `BackSide`, additive, softer
8. **Glow halo outer** `r=3.2` — purple, `BackSide`, additive, very faint
9. **Three orbital torus rings** — radius 2.85/3.35/3.85, different tilt axes + rotation speeds
10. **Six data packets** — `THREE.CatmullRomCurve3` curved orbits, speed offset per packet
11. **Sparkles** — 70 blue + 35 purple, ambient
12. **Grid floor** — wireframe plane, fades as `progress` increases

### Interactions

| Trigger | Effect |
|---------|--------|
| Mouse move | `brainRef` group tilts ±0.28 rad (smooth lerp 0.06) toward cursor — parallax |
| Scroll | Grid opacity fades; camera zooms forward through rings; hero title fades out |
| Auto | Brain slow-spins +0.06 rad/s on Y; halos breathe; edges pulse; nodes fire in sequence |

### Title Display

The main title **"Inside My AI Developer Brain"** is rendered in **HTML** (via `HUD.tsx`), NOT in the 3D scene. This ensures it:
- Is never clipped by orbital rings or grid lines
- Renders at full CSS crispness (no 3D text rendering artifacts)
- Smoothly fades out as user scrolls (opacity driven by `progress * 12`)

---

## Scene 2 — Core Skill Network

**Status:** ✅ Redesigned

### Layout

```
  AI & LLM (ico)          Backend (octa)
       [-4.2, 1.5]    [center]   [4.2, 1.5]
  Frontend (tetra)        DevOps (dodeca)
       [-4.2, -2.5]            [4.2, -2.5]
```

### Visual Layer Stack (per cluster)

1. **Sub-orbit ring** — skill-count mini dots orbit the hub; `SubOrbit` group rotates Y+Z
2. **Hub geometry** — unique per cluster: ico/octa/tetra/dodeca; `meshPhongMaterial` dark core + emissive color
3. **Wireframe shell** — slightly larger matching geometry; `AdditiveBlending`; opacity doubles on hover
4. **Glow halo** — `sphereGeometry` BackSide additive; breathes in `useFrame`; 2.5× brighter on hover
5. **Hover scale** — `groupRef.scale` lerps to 1.14 on hover via `scaleRef`

### Clusters

| Cluster | Color | Geometry | Skills |
|---------|-------|----------|--------|
| AI & LLM Systems | `#8b5cf6` | Icosahedron | LLM Integration, Vector DBs, Prompt Engineering, AI System Design |
| Backend & System Design | `#00d4ff` | Octahedron | Java/Spring Boot, Scalable API Design, Database Engineering |
| Frontend Engineering | `#38bdf8` | Tetrahedron | React & Angular, TypeScript & JS |
| DevOps & SDLC | `#4ade80` | Dodecahedron | Git/VC, CI/CD Pipelines, Cloud Platforms |

### Central Hub

- Rotating `icosahedronGeometry` `r=0.58` with dual wireframe shells (cyan detail-2 + purple detail-1)
- Two breathing glow halos (cyan r=1.05, purple r=1.65)
- Sparkles × 22

### Connections

- 4 **center → cluster** `EnergyLink`s — animated `LineBasicMaterial` + moving packet sphere
- 2 **cross-links**: AI ↔ Backend (purple), Frontend ↔ DevOps (cyan)
- Total: 6 energy links, each with independent packet speed

### Interactions

| Trigger | Effect |
|---------|--------|
| Hover cluster hub | Hub scales to 1.14×, emissive 0.85→1.5, halo opacity ×3, wireframe opacity 0.28→0.52 |
| Hover cluster hub | `<Html>` panel appears above cluster — shows full skill list with sub-labels |
| Auto | Sub-skill dots orbit each hub (different speeds), energy packets travel connections |
| Auto | Central hub slow-spins; all halos breathe at different rates |

---

## Scene 3 — Microservices

**Status:** ✅ Complete

- 7 service boxes: LB → Gateway → [User, Order, Notify] → [UserDB, OrderDB]
- `DataPacket` components move along service-to-service paths
- "Trigger Scale-Out" button duplicates Order Service with `Replica ×N` labels
- Layer labels on left: Ingress / Business / Data

---

## Scene 4 — LLM Core

**Status:** ✅ Complete

- 60 embedding particles scattered in 3D vector space
- Central LLM sphere (octahedron wireframe + glowing sphere)
- "Run Query Demo" button triggers 6-stage animated pipeline:
  `Query → Embed → Search → Retrieve → Generate → Respond`
- During Retrieve: 8 pre-selected embeddings converge toward LLM + lines drawn
- Stage indicator bar at bottom

---

## Scene 5 — RAG Pipeline

**Status:** ✅ Complete

- 6 stage boxes: Data → Embeddings → Vector DB → Retrieval → LLM → Response
- "Run RAG Pipeline" animates a packet moving step-by-step
- Document ranking visualization appears after Retrieve step (4 ranked doc chips)
- Technical notes below each stage (chunk strategy, vector dims, etc.)

---

## Scene 6 — Full Stack Connection

**Status:** ✅ Complete

- 6 nodes on a circle (radius 4): UI → API → Services → DB → LLM → Response
- "Trigger Full Cycle" starts cyclic highlight stepping through nodes at 700ms intervals
- Orbiting data packet moves along the ring during flow

---

## Scene 7 — Projects as Systems

**Status:** ✅ Complete

- 3 project clusters: AI RAG Assistant | Microservice Platform | LLM API Platform
- Each cluster: core octahedron + 3 mini architecture nodes
- Click → expands detail panel (stack tags, features, AI usage)

---

## Scene 8 — Engineering Mindset

**Status:** ✅ Complete

- Central icosahedron "Engineer" node
- 4 dodecahedrons orbiting on a 3D elliptical path: Scalability / Performance / Maintainability / System Design
- Background floating concept text: CAP Theorem, CQRS, Circuit Breaker, etc.
- Two orbit rings (different tilt planes)

---

## Scene 9 — CTA

**Status:** ✅ Complete

- 80 particles that start scattered and "stabilize" onto a concentric circle as user arrives
- 3 spinning rings (different radii and axes)
- Stats: 3+ years backend / 10+ AI projects / 12+ microservices
- CTA buttons: Get In Touch | View GitHub | LinkedIn (in HUD HTML panel)

---

## Performance Notes

- All glow layers use `depthWrite={false}` + `THREE.AdditiveBlending` — no z-fighting
- `InstancedMesh` for Scene 1 vertex nodes (12 instances, single draw call)
- `visible = dist < 1.8` per scene group — off-screen scenes not rendered
- `dpr={[1, 1.5]}` on Canvas — limits pixel ratio on high-DPI screens
- No postprocessing — glow is faked via multiple additive-blended transparent shells

---

## Known Patterns / Conventions

```typescript
// Scroll-driven visibility check (used in every scene)
useFrame(() => {
  const dist = Math.abs(scrollStore.progress * 8 - SCENE_INDEX)
  groupRef.current.visible = dist < 1.8
})

// Scene index mapping: progress * 8 → 0-8 range
// Scene 1 = index 0, Scene 9 = index 8
```

```typescript
// Additive glow material (standard pattern)
<meshBasicMaterial
  color="#00d4ff"
  transparent
  opacity={0.05}
  side={THREE.BackSide}
  blending={THREE.AdditiveBlending}
  depthWrite={false}
/>
```
