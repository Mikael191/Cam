# HAND AR POWERS

Aplicacao web front-end que usa webcam + hand tracking no navegador para invocar, carregar e lancar poderes elementais em tempo real.

## Stack

- Vite + React + TypeScript
- TailwindCSS
- Zustand
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Canvas2D para efeitos em screen-space (sem mundo 3D navegavel)

## O que o app faz

- Video da webcam em fullscreen.
- Detecta 1-2 maos com suavizacao (One Euro) e hysteresis de perda curta.
- Gestos com state machine:
  - `PINCH`: invocar/segurar/carregar/soltar
  - `OPEN PALM HOLD`: abre menu radial para escolher elemento
  - `FIST HOLD`: dissipar/cancelar
- 6 elementos com identidade visual:
  - Fogo, Gelo, Raio, Agua, Vento, Terra
- Lancamento com velocidade real baseada no movimento do indicador (janela de amostras).
- Colisao com bordas: quica 1x e dissipa.
- Fluxo de calibracao:
  - mao aberta por 2s
  - pinch 2x
- UI minimalista:
  - indicador do elemento
  - toggles debug/mini preview/espelho
  - qualidade (Low/Med/High)
  - delegate (GPU/CPU)
  - sliders de confianca

## Estrutura

```txt
src/
  App.tsx
  main.tsx
  index.css
  vision/
    handTracker.ts
    filters.ts
    gestures.ts
  powers/
    powerTypes.ts
    powerSystem.ts
    presets/
      index.ts
      fire.ts
      ice.ts
      lightning.ts
      water.ts
      wind.ts
      earth.ts
  render/
    VideoLayer.tsx
    EffectsCanvas.tsx
  ui/
    HUD.tsx
    RadialMenu.tsx
    TutorialModal.tsx
    CalibrateModal.tsx
  store/
    appStore.ts
  utils/
    math.ts
    throttle.ts
    time.ts
```

## Requisitos

- Node.js 20+
- Navegador moderno com webcam habilitada
- HTTPS ou `localhost` para permissao de camera

## Comandos

```bash
npm i
npm run dev
npm run build
npm run preview
```

Opcional:

```bash
npm run lint
npm run format
```

## Como usar

1. Rode `npm run dev`.
2. Abra no navegador e permita acesso da camera.
3. Clique em `Calibrar` para ajustar thresholds ao seu tamanho de mao.
4. Gestos:
   - Abra a mao (hold) para abrir menu radial e escolher elemento.
   - Belisque (indicador + dedao) para invocar o orb.
   - Segure o belisco para carregar.
   - Solte para lancar.
   - Feche o punho (hold) para dissipar tudo.

## Performance

- Default em `Low` (640x360, inferencia 24fps).
- Render roda separado da inferencia.
- Limites internos:
  - ate 50 projeteis ativos
  - pool de ate 6000 particulas
- Recomendacoes para PC fraco:
  - manter `Low`
  - desligar `Debug`
  - desligar `Mini preview`
  - usar delegate `GPU` quando disponivel

## Troubleshooting

- `Nao foi possivel iniciar camera`:
  - confirme permissao de webcam no browser/OS
  - use `localhost` ou HTTPS
- Tracking instavel:
  - ilumine melhor o ambiente
  - aproxime a mao da camera
  - rode calibracao novamente
  - ajuste sliders de confidence
- GPU indisponivel:
  - app troca para CPU automaticamente

## Deploy no Vercel (Vite estatico)

1. Suba o repo para o GitHub.
2. No Vercel, `Add New Project` e selecione o repo.
3. Configuracao:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

Tambem pode hospedar `dist/` em qualquer host estatico.
