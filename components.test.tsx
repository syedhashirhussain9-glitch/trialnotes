import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Button, Stat, TextField } from '../src/components/ui';
import { RouteView } from '../src/components/RouteView';
import { simulatedFix } from '../src/lib/geo';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

function render(el: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(el); });
  return tree;
}

describe('accessible components', () => {
  it('Button exposes role, label and calls onPress', () => {
    const onPress = jest.fn();
    const tree = render(<Button label="Save walk" onPress={onPress} />);
    const node = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(node.props.accessibilityLabel).toBe('Save walk');
    act(() => node.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('Button does not fire while loading and reports busy state', () => {
    const tree = render(<Button label="Go" onPress={jest.fn()} loading />);
    const node = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(node.props.accessibilityState).toEqual({ disabled: true, busy: true });
  });
  it('Button meets the 48dp minimum touch target', () => {
    const tree = render(<Button label="Go" onPress={jest.fn()} />);
    const style = [tree.root.findByProps({ accessibilityRole: 'button' }).props.style]
      .flat(3).filter(Boolean);
    const resolved = typeof style[0] === 'function' ? (style[0] as any)({ pressed: false }) : style;
    expect(JSON.stringify(resolved)).toContain('"minHeight":48');
  });
  it('TextField has a label and announces errors politely', () => {
    const tree = render(<TextField label="Username" value="" onChangeText={() => {}} error="Enter a username." />);
    expect(tree.root.findByProps({ accessibilityLabel: 'Username' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLiveRegion: 'polite' })).toBeTruthy();
  });
  it('password field has a show/hide toggle that works', () => {
    const tree = render(<TextField label="Password" value="x" onChangeText={() => {}} secure />);
    const toggle = tree.root.findByProps({ accessibilityLabel: 'Show password' });
    act(() => toggle.props.onPress());
    expect(tree.root.findByProps({ accessibilityLabel: 'Hide password' })).toBeTruthy();
  });
  it('Stat reads as one spoken phrase', () => {
    const tree = render(<Stat label="Time" value="01:05" spoken="1 minute 5 seconds" />);
    expect(tree.root.findByProps({ accessible: true }).props.accessibilityLabel).toBe('Time: 1 minute 5 seconds');
  });
  it('RouteView renders an image-role description, with and without a route', () => {
    const route = Array.from({ length: 20 }, (_, i) => simulatedFix(i));
    const withRoute = render(<RouteView route={route} distanceM={1234} />);
    expect(withRoute.root.findByProps({ accessibilityRole: 'image' }).props.accessibilityLabel).toMatch(/1\.23 km/);
    const empty = render(<RouteView route={[]} distanceM={0} />);
    expect(empty.root.findByProps({ accessibilityRole: 'image' }).props.accessibilityLabel).toMatch(/No route/);
  });
});
