import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import FinancePreviewRoutes from '@/pages/FinancePreview/FinancePreviewRoutes';
import '../index.css';

// Independent static entry. Never imports App, authentication or live providers.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><FinancePreviewRoutes /></BrowserRouter></React.StrictMode>,
);
