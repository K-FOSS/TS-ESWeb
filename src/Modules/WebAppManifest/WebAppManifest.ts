// src/Modules/WebAppManifest/WebAppManifest.ts
import { IsDefined, IsString } from 'class-validator';
import { Token } from 'typedi';

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
}

export const webAppManifestToken = new Token<WebAppManifest>('WebAppManifest');
