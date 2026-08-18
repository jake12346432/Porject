import { useState, useEffect } from 'react'
import PortfolioBuilder from './PortfolioBuilder.jsx'
import BondPortfolioBuilder from './BondPortfolioBuilder.jsx'
import RiskQuestionnaire from './RiskQuestionnaire.jsx'
import PortfolioSummary from './PortfolioSummary.jsx'
import Dashboard from './Dashboard.jsx'

const PORTFOLIO_IDS_KEY = 'tw_portfolio_ids'

function loadPortfolioIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(PORTFOLIO_IDS_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// Guided flow: RPQ (mock risk questionnaire — a target Equity/Fixed Income % split plus how much
// cash to invest) -> build the Equity portion -> build the Fixed Income portion -> Portfolio
// Summary -> Dashboard. A 0% target on either side skips that step entirely (see
// handleRpqComplete/handleEquityDraftComplete). Equity and Fixed Income no longer buy anything
// themselves — each just hands back a draft (unpriced holdings + a target amount) via
// onBuyComplete, which this component holds as equityDraft/bondDraft until both are built (or
// skipped). Nothing is priced, sized, or saved server-side until Summary's single "Buy portfolio"
// button fires, which prices and persists both legs together as one combined order and links them
// into one portfolio record. The Dashboard is a persistent hub, not the flow's terminus — from it,
// "Make new/additional portfolio" re-enters RPQ -> Equity -> Fixed Income -> Summary for a
// separate, independently named portfolio, without discarding the ones already built. There's no
// login system, so "your portfolios" persistence is just the list of server-generated ids the
// browser keeps in localStorage; reopening the site with that list saved resumes straight at the
// Dashboard.
function App() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState('rpq') // 'rpq' | 'equity' | 'fi' | 'summary' | 'dashboard'
  const [rpq, setRpq] = useState(null) // { equityPct, fiPct, cash, equityAmount, fiAmount }
  const [equityDraft, setEquityDraft] = useState(null) // { portfolioName, dollarAmount, holdings }
  const [bondDraft, setBondDraft] = useState(null) // { portfolioName, poundAmount, holdings, skippedCount }
  // Only set when resuming an equity-only portfolio built under the old immediate-buy flow (see
  // handleResumeFi) — Summary uses this to PATCH the bond leg onto that existing portfolio instead
  // of creating a new one, since there's no equityDraft to combine it with in that case.
  const [resumePortfolioId, setResumePortfolioId] = useState(null)
  const [portfolioIds, setPortfolioIds] = useState([]) // every portfolio this browser has made
  const [prefillEquityPct, setPrefillEquityPct] = useState(60)

  useEffect(() => {
    const saved = loadPortfolioIds()
    if (saved.length) {
      setPortfolioIds(saved)
      setStep('dashboard')
    }
  }, [])

  function persistIds(ids) {
    localStorage.setItem(PORTFOLIO_IDS_KEY, JSON.stringify(ids))
    setPortfolioIds(ids)
  }

  function handleRpqComplete(pct) {
    setRpq(pct)
    // A 0% target on either side means that step has nothing to build — skip straight past it
    // rather than making someone sit through a screen where every amount would be zero.
    setStep(pct.equityPct === 0 ? 'fi' : 'equity')
  }

  function handleEquityDraftComplete(draft) {
    setEquityDraft(draft)
    // Symmetric with the RPQ-time skip: a 0% Fixed Income target has nothing to build there.
    setStep(rpq.fiPct === 0 ? 'summary' : 'fi')
  }

  function handleBondDraftComplete(draft) {
    setBondDraft(draft)
    setStep('summary')
  }

  // Fires once Summary's combined buy succeeds (or, in the resume-fi case, once the bond leg is
  // PATCHed onto the existing portfolio) — adds the portfolio id to this browser's known list and
  // moves on to the Dashboard.
  function handlePortfolioComplete(id) {
    if (!portfolioIds.includes(id)) persistIds([...portfolioIds, id])
    setEquityDraft(null)
    setBondDraft(null)
    setResumePortfolioId(null)
    setStep('dashboard')
  }

  // Lets the Dashboard send someone back to finish a portfolio's Fixed Income leg if they left
  // after Equity (e.g. closed the tab and came back — the portfolio id survives, but in-memory rpq
  // state doesn't, so this recovers it from what the Dashboard just fetched from the server). This
  // portfolio predates the deferred-Summary flow (equity was already priced and saved directly), so
  // there's no equityDraft to rebuild — only the Fixed Income leg needs completing, and Summary
  // PATCHes it onto this same portfolio via resumePortfolioId rather than creating a new one.
  function handleResumeFi(rpqEquityPct, rpqFiPct, id, fiAmount) {
    setRpq({ equityPct: rpqEquityPct, fiPct: rpqFiPct, cash: null, equityAmount: null, fiAmount })
    setEquityDraft(null)
    setBondDraft(null)
    setResumePortfolioId(id)
    setStep('fi')
  }

  // Backing up from Equity to Risk profile, or from Fixed Income to Equity (if this portfolio has
  // one) or Risk profile (if Equity was skipped). Drafts are left as-is — nothing is discarded by
  // backing up, only by actually rebuilding a step.
  function handleBackToRpq() {
    setStep('rpq')
  }
  function handleBackFromFi() {
    setStep(rpq && rpq.equityPct > 0 ? 'equity' : 'rpq')
  }
  function handleBackFromSummary() {
    setStep(rpq && rpq.fiPct > 0 ? 'fi' : rpq && rpq.equityPct > 0 ? 'equity' : 'rpq')
  }

  // Starts an additional, independently named portfolio without discarding the ones already
  // built — the Dashboard's primary way of adding more once at least one exists.
  function handleMakeAdditional(prefillPct) {
    setRpq(null)
    setEquityDraft(null)
    setBondDraft(null)
    setResumePortfolioId(null)
    setPrefillEquityPct(prefillPct ?? 60)
    setStep('rpq')
  }

  // A deliberately de-emphasized escape hatch (not the main path) — wipes every known portfolio id
  // from this browser and starts completely fresh.
  function handleStartOver() {
    localStorage.removeItem(PORTFOLIO_IDS_KEY)
    setPortfolioIds([])
    setEquityDraft(null)
    setBondDraft(null)
    setResumePortfolioId(null)
    setRpq(null)
    setPrefillEquityPct(60)
    setStep('rpq')
  }

  // Clicking a breadcrumb step jumps straight there without discarding any drafts already built —
  // only steps the FlowBreadcrumb itself decided are reachable (see reachableSteps below) are ever
  // offered as clickable, so this never needs to re-derive that.
  function handleStepClick(key) {
    setStep(key)
  }

  // A step is worth offering in the breadcrumb once its data actually exists to show/continue —
  // jumping to a step with nothing behind it (e.g. Fixed Income before Risk profile ran, or
  // Summary before either leg is drafted) isn't offered.
  const reachableSteps = new Set(['rpq'])
  if (rpq && rpq.equityPct > 0) reachableSteps.add('equity')
  if (rpq && rpq.fiPct > 0) reachableSteps.add('fi')
  if (rpq && (equityDraft || bondDraft)) reachableSteps.add('summary')
  if (portfolioIds.length > 0) reachableSteps.add('dashboard')

  if (step === 'rpq') {
    // If rpq is already set, this is a "back" navigation rather than a fresh start — show what
    // was previously entered instead of resetting to defaults. Cash itself was never persisted
    // server-side (only the resulting split was), so it falls back to a default whenever it's not
    // available (a genuinely fresh start, or backing up after a resumed-from-server session).
    return <RiskQuestionnaire theme={theme} setTheme={setTheme} onComplete={handleRpqComplete}
      initialEquityPct={rpq ? rpq.equityPct : prefillEquityPct}
      initialCash={rpq && rpq.cash != null ? rpq.cash : 10000}
      onStepClick={handleStepClick} reachableSteps={reachableSteps} />
  }
  if (step === 'equity') {
    return <PortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleEquityDraftComplete} onBack={handleBackToRpq}
      onStepClick={handleStepClick} reachableSteps={reachableSteps} />
  }
  if (step === 'fi') {
    return <BondPortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleBondDraftComplete} onBack={handleBackFromFi}
      onStepClick={handleStepClick} reachableSteps={reachableSteps} />
  }
  if (step === 'summary') {
    return <PortfolioSummary theme={theme} setTheme={setTheme} rpq={rpq} equityDraft={equityDraft} bondDraft={bondDraft}
      resumePortfolioId={resumePortfolioId} onComplete={handlePortfolioComplete} onBack={handleBackFromSummary}
      onStepClick={handleStepClick} reachableSteps={reachableSteps} />
  }
  return (
    <Dashboard
      theme={theme} setTheme={setTheme}
      portfolioIds={portfolioIds}
      onResumeFi={handleResumeFi}
      onMakeAdditional={handleMakeAdditional}
      onStartOver={handleStartOver}
      onStepClick={handleStepClick} reachableSteps={reachableSteps}
    />
  )
}

export default App
