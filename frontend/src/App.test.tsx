import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('App Component', () => {
  it('should render the login form when not authenticated', () => {
    renderWithTheme(<App />);
    
    expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
  });

  it('should render the login form with password field', () => {
    renderWithTheme(<App />);
    
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.getByText('开发环境默认密码: admin123')).toBeInTheDocument();
  });
});