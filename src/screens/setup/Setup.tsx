import { useApp } from '@/state/store';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';

export function Setup() {
  const { state } = useApp();
  const su = state.setup;
  if (!su) return null;
  return su.step === 1 ? <Step1 /> : su.step === 2 ? <Step2 /> : <Step3 />;
}
