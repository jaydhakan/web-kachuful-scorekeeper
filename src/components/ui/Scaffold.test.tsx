import { render, screen } from '@testing-library/react';
import { MQ } from '@/theme/breakpoints';
import { Scaffold } from './Scaffold';

// jsdom has no layout, so these pin the contract that the CSS relies on: one DOM tree for every orientation.
describe('Scaffold', () => {
  it('has one heading and no panes without an aside', () => {
    const { container } = render(
      <Scaffold title="Round 4" bar={<button>Go</button>}>
        <p>Main</p>
      </Scaffold>,
    );
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[class*="pane:[grid-area"]')).toBeNull();
  });

  it('mounts the title twice with an aside, and CSS shows one at a time', () => {
    const { container } = render(
      <Scaffold title="Round 4" aside={<p>Controls</p>}>
        <p>Main</p>
      </Scaffold>,
    );
    const [large, twin] = Array.from(container.querySelectorAll('h1'));
    expect(large).toHaveTextContent('Round 4');
    expect(twin).toHaveTextContent('Round 4');
    expect(large.className).toContain('pane:hidden');
    expect(twin.className).toContain('hidden');
    expect(twin.className).toContain('pane:block');
    expect(screen.getByText('Controls').parentElement).toContainElement(twin);
  });

  it('puts the aside before the main area only when asked', () => {
    const order = (first?: boolean) => {
      const { container, unmount } = render(
        <Scaffold aside={<p>Controls</p>} asideFirst={first}>
          <p>Main</p>
        </Scaffold>,
      );
      const text = container.querySelector('[role="region"]')!.textContent;
      unmount();
      return text;
    };
    expect(order()).toBe('MainControls');
    expect(order(true)).toBe('ControlsMain');
  });

  it('treats the two-pane layouts as one breakpoint', () => {
    expect(MQ.pane).toBe(`${MQ.land}, ${MQ.wide}`);
  });
});
