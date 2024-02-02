import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/FT4 Demo App/i);
  expect(headerElement).toBeInTheDocument();
});
