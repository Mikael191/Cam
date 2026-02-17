# HAND AR POWERS

Aplicacao web de computer vision no navegador para invocar, carregar e lancar poderes elementais usando apenas a webcam e gestos de mao.

## Principais destaques

- Webcam fullscreen com overlay de efeitos em tempo real.
- Hand tracking com MediaPipe Tasks Vision (modo VIDEO) + smoothing One Euro + outlier rejection.
- Gestos robustos com state machine e hysteresis:
  - `PINCH TAP`: invocar/soltar rapido
  - `PINCH HOLD`: segurar/carregar
  - `OPEN PALM HOLD`: abrir menu radial
  - `FIST HOLD`: cancelar/dissipar
- Pipeline de calibracao rapido:
  - mao aberta por 2s
  - pinch 2x para ajustar thresholds
- 6 elementos com identidade visual:
  - fogo, gelo, raio, agua, vento e terra
- Fallback profissional de QA/acessibilidade:
  - modo mouse/teclado com atalhos
  - smoke E2E em modo mock sem camera fisica

## Stack

- Vite + React + TypeScript
- TailwindCSS
- Zustand
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Canvas2D para efeitos screen-space
- Vitest (unit)
- Playwright (smoke e2e)

## Estrutura

```txt
src/
  App.tsx
  main.tsx
  index.css
  core/
    appStore.ts
    logger.ts
  vision/
    handGeometry.ts
    handTracker.ts
    mockTracker.ts
    filters.ts
    gestures.ts
    gestures.test.ts
  powers/
    powerTypes.ts
    powerSystem.ts
    presets/
      fire.ts
      ice.ts
      lightning.ts
      water.ts
      wind.ts
      earth.ts
      index.ts
  render/
    VideoLayer.tsx
    EffectsCanvas.tsx
  ui/
    PermissionScreen.tsx
    HUD.tsx
    RadialMenu.tsx
    TutorialModal.tsx
    CalibrateModal.tsx
  utils/
    math.ts
    throttle.ts
    time.ts
tests/
  app.smoke.spec.ts
```

## Como rodar

```bash
npm i
npm run dev
```

## Build e qualidade

```bash
npm run lint
npm run build
npm run test:unit
npm run test:e2e
npm run test
```

## Uso (fluxo recomendado)

1. Abra o app e clique em **Ativar camera**.
2. Rode **Calibrar** (mao aberta 2s + pinch 2x).
3. Use os gestos:
   - Abra a mao (hold) para escolher elemento no radial.
   - Pinch para invocar.
   - Segure pinch para carregar.
   - Solte para lancar.
   - Feche punho (hold) para cancelar.

## Fallback mouse/teclado (Debug Input)

Ative `Mouse/Teclado` no HUD:

- Mouse esquerdo: invocar/segurar/soltar
- Mouse direito: dissipar
- Teclas `1..6`: trocar elemento
- Tecla `X`: dissipar
- Tecla `H`: abrir tutorial
- Tecla `L`: abrir/fechar logs

## Feature flags

- `VITE_MOCK_HANDS=1`

Usa tracker mock sem camera real (ideal para QA e E2E).

## Performance

- Inferencia desacoplada do render:
  - inferencia 24-30fps (qualidade Low/Med/High)
  - render ate 60fps
- Lazy load do tracker/modelo apos clicar em **Ativar camera**
- Pool de particulas com limite fixo
- Grace period de 250ms para perda curta de tracking (sem teleporte)

## Seguranca e deploy

- Metadados completos (title, description, OG, favicon).
- Headers de seguranca em `vite.config.ts` (dev/preview) e `vercel.json` (deploy):
  - CSP
  - Permissions-Policy (camera)
  - Referrer-Policy
  - X-Content-Type-Options

### Deploy na Vercel (Vite estatico)

1. Conecte o repositorio na Vercel.
2. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy.

## Troubleshooting

- **Permissao negada**: libere camera no navegador e tente novamente.
- **Camera ocupada**: feche apps/abas que usam webcam.
- **Tracking instavel**: melhore iluminacao, aproxime a mao e rode calibracao.
- **FPS baixo**: use qualidade `Low`, desligue `Debug landmarks` e `Mini preview`.

## Privacidade

O video e processado localmente no navegador. O app nao envia stream de camera para backend.
