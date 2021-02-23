// src/Modules/SSR/SSRController.tsx

import { renderToString } from 'react-dom/server';
import { Inject, Service } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

@Service()
export class SSRController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public renderApp(): string {
    const App = this.options.ssr.appComponent;

    console.log(this.options, App);

    return renderToString(<App />);
  }
}
