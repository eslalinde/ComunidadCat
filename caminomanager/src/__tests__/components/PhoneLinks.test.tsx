import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PhoneLinks } from '@/components/ui/phone-links';

describe('PhoneLinks', () => {
  it('renders a call link and a WhatsApp link for mobiles', () => {
    render(<PhoneLinks number="300 123 4567" whatsapp />);
    expect(screen.getByRole('link', { name: 'Llamar a 300 123 4567' })).toHaveAttribute('href', 'tel:3001234567');
    const wa = screen.getByRole('link', { name: 'Escribir por WhatsApp a 300 123 4567' });
    expect(wa).toHaveAttribute('href', 'https://wa.me/573001234567');
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits WhatsApp unless requested or resolvable', () => {
    const { rerender } = render(<PhoneLinks number="300 123 4567" />);
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    rerender(<PhoneLinks number="604 444 5566" whatsapp />);
    expect(screen.getByRole('link', { name: 'Llamar a 604 444 5566' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('shows non-dialable text as plain text and renders nothing when empty', () => {
    const { container, rerender } = render(<PhoneLinks number="sin número" />);
    expect(screen.getByText('sin número')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    rerender(<PhoneLinks number="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
