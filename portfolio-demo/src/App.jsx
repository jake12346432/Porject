import { useState, useEffect } from 'react'
import PortfolioBuilder from './PortfolioBuilder.jsx'
import BondPortfolioBuilder from './BondPortfolioBuilder.jsx'
import RiskQuestionnaire from './RiskQuestionnaire.jsx'
import Dashboard from './Dashboard.jsx'
import { createPortfolio, attachBondLeg, attachEquityLeg, updatePortfolioSplit } from './api.js'

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
// cash to invest) -> build and buy the Equity portion -> build and buy the Fixed Income portion ->
// Dashboard. A 0% target on either side skips that step entirely (see handleRpqComplete/
// handleEquityBuyComplete). The Dashboard is a persistent hub, not the flow's terminus — from it,
// "Make new/additional portfolio" re-enters RPQ -> Equity -> Fixed Income for a separate,
// independently named portfolio, without discarding the ones already built. There's no login
// system, so "your portfolios" persistence is just the list of server-generated ids the browser
// keeps in localStorage; reopening the site with that list saved resumes straight at the Dashboard.
function App() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState('rpq') // 'rpq' | 'equity' | 'fi' | 'dashboard'
  const [rpq, setRpq] = useState(null) // { equityPct, fiPct, cash, equityAmount, fiAmount }
  // The portfolio-in-progress isn't created server-side until its first leg is actually bought.
  // Once set, backing up and rebuying a leg PATCHes that same portfolio (see handleEquityBuyComplete/
  // handleBondBuyComplete) rather than creating a duplicate and orphaning the original.
  const [portfolioId, setPortfolioId] = useState(null)
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

  async function handleRpqComplete(pct) {
    setRpq(pct)
    // portfolioId is deliberately left as-is here (not reset) — if it's already set, that means
    // Equity (or Fixed Income, if Equity was skipped) was already bought once and someone backed
    // all the way up to RPQ and is resubmitting. The next leg they buy will PATCH that same
    // portfolio rather than orphaning it (see handleEquityBuyComplete/handleBondBuyComplete) — but
    // the target split itself needs syncing right away, since it's otherwise never touched again.
    if (portfolioId) {
      try {
        await updatePortfolioSplit(portfolioId, pct.equityPct, pct.fiPct)
      } catch (err) {
        alert('Failed to update this portfolio\'s target split: ' + err.message)
      }
    }
    // A 0% target on either side means that step has nothing to build — skip straight past it
    // rather than making someone sit through a screen where every amount would be zero.
    setStep(pct.equityPct === 0 ? 'fi' : 'equity')
  }

  async function handleEquityBuyComplete(result) {
    try {
      if (portfolioId) {
        // Revising: this portfolio already exists (from an earlier pass through this flow before
        // backing up), so re-point its equity leg rather than creating a duplicate.
        await attachEquityLeg(portfolioId, result.buyListId)
      } else {
        const res = await createPortfolio({
          name: `Portfolio ${portfolioIds.length + 1}`,
          rpqEquityPct: rpq.equityPct,
          rpqFiPct: rpq.fiPct,
          equityBuyListId: result.buyListId,
        })
        setPortfolioId(res.id)
        persistIds([...portfolioIds, res.id])
      }
      // Symmetric with the RPQ-time skip: a 0% Fixed Income target has nothing to build there.
      setStep(rpq.fiPct === 0 ? 'dashboard' : 'fi')
    } catch (err) {
      // The equity buy itself already succeeded and is safely saved server-side — only the
      // portfolio-linking step failed, so surface it rather than silently stranding the user.
      alert('Your equity portfolio was saved, but linking it to a combined portfolio failed: ' + err.message)
    }
  }

  async function handleBondBuyComplete(result) {
    try {
      if (portfolioId) {
        // Equity was built first in this pass (or on an earlier pass before backing up) — attach/
        // re-point Fixed Income on that same portfolio.
        await attachBondLeg(portfolioId, result.buyListId)
      } else {
        // Equity was skipped (0% target) — Fixed Income is this portfolio's first and only leg.
        const res = await createPortfolio({
          name: `Portfolio ${portfolioIds.length + 1}`,
          rpqEquityPct: rpq.equityPct,
          rpqFiPct: rpq.fiPct,
          bondBuyListId: result.buyListId,
        })
        setPortfolioId(res.id)
        persistIds([...portfolioIds, res.id])
      }
      setStep('dashboard')
    } catch (err) {
      alert('Your Fixed Income portfolio was saved, but linking it to your portfolio failed: ' + err.message)
    }
  }

  // Lets the Dashboard send someone back to finish a portfolio's Fixed Income leg if they left
  // after Equity (e.g. closed the tab and came back — the portfolio id survives, but in-memory rpq
  // state doesn't, so this recovers it from what the Dashboard just fetched from the server).
  // fiAmount is derived by the Dashboard from the equity leg's actual invested amount (the original
  // cash figure itself was never persisted — only the resulting split was) so the Fixed Income
  // step's target field still comes pre-filled rather than falling back to a generic default.
  function handleResumeFi(rpqEquityPct, rpqFiPct, id, fiAmount) {
    setRpq({ equityPct: rpqEquityPct, fiPct: rpqFiPct, cash: null, equityAmount: null, fiAmount })
    setPortfolioId(id)
    setStep('fi')
  }

  // Backing up from Equity to Risk profile. portfolioId is left untouched — if Equity was already
  // bought before backing up, it stays linked to that portfolio, and handleRpqComplete syncs the
  // target split server-side if it's changed on the way back through.
  function handleBackToRpq() {
    setStep('rpq')
  }

  // Backing up from Fixed Income — to Equity if this portfolio has one (the normal case), or all
  // the way to Risk profile if Equity was skipped (0% target, so there's no Equity step to return
  // to). portfolioId is left untouched so a rebuilt Equity leg re-points the same portfolio.
  function handleBackFromFi() {
    setStep(rpq && rpq.equityPct > 0 ? 'equity' : 'rpq')
  }

  // Starts an additional, independently named portfolio without discarding the ones already
  // built — the Dashboard's primary way of adding more once at least one exists.
  function handleMakeAdditional(prefillPct) {
    setRpq(null)
    setPortfolioId(null)
    setPrefillEquityPct(prefillPct ?? 60)
    setStep('rpq')
  }

  // A deliberately de-emphasized escape hatch (not the main path) — wipes every known portfolio id
  // from this browser and starts completely fresh.
  function handleStartOver() {
    localStorage.removeItem(PORTFOLIO_IDS_KEY)
    setPortfolioIds([])
    setPortfolioId(null)
    setRpq(null)
    setPrefillEquityPct(60)
    setStep('rpq')
  }

  if (step === 'rpq') {
    // If rpq is already set, this is a "back" navigation rather than a fresh start — show what
    // was previously entered instead of resetting to defaults. Cash itself was never persisted
    // server-side (only the resulting split was), so it falls back to a default whenever it's not
    // available (a genuinely fresh start, or backing up after a resumed-from-server session).
    return <RiskQuestionnaire theme={theme} setTheme={setTheme} onComplete={handleRpqComplete}
      initialEquityPct={rpq ? rpq.equityPct : prefillEquityPct}
      initialCash={rpq && rpq.cash != null ? rpq.cash : 10000} />
  }
  if (step === 'equity') {
    return <PortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleEquityBuyComplete} onBack={handleBackToRpq} />
  }
  if (step === 'fi') {
    return <BondPortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleBondBuyComplete} onBack={handleBackFromFi} />
  }
  return (
    <Dashboard
      theme={theme} setTheme={setTheme}
      portfolioIds={portfolioIds}
      onResumeFi={handleResumeFi}
      onMakeAdditional={handleMakeAdditional}
      onStartOver={handleStartOver}
    />
  )
}

export default App
