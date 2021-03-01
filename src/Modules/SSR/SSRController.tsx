// src/Modules/SSR/SSRController.tsx

import { renderToString } from 'react-dom/server';
import { StaticRouter } from './StaticRouter';
import { Inject, Service } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

@Service()
export class SSRController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public renderApp(path: string): string {
    const App = this.options.ssr.appComponent;

    console.log(this.options, App);

    return renderToString(
      <StaticRouter location={path}>
        <App />
      </StaticRouter>,
    );
  }
}
