// src/Modules/SSR/SSROptions.ts
import { Exclude, Expose, Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    console.log('Value: ', value);

    return value;
  })
  public appComponent: () => React.ReactElement;
}
