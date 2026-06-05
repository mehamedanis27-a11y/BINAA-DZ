import Wizard from './components/Wizard'

/*
 * App — Root shell for BINAA
 * Clean mobile-first layout. All logic lives in <Wizard />.
 */
function App() {
  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <Wizard />
    </div>
  )
}

export default App
