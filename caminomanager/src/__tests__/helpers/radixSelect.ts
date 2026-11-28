import { fireEvent, screen } from '@testing-library/react';

/** Opens a Radix Select trigger like a mouse user and picks the first option matching `name`. */
export async function chooseOption(trigger: HTMLElement, name: string | RegExp) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click((await screen.findAllByRole('option', { name }))[0]);
}
