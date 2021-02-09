// src/Modules/WebAppManifest/WebAppManifest.ts
import { Expose, Type } from 'class-transformer';
import {
  IsDefined,
  IsHexColor,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Token } from 'typedi';
import { WebAppIcon } from './WebAppIcon';

export class WebAppManifest {
  /**
   * The name member is a string that represents the name of the web application as
   * it is usually displayed to the user (e.g., amongst a list of other applications,
   * or as a label for an icon). name is directionality-capable,
   * which means it can be displayed left-to-right
   * or right-to-left based on the values of the dir and lang manifest members.
   */
  @IsString()
  @IsDefined()
  public name: string;

  @IsString()
  @IsDefined()
  @Expose({ name: 'short_name', toPlainOnly: true })
  public shortName: string;

  @IsString()
  @IsDefined()
  @Expose({ name: 'start_url', toPlainOnly: true })
  public startURL: string;

  @IsString()
  @IsDefined()
  public display: string;

  @ValidateNested({
    each: true,
  })
  @Type(() => WebAppIcon)
  public icons: WebAppIcon[];

  @IsString()
  @IsDefined()
  @IsHexColor()
  @Expose({ name: 'background_color', toPlainOnly: true })
  public backgroundColor: string;

  @IsString()
  @IsDefined()
  public description: string;
}

export const webAppManifestToken = new Token<WebAppManifest>('WebAppManifest');
