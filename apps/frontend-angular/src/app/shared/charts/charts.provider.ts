import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export function provideAppCharts() {
  return provideCharts(withDefaultRegisterables());
}
