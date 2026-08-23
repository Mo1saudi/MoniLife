import { requireNativeView } from 'expo';
import * as React from 'react';

import { OmniFocusDndViewProps } from './OmniFocusDnd.types';

const NativeView: React.ComponentType<OmniFocusDndViewProps> =
  requireNativeView('OmniFocusDnd');

export default function OmniFocusDndView(props: OmniFocusDndViewProps) {
  return <NativeView {...props} />;
}
