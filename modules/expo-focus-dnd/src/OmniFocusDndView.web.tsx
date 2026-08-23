import * as React from 'react';

import { OmniFocusDndViewProps } from './OmniFocusDnd.types';

export default function OmniFocusDndView(props: OmniFocusDndViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
