import { useState, useEffect } from 'react'
import PortfolioBuilder from './PortfolioBuilder.jsx'
import BondPortfolioBuilder from './BondPortfolioBuilder.jsx'
import RiskQuestionnaire from './RiskQuestionnaire.jsx'
import Dashboard from './Dashboard.jsx'
import { createPortfolio, attachBondLeg } from './api.js'

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
// Dashboard. The Dashboard is a persistent hub, not the flow's terminus — from it, "Make new/
// additional portfolio" re-enters RPQ -> Equity -> Fixed Income for a separate, independently
// named portfolio, without discarding the ones already built. There's no login system, so "your
// portfolios" persistence is just the list of server-generated ids the browser keeps in
// localStorage; reopening the site with that list saved resumes straight at the Dashboard.
function App() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState('rpq') // 'rpq' | 'equity' | 'fi' | 'dashboard'
  const [rpq, setRpq] = useState(null) // { equityPct, fiPct, cash, equityAmount, fiAmount }
  const [portfolioId, setPortfolioId] = useState(null) // the one actively being built right now
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
    setStep('equity')
  }

  async function handleEquityBuyComplete(result) {
    try {
      const res = await createPortfolio({
        name: `Portfolio ${portfolioIds.length + 1}`,
        rpqEquityPct: rpq.equityPct,
        rpqFiPct: rpq.fiPct,
        equityBuyListId: result.buyListId,
      })
      setPortfolioId(res.id)
      persistIds([...portfolioIds, res.id])
      setStep('fi')
    } catch (err) {
      // The equity buy itself already succeeded and is safely saved server-side — only the
      // portfolio-linking step failed, so surface it rather than silently stranding the user.
      alert('Your equity portfolio was saved, but linking it to a combined portfolio failed: ' + err.message)
    }
  }

  async function handleBondBuyComplete(result) {
    try {
      await attachBondLeg(portfolioId, result.buyListId)
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
    return <RiskQuestionnaire theme={theme} setTheme={setTheme} onComplete={handleRpqComplete} initialEquityPct={prefillEquityPct} />
  }
  if (step === 'equity') {
    return <PortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleEquityBuyComplete} />
  }
  if (step === 'fi') {
    return <BondPortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleBondBuyComplete} />
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
