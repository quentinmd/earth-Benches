import React, { useState } from 'react';
import Header from './components/Header';
import BenchMap from './components/BenchMap';
import BenchList from './components/BenchList';
import AddBenchButton from '../../../src/components/AddBenchButton';

function App() {
  const [activeView, setActiveView] = useState('map'); // 'map' ou 'list'
  
  return (
    <div className="app">
      <Header onViewChange={setActiveView} activeView={activeView} />
      <main className="main-content">
        {activeView === 'map' ? (
          <BenchMap />
        ) : (
          <BenchList />
        )}
        <AddBenchButton />
      </main>
    </div>
  );
}

export default App;