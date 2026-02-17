# Hand-Controlled Block Builder

Aplicacao web (frontend-only) para construir e editar blocos 3D usando webcam + hand tracking no navegador.

## Stack

- Vite + React + TypeScript
- Three.js (render e interacao 3D)
- Zustand (estado e historico)
- TailwindCSS (UI)
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) para rastreio de maos

## Funcionalidades principais

- Webcam com preview opcional e overlay de landmarks.
- Deteccao de uma ou duas maos em tempo real.
- Cursor 3D guiado por dedo indicador com suavizacao EMA.
- Modos:
  - `BUILD`: coloca blocos com pinch tap.
  - `ERASE`: apaga com pinch tap; fist apaga continuamente com rate limit.
  - `MOVE`: pinch hold inicia drag e pinch release solta.
  - `TEXT`: carimbo de texto usando fonte 5x7 (A-Z, 0-9, espaco).
- Menu radial por gesto (`open palm hold`) para trocar modo.
- Undo/Redo para place/erase/move/stamp.
- Persistencia:
  - Auto-save em LocalStorage (throttled).
  - Snapshots nomeados (save/load).
  - Export/Import JSON.
- Fallback de teste por mouse/teclado:
  - Clique esquerdo: acao do modo.
  - Clique direito: erase.
  - Modo move: clique e arraste.
  - Atalhos: `1-4` modos, `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Y` redo.

## Estrutura

```txt
src/
  app/App.tsx
  vision/
    handTracker.ts
    gestures.ts
    smoothing.ts
  world/
    voxelStore.ts
    voxelTypes.ts
    serialization.ts
    textStamp.ts
  three/
    SceneCanvas.tsx
    raycast.ts
    instancedVoxels.ts
    ghostPreview.ts
  ui/
    ModeBar.tsx
    RadialMenu.tsx
    TutorialModal.tsx
    Panels.tsx
    radialUtils.ts
  utils/
    throttle.ts
    math.ts
```

## Requisitos

- Node.js 20+ recomendado
- Browser moderno com WebGL e permissao de webcam

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

Opcional:

```bash
npm run lint
npm run format
```

## Uso rapido

1. Rode `npm run dev`.
2. Abra no navegador.
3. Permita acesso da webcam.
4. Ajuste qualidade (`low/medium/high`) e toggles no painel.
5. Use os gestos:
   - Pinch tap para confirmar acao do modo.
   - Pinch hold para drag.
   - Open palm hold para abrir radial.
   - Fist no modo erase para apagar em sequencia.

## Deploy (Vercel / estatico)

### Vercel

1. Importe o repo no Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

### Static hosting (Netlify/GitHub Pages/S3/etc.)

1. Rode `npm run build`.
2. Publique a pasta `dist`.

## Dicas de performance

- Use qualidade `low` em hardware fraco.
- Evite deixar preview/landmarks ligados se nao estiver calibrando.
- Reduza distancia/rotacao de camera para menos custo de render.
- O app ja usa:
  - limite de inferencia por FPS configuravel,
  - suavizacao EMA do cursor,
  - `InstancedMesh` para voxels,
  - atualizacao de estado com historico por diffs.

## Troubleshooting

- Webcam nao abre:
  - verifique permissao do navegador/OS;
  - use HTTPS ou `localhost`;
  - clique em `Reiniciar webcam/tracker` no painel.
- Tracking instavel:
  - melhore iluminacao;
  - use fundo menos poluido;
  - aproxime a mao e reduza qualidade para manter FPS.
- JSON import falha:
  - confirme schema `hand-builder-scene@1`.
