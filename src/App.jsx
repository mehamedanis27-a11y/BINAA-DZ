import { useState, useEffect } from 'react'
import LandingPage from './components/LandingPage'
import Wizard from './components/Wizard'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [lang, setLang] = useState('fr')

  // Apply RTL direction based on language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Page routing
  const navigate = (page) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100dvh' }}>
      {currentPage === 'landing' && <LandingPage onNavigate={navigate} lang={lang} onLangChange={setLang} />}
      {currentPage === 'wizard' && <Wizard onNavigate={navigate} lang={lang} onLangChange={setLang} />}
    </div>
  )
}

export default App
