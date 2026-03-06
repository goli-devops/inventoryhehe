import React from 'react';
import { WMSProvider } from './context/WMSContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/layout/Layout';

function App() {
  return (
    <SettingsProvider>
      <WMSProvider>
        <Layout />
      </WMSProvider>
    </SettingsProvider>
  );
}

export default App;