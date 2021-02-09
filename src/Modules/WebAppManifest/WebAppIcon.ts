// src/Modules/WebAppManifest/WebAppIcon.ts
import { IsDefined, IsString } from 'class-validator';

export class WebAppIcon {
  @IsString()
  @IsDefined()
  public src: string;

  @IsString()
  @IsDefined()
  public sizes: string;

  @IsString()
  @IsDefined()
  public type: string;
}
