// src/Modules/SSR/SSROptions.ts
import { Exclude } from 'class-transformer';
import { IsDefined, IsString } from 'class-validator';

export class SSROptions {
  /**
   * Root Directory for Web/Client
   *
   * @example
   * ```ts
   * webRoot: path.resolve('./Web')
   * ```
   */
  @IsString()
  @IsDefined()
  public webRoot: string;

  /**
   * Entrypoint Path relative to @see webRoot
   */
  @IsString()
  @IsDefined()
  public entrypoint: string;

  @Exclude()
  public appComponent: () => React.ReactElement;
}
