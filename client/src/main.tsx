import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App as AntdApp } from 'antd';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { FeedbackInit } from './utils/feedback';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AntdApp>
        <FeedbackInit />
        <AuthProvider>
          <App />
        </AuthProvider>
      </AntdApp>
    </BrowserRouter>
  </StrictMode>,
);
