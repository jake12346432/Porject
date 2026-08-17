import { useState } from 'react'
import PortfolioBuilder from './PortfolioBuilder.jsx'
import BondPortfolioBuilder from './BondPortfolioBuilder.jsx'

function App() {
  // Equity is the default/first tab — it's the primary, longer-established product;
  // fixed income is the newer add-on. Theme is shared across both so switching tabs
  // never resets whether you were in light or dark mode.
  const [activeTab, setActiveTab] = useState('equity')
  const [theme, setTheme] = useState('dark')

  return activeTab === 'equity'
    ? <PortfolioBuilder theme={theme} setTheme={setTheme} activeTab={activeTab} onSwitchTab={setActiveTab} />
    : <BondPortfolioBuilder theme={theme} setTheme={setTheme} activeTab={activeTab} onSwitchTab={setActiveTab} />
}

export default App
