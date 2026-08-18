import { useState, useEffect } from 'react'
import PortfolioBuilder from './PortfolioBuilder.jsx'
import BondPortfolioBuilder from './BondPortfolioBuilder.jsx'
import RiskQuestionnaire from './RiskQuestionnaire.jsx'
import Dashboard from './Dashboard.jsx'
import { createPortfolio, attachBondLeg } from './api.js'

const PORTFOLIO_ID_KEY = 'tw_portfolio_id'

// Guided flow: RPQ (mock risk questionnaire, just an Equity/Fixed Income % split) -> build and buy
// the Equity portion -> build and buy the Fixed Income portion -> Dashboard showing both, with
// sell buttons. This replaced the old free-standing Equity/Fixed Income tabs entirely — there's no
// login system, so "your portfolio" persistence is just a server-generated id kept in
// localStorage; reopening the site with that id saved resumes straight at the Dashboard.
function App() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState('rpq') // 'rpq' | 'equity' | 'fi' | 'dashboard'
  const [rpq, setRpq] = useState(null) // { equityPct, fiPct }
  const [portfolioId, setPortfolioId] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(PORTFOLIO_ID_KEY)
    if (saved) {
      setPortfolioId(saved)
      setStep('dashboard')
    }
  }, [])

  function handleRpqComplete(pct) {
    setRpq(pct)
    setStep('equity')
  }

  async function handleEquityBuyComplete(result) {
    try {
      const res = await createPortfolio({
        rpqEquityPct: rpq.equityPct,
        rpqFiPct: rpq.fiPct,
        equityBuyListId: result.buyListId,
      })
      localStorage.setItem(PORTFOLIO_ID_KEY, res.id)
      setPortfolioId(res.id)
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

  // Lets the Dashboard send someone back to finish the Fixed Income leg if they left after Equity
  // (e.g. closed the tab and came back — the portfolio id survives, but in-memory rpq state
  // doesn't, so this recovers it from what the Dashboard just fetched from the server).
  function handleResumeFi(rpqEquityPct, rpqFiPct) {
    setRpq({ equityPct: rpqEquityPct, fiPct: rpqFiPct })
    setStep('fi')
  }

  function handleStartOver() {
    localStorage.removeItem(PORTFOLIO_ID_KEY)
    setPortfolioId(null)
    setRpq(null)
    setStep('rpq')
  }

  if (step === 'rpq') {
    return <RiskQuestionnaire theme={theme} setTheme={setTheme} onComplete={handleRpqComplete} />
  }
  if (step === 'equity') {
    return <PortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleEquityBuyComplete} />
  }
  if (step === 'fi') {
    return <BondPortfolioBuilder theme={theme} setTheme={setTheme} rpq={rpq} onBuyComplete={handleBondBuyComplete} />
  }
  return <Dashboard theme={theme} setTheme={setTheme} portfolioId={portfolioId} onResumeFi={handleResumeFi} onStartOver={handleStartOver} />
}

export default App
