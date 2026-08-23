import { registerWebModule, NativeModule } from 'expo';

import { OmniFocusDndModuleEvents } from './OmniFocusDnd.types';

class OmniFocusDndModule extends NativeModule<OmniFocusDndModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(OmniFocusDndModule, 'OmniFocusDndModule');
