import { useEffect, useState } from 'react';
import App from './App';
import IphoneApp from './iphone/IphoneApp';

const IPHONE_BREAKPOINT = 768;

function readIsIphoneLayout() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= IPHONE_BREAKPOINT;
}

export default function DeviceApp() {
  const [isIphoneLayout, setIsIphoneLayout] = useState(readIsIphoneLayout);

  useEffect(() => {
    const onResize = () => setIsIphoneLayout(readIsIphoneLayout());

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isIphoneLayout ? <IphoneApp /> : <App />;
}
