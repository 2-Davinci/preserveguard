import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

// 1. Import TanStack Query tools
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// 2. Create a client instance
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 3. Wrap your App */}
  
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    
  </React.StrictMode>,
);