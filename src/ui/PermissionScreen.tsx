type PermissionScreenProps = {
  loading: boolean
  error: string | null
  isMockMode: boolean
  onActivate: () => void
}

const PermissionScreen = ({ loading, error, isMockMode, onActivate }: PermissionScreenProps) => {
  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[#05080f]/92 px-4 backdrop-blur-sm" data-ui-control="true">
      <section
        className="w-full max-w-2xl rounded-3xl border border-white/15 bg-gradient-to-br from-[#0d1420] to-[#0a0f18] p-8 text-white shadow-premium"
        aria-labelledby="permission-title"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-cyan-200/75">HAND AR POWERS</p>
        <h1 id="permission-title" className="mb-4 text-3xl font-semibold leading-tight text-white">
          Ative a camera para comecar
        </h1>

        <p className="mb-2 text-sm text-white/85">
          O processamento de maos acontece localmente no seu navegador. Nenhum video e enviado para servidor.
        </p>
        {isMockMode ? (
          <p className="mb-6 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
            Modo QA ativo: mock de maos habilitado (`VITE_MOCK_HANDS=1`).
          </p>
        ) : (
          <p className="mb-6 text-xs text-white/60">
            Dica: use boa iluminacao e mantenha a mao inteira visivel para maior estabilidade.
          </p>
        )}

        {error ? (
          <div
            className="mb-5 rounded-xl border border-red-300/35 bg-red-400/10 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            <p className="font-semibold">Nao foi possivel acessar a camera.</p>
            <p className="mt-1 text-red-100/90">{error}</p>
            <p className="mt-2 text-xs text-red-100/80">
              Verifique permissoes do navegador, HTTPS/localhost e se outra aba esta usando a camera.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onActivate}
            disabled={loading}
            className="rounded-xl border border-cyan-300/45 bg-cyan-500/20 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Ativar camera"
          >
            {loading ? 'Carregando modelo...' : 'Ativar camera'}
          </button>
          <p className="text-xs text-white/60">A qualquer momento voce pode revisar o tutorial no HUD.</p>
        </div>
      </section>
    </div>
  )
}

export default PermissionScreen
